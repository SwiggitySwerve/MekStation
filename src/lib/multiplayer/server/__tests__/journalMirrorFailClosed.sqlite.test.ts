import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { EventHistoryBranchError } from '@/lib/events/journal/EventHistoryBranchContract';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import { DurableMatchStore } from '../DurableMatchStore';
import * as matchJournalAuthority from '../matchJournalAuthority';
import * as mirrorModule from '../MatchStreamJournalMirror';
import { ServerMatchHost } from '../ServerMatchHost';

jest.mock('../MatchStreamJournalMirror', () => {
  const actual = jest.requireActual('../MatchStreamJournalMirror');
  return {
    ...actual,
    mirrorMatchBatchToJournal: jest.fn(actual.mirrorMatchBatchToJournal),
  };
});

const OPENING_HEAD = 2;

type Mirror = typeof mirrorModule.mirrorMatchBatchToJournal;
const actualMirror = jest.requireActual<typeof mirrorModule>(
  '../MatchStreamJournalMirror',
).mirrorMatchBatchToJournal;
const mirrorMock =
  mirrorModule.mirrorMatchBatchToJournal as jest.MockedFunction<Mirror>;
type MirrorFault = (
  original: Mirror,
  ...args: Parameters<Mirror>
) => ReturnType<Mirror>;

function unit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    gunnery: 4,
    piloting: 5,
  } as IGameUnit;
}
const roster = [
  unit('lock-player', GameSide.Player),
  unit('lock-opponent', GameSide.Opponent),
];

function intent(intentId: string, matchId: string): IIntent {
  return {
    kind: 'Intent',
    matchId,
    ts: nowIso(),
    playerId: 'host-player',
    intentId,
    intent: { kind: 'AdvancePhase' },
  } as unknown as IIntent;
}

function meta(matchId: string) {
  const now = '2026-09-27T00:00:00.000Z';
  return {
    matchId,
    hostPlayerId: 'host-player',
    playerIds: ['host-player', 'guest-player'],
    sideAssignments: [
      { playerId: 'host-player', side: 'player' as const },
      { playerId: 'guest-player', side: 'opponent' as const },
    ],
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  };
}

async function bounded<T>(signal: Promise<T>, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;
  const limit = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out`)), 2000);
  });
  try {
    return await Promise.race([signal, limit]);
  } finally {
    clearTimeout(timeout!);
  }
}

async function createHost(
  store: DurableMatchStore,
  matchId: string,
  journalAuthority = true,
) {
  await store.createMatch(meta(matchId));
  const seed = store.seedJournalFromInitialEvents.bind(store);
  let resolveSeed!: () => void;
  let rejectSeed!: (error: unknown) => void;
  const seeded = new Promise<void>((resolve, reject) => {
    resolveSeed = resolve;
    rejectSeed = reject;
  });
  store.seedJournalFromInitialEvents = (...args) =>
    seed(...args).then(resolveSeed, (error: unknown) => {
      rejectSeed(error);
      throw error;
    });
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    randomSeed: 42,
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: roster,
    diceSeed: 42,
    journalAuthority,
  });
  await bounded(seeded, `seed ${matchId}`);
  store.seedJournalFromInitialEvents = seed;
  return host;
}

function journalHead(matchId: string): number | null {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT stream_revision AS revision
         FROM event_journal_stream_heads
        WHERE stream_type = 'match' AND stream_id = ?`,
    )
    .get(matchId) as { readonly revision: number } | undefined;
  return row?.revision ?? null;
}

function storeFailure(
  messages: Awaited<ReturnType<ServerMatchHost['handleIntent']>>,
) {
  return messages.find(
    (message) => message.kind === 'Error' && message.code === 'STORE_FAILURE',
  );
}

