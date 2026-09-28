import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchMeta } from '../IMatchStore';

import { DurableMatchStore } from '../DurableMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
} from '../matchJournalAuthority';
import { recoverActiveMatches } from '../MatchRecovery';
import { foldMatchSession } from '../MatchSessionProjector';
import {
  selectRecoveredMatchRollbackReader,
  ServerMatchHost,
} from '../ServerMatchHost';
import { digestCommandPostState } from '../ServerMatchHostDecision';

const MATCH_ID = 'match-journal-batch-recovery';
const AT = '2026-09-28T00:00:00.000Z';

function meta(): IMatchMeta {
  return {
    matchId: MATCH_ID,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 4, turnLimit: 5 },
  };
}

function unit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
  } as IGameUnit;
}

async function openingEvents(): Promise<readonly IGameEvent[]> {
  const scratch = new InMemoryMatchStore({ quiet: true });
  await scratch.createMatch(meta());
  const append = scratch.appendEvent.bind(scratch);
  let persisted = 0;
  let resolveOpening!: () => void;
  const openingPersisted = new Promise<void>((resolve) => {
    resolveOpening = resolve;
  });
  scratch.appendEvent = async (...args) => {
    await append(...args);
    persisted += 1;
    if (persisted === 2) resolveOpening();
  };
  ServerMatchHost.create(MATCH_ID, scratch, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    randomSeed: 42,
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [
      unit('recovery-player', GameSide.Player),
      unit('recovery-opponent', GameSide.Opponent),
    ],
    diceSeed: 42,
  });
  let timeout: ReturnType<typeof setTimeout>;
  await Promise.race([
    openingPersisted,
    new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error('opening persistence timed out')),
        2_000,
      );
    }),
  ]).finally(() => clearTimeout(timeout!));
  scratch.appendEvent = append;
  return scratch.getEvents(MATCH_ID);
}

function tailEvent(sequence: number): IGameEvent {
  return {
    id: `tail-${sequence}`,
    sequence,
    type: GameEventType.PhaseChanged,
    timestamp: AT,
    phase: GamePhase.Movement,
    payload: { sequence },
  } as unknown as IGameEvent;
}

let dir = '';
let matchPath = '';
let campaignPath = '';
let store: DurableMatchStore;

function campaignDb(): Database.Database {
  return getSQLiteService().getDatabase();
}

function openCampaign(): void {
  getSQLiteService({ path: campaignPath }).initialize();
}

function openStore(): DurableMatchStore {
  return new DurableMatchStore({
    path: matchPath,
    capabilityDb: campaignDb,
  });
}

function coldReopen(): void {
  store.close();
  resetSQLiteService();
  openCampaign();
  store = openStore();
}

function journalState(): {
  readonly head: number | null;
  readonly rows: number;
} {
  const head = campaignDb()
    .prepare(
      `SELECT stream_revision AS revision
         FROM event_journal_stream_heads
        WHERE stream_type = 'match' AND stream_id = ?`,
    )
    .get(MATCH_ID) as { readonly revision: number } | undefined;
  const rows = campaignDb()
    .prepare(
      `SELECT COUNT(*) AS count
         FROM event_journal_events
        WHERE stream_type = 'match' AND stream_id = ?`,
    )
    .get(MATCH_ID) as { readonly count: number };
  return { head: head?.revision ?? null, rows: rows.count };
}

function journalSnapshot(): {
  readonly head:
    | {
        readonly branchId: string;
        readonly revision: number;
        readonly digest: string;
      }
    | undefined;
  readonly rows: readonly {
    readonly revision: number;
    readonly eventId: string;
    readonly commandId: string;
    readonly digest: string;
    readonly payloadJson: string;
  }[];
} {
  const head = campaignDb()
    .prepare(
      `SELECT branch_id AS branchId, stream_revision AS revision,
              event_digest AS digest
         FROM event_journal_stream_heads
        WHERE stream_type = 'match' AND stream_id = ?`,
    )
    .get(MATCH_ID) as
    | {
        readonly branchId: string;
        readonly revision: number;
        readonly digest: string;
      }
    | undefined;
  const rows = campaignDb()
    .prepare(
      `SELECT stream_revision AS revision, event_id AS eventId,
              command_id AS commandId, event_digest AS digest,
              payload_json AS payloadJson
         FROM event_journal_events
        WHERE stream_type = 'match' AND stream_id = ?
        ORDER BY stream_revision`,
    )
    .all(MATCH_ID) as readonly {
    readonly revision: number;
    readonly eventId: string;
    readonly commandId: string;
    readonly digest: string;
    readonly payloadJson: string;
  }[];
  return { head, rows };
}

async function createAndSeed(
  capabilityAvailable = true,
): Promise<readonly IGameEvent[]> {
  const events = await openingEvents();
  await store.createMatch(meta());
  for (const event of events) await store.appendEvent(MATCH_ID, event);
  if (!capabilityAvailable) {
    const available = store.isCapabilityDbAvailable;
    store.isCapabilityDbAvailable = () => false;
    await store.seedJournalFromInitialEvents!(MATCH_ID, events);
    store.isCapabilityDbAvailable = available;
  } else {
    await store.seedJournalFromInitialEvents!(MATCH_ID, events);
  }
  return events;
}

async function appendStoredTail(
  opening: readonly IGameEvent[],
): Promise<readonly IGameEvent[]> {
  const event = tailEvent(opening.length);
  const all = [...opening, event];
  _setCombatJournalAuthorityModeForTests('off');
  const result = await store.appendCommandBatch!(MATCH_ID, {
    commandId: 'cmd-tail',
    actorId: 'p1',
    expectedRevision: opening.length,
    events: [event],
    expectedPostStateDigest: digestCommandPostState(
      foldMatchSession(MATCH_ID, all),
    ),
  });
  expect(result.kind).toBe('committed');
  _setCombatJournalAuthorityModeForTests('enabled');
  return all;
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'match-journal-recovery-'));
  matchPath = path.join(dir, 'matches.db');
  campaignPath = path.join(dir, 'mekstation.db');
  resetSQLiteService();
  openCampaign();
  _resetProcessShadowStatsForTests();
  _setCombatJournalAuthorityModeForTests('enabled');
  store = openStore();
});

afterEach(async () => {
  _setCombatJournalAuthorityModeForTests(null);
  _resetProcessShadowStatsForTests();
  store.close();
  resetSQLiteService();
  await rm(dir, { recursive: true, force: true, maxRetries: 3 });
});