const faultRows: readonly {
  readonly label: string;
  readonly reason: string;
  readonly fault: MirrorFault;
  readonly commitsJournal?: boolean;
}[] = [
  {
    label: 'non-mirrored revision conflict',
    reason: 'revision-conflict',
    fault: async () => ({
      kind: 'revision-conflict',
      expectedRevision: OPENING_HEAD,
      actualRevision: OPENING_HEAD + 1,
    }),
  },
  {
    label: 'thrown mirror error',
    reason: 'mirror exploded',
    fault: async () => {
      throw new Error('mirror exploded');
    },
  },
  {
    label: 'integrity-conflict',
    reason: 'integrity-conflict',
    fault: async () => ({ kind: 'integrity-conflict' }),
  },
  {
    label: 'post-commit branch-integrity',
    reason: 'branch broke after append',
    fault: async (original, ...args) => {
      await original(...args);
      throw new EventHistoryBranchError(
        'branch-integrity',
        'branch broke after append',
      );
    },
    commitsJournal: true,
  },
];

describe('enabled journal mirror failures fail commands closed', () => {
  let dir: string;
  let matchPath: string;
  let store: DurableMatchStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'journal-fail-closed-'));
    matchPath = path.join(dir, 'matches.db');
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'mekstation.db') }).initialize();
    matchJournalAuthority._resetProcessShadowStatsForTests();
    matchJournalAuthority._setCombatJournalAuthorityModeForTests('enabled');
    store = new DurableMatchStore({
      path: matchPath,
      capabilityDb: () => getSQLiteService().getDatabase(),
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    mirrorMock.mockReset();
    mirrorMock.mockImplementation(actualMirror);
    matchJournalAuthority._setCombatJournalAuthorityModeForTests(null);
    matchJournalAuthority._resetProcessShadowStatsForTests();
    store.close();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it.each(faultRows)(
    '$label returns STORE_FAILURE, an identical retry heals, and the next match is admitted',
    async ({ fault, reason, commitsJournal }) => {
      const matchId = `match-${reason.replaceAll(' ', '-')}`;
      const host = await createHost(store, matchId);
      mirrorMock.mockImplementationOnce((...args) =>
        fault(actualMirror, ...args),
      );

      const failed = await host.handleIntent(intent('lock-1', matchId));

      expect(storeFailure(failed)).toEqual(
        expect.objectContaining({ reason: expect.stringContaining(reason) }),
      );
      expect(await store.getCommandReceipt(matchId, 'lock-1')).not.toBeNull();
      const storedAfterFailure = (await store.getEvents(matchId)).length;
      expect(journalHead(matchId)).toBe(
        commitsJournal ? storedAfterFailure : OPENING_HEAD,
      );

      mirrorMock.mockImplementation(actualMirror);
      const retry = await host.handleIntent(intent('lock-1', matchId));

      expect(storeFailure(retry)).toBeUndefined();
      expect(await store.getEvents(matchId)).toHaveLength(storedAfterFailure);
      expect(journalHead(matchId)).toBe(storedAfterFailure);

      const next = await createHost(store, `${matchId}-next`);
      expect(next.isJournalAuthorityEnabled()).toBe(true);
    },
  );

  it('an unavailable capability DB records its tripwire, fails closed, and heals on retry', async () => {
    const matchId = 'match-capability-unavailable';
    const host = await createHost(store, matchId);
    const readiness = store.isCapabilityDbAvailable;
    store.isCapabilityDbAvailable = () => false;

    const failed = await host.handleIntent(intent('lock-1', matchId));

    expect(storeFailure(failed)).toEqual(
      expect.objectContaining({
        reason: 'journal-mirror:capability-db-unavailable',
      }),
    );
    expect(matchJournalAuthority.getProcessShadowMismatchCount()).toBe(1);
    const storedAfterFailure = (await store.getEvents(matchId)).length;

    store.isCapabilityDbAvailable = readiness;
    const retry = await host.handleIntent(intent('lock-1', matchId));

    expect(storeFailure(retry)).toBeUndefined();
    expect(journalHead(matchId)).toBe(storedAfterFailure);
  });

  it('a digest-only divergent retry fails before the journal and an identical retry heals', async () => {
    const matchId = 'match-divergent-retry';
    const host = await createHost(store, matchId);
    mirrorMock.mockRejectedValueOnce(new Error('first mirror failed'));
    await host.handleIntent(intent('lock-1', matchId));
    const getReceipt = store.getCommandReceipt.bind(store);
    store.getCommandReceipt = async (...args) => {
      const stored = await getReceipt(...args);
      return stored == null
        ? null
        : { ...stored, expectedPostStateDigest: 'divergent-digest' };
    };
    mirrorMock.mockClear();

    const divergent = await host.handleIntent(intent('lock-1', matchId));

    expect(storeFailure(divergent)).toEqual(
      expect.objectContaining({ reason: 'integrity-conflict' }),
    );
    expect(mirrorMock).not.toHaveBeenCalled();
    expect(journalHead(matchId)).toBe(OPENING_HEAD);

    store.getCommandReceipt = getReceipt;
    const identical = await host.handleIntent(intent('lock-1', matchId));

    expect(storeFailure(identical)).toBeUndefined();
    expect(journalHead(matchId)).toBe((await store.getEvents(matchId)).length);
  });

  it('a payload-tampered same-id retry fails before the journal', async () => {
    const matchId = 'match-payload-tamper-retry';
    const host = await createHost(store, matchId);
    mirrorMock.mockRejectedValueOnce(new Error('first mirror failed'));
    await host.handleIntent(intent('lock-1', matchId));
    const event = (await store.getEvents(matchId))[OPENING_HEAD];
    const db = new Database(matchPath);
    db.prepare(
      `UPDATE mp_match_events SET event_json = ?
       WHERE match_id = ? AND sequence = ?`,
    ).run(
      JSON.stringify({ ...event, payload: { divergent: true } }),
      matchId,
      event.sequence,
    );
    db.close();
    mirrorMock.mockClear();

    const retry = await host.handleIntent(intent('lock-1', matchId));

    expect(storeFailure(retry)).toEqual(
      expect.objectContaining({ reason: 'integrity-conflict' }),
    );
    expect(mirrorMock).not.toHaveBeenCalled();
    expect(journalHead(matchId)).toBe(OPENING_HEAD);
  });

  it('an enabled-mode legacy match records a mirror failure but still commits and emits', async () => {
    const matchId = 'match-enabled-legacy-control';
    const host = await createHost(store, matchId, false);
    matchJournalAuthority._resetProcessShadowStatsForTests();
    mirrorMock.mockRejectedValueOnce(new Error('legacy mirror failed'));

    const result = await host.handleIntent(intent('lock-1', matchId));

    expect(host.isJournalAuthorityEnabled()).toBe(false);
    expect(result.some((message) => message.kind === 'Event')).toBe(true);
    expect(storeFailure(result)).toBeUndefined();
    expect(await store.getCommandReceipt(matchId, 'lock-1')).not.toBeNull();
    expect(matchJournalAuthority.getProcessShadowMismatchCount()).toBe(1);
  });

  it('an identical seed replay stays idempotent and diagnostic-clean', async () => {
    const matchId = 'match-seed-replay';
    await createHost(store, matchId);
    const opening = (await store.getEvents(matchId)).slice(0, OPENING_HEAD);
    matchJournalAuthority._resetProcessShadowStatsForTests();

    await store.seedJournalFromInitialEvents(matchId, opening);

    expect(journalHead(matchId)).toBe(OPENING_HEAD);
    expect(matchJournalAuthority.getProcessShadowMismatchCount()).toBe(0);
  });

  it('mode off keeps the committed command behavior and does not mirror', async () => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests('off');
    const matchId = 'match-mode-off-control';
    const host = await createHost(store, matchId);

    const result = await host.handleIntent(intent('lock-1', matchId));

    expect(storeFailure(result)).toBeUndefined();
    expect(await store.getCommandReceipt(matchId, 'lock-1')).not.toBeNull();
    expect(journalHead(matchId)).toBeNull();
  });
});