describe('boot recovery restores every trusted stored journal batch', () => {
  it('recovers a seeded match with no command to a commit-ready head', async () => {
    const events = await createAndSeed();
    const expectedDigest = digestCommandPostState(
      foldMatchSession(MATCH_ID, events),
    );
    expect(
      await store.getCommandReceipt(MATCH_ID, `create:${MATCH_ID}`),
    ).toEqual(
      expect.objectContaining({
        firstRevision: 0,
        lastRevision: events.length - 1,
        eventCount: events.length,
        expectedPostStateDigest: expectedDigest,
      }),
    );

    coldReopen();
    const recovered = await recoverActiveMatches(store);
    const host = recovered.hosts.get(MATCH_ID);

    expect(recovered.blocked).toEqual([]);
    expect(host).toBeDefined();
    expect(
      await selectRecoveredMatchRollbackReader(
        MATCH_ID,
        store,
        InteractiveSession.fromHydratedSession(host!.getSessionForTests(), {
          random: new SeededRandom(42),
        }),
      ),
    ).toEqual(expect.objectContaining({ kind: 'journal-compatible' }));
  });

  it('replays a strict journal prefix from durable receipts on cold restart', async () => {
    const opening = await createAndSeed();
    const all = await appendStoredTail(opening);
    expect(journalState().head).toBe(opening.length);

    coldReopen();
    const recovered = await recoverActiveMatches(store);

    expect(recovered.blocked).toEqual([]);
    expect(recovered.hosts.has(MATCH_ID)).toBe(true);
    expect(journalState()).toEqual({ head: all.length, rows: all.length });
  });

  it('heals a seed receipt left behind before any journal head', async () => {
    const events = await createAndSeed(false);
    expect(journalState()).toEqual({ head: null, rows: 0 });

    coldReopen();
    const recovered = await recoverActiveMatches(store);

    expect(recovered.blocked).toEqual([]);
    expect(recovered.hosts.has(MATCH_ID)).toBe(true);
    expect(journalState()).toEqual({
      head: events.length,
      rows: events.length,
    });
  });

  it.each([
    [
      'missing',
      (db: Database.Database) => {
        db.prepare(`DELETE FROM mp_command_receipts WHERE match_id = ?`).run(
          MATCH_ID,
        );
      },
    ],
    [
      'corrupt',
      (db: Database.Database) => {
        db.prepare(
          `UPDATE mp_command_receipts SET actor_id = '' WHERE match_id = ?`,
        ).run(MATCH_ID);
      },
    ],
  ] as const)(
    'refuses a %s receipt identity without mutating the journal',
    async (_label, corrupt) => {
      await createAndSeed(false);
      const before = journalState();
      const db = new Database(matchPath);
      try {
        corrupt(db);
      } finally {
        db.close();
      }
      coldReopen();

      const recovered = await recoverActiveMatches(store);

      expect(recovered.hosts.has(MATCH_ID)).toBe(false);
      expect(recovered.blocked).toEqual([
        expect.objectContaining({
          matchId: MATCH_ID,
          reason: 'partial-history',
        }),
      ]);
      expect(journalState()).toEqual(before);
    },
  );

  it('refuses a corrupted event-bearing fingerprint suffix without journal mutation', async () => {
    await createAndSeed(false);
    const before = journalSnapshot();
    expect(before).toEqual({ head: undefined, rows: [] });
    const db = new Database(matchPath);
    try {
      const row = db
        .prepare(
          `SELECT fingerprint FROM mp_command_receipts WHERE match_id = ?`,
        )
        .get(MATCH_ID) as { readonly fingerprint: string };
      const prefix = row.fingerprint.split('|').slice(0, 4).join('|');
      db.prepare(
        `UPDATE mp_command_receipts SET fingerprint = ? WHERE match_id = ?`,
      ).run(`${prefix}|corrupted-event`, MATCH_ID);
    } finally {
      db.close();
    }

    coldReopen();
    const recovered = await recoverActiveMatches(store);

    expect(recovered.hosts.has(MATCH_ID)).toBe(false);
    expect(recovered.blocked).toEqual([
      expect.objectContaining({
        matchId: MATCH_ID,
        reason: 'partial-history',
      }),
    ]);
    expect(journalSnapshot()).toEqual(before);
  });

  it('recovers a complete pre-U43 journal without an opening receipt', async () => {
    await createAndSeed();
    const db = new Database(matchPath);
    try {
      db.prepare(`DELETE FROM mp_command_receipts WHERE match_id = ?`).run(
        MATCH_ID,
      );
    } finally {
      db.close();
    }
    expect(
      await store.getCommandReceipt(MATCH_ID, `create:${MATCH_ID}`),
    ).toBeNull();
    const before = journalSnapshot();

    coldReopen();
    const recovered = await recoverActiveMatches(store);

    expect(recovered.blocked).toEqual([]);
    expect(recovered.hosts.has(MATCH_ID)).toBe(true);
    expect(journalSnapshot()).toEqual(before);
  });

  it('leaves an already complete journal byte-for-byte unchanged', async () => {
    await createAndSeed();
    const before = journalSnapshot();

    coldReopen();
    const recovered = await recoverActiveMatches(store);

    expect(recovered.blocked).toEqual([]);
    expect(recovered.hosts.has(MATCH_ID)).toBe(true);
    expect(journalSnapshot()).toEqual(before);
  });
});
