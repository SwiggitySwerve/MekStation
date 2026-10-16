/**
 * U95: the durable progression readers find the process match store's
 * database whichever module graph constructed that store.
 *
 * The match store lives in a globalThis slot (getDefaultMatchStore), and
 * in the running server the socket runtime's tsx graph constructs it at
 * boot, before Next's API graph asks for it. Once the campaign host
 * registry is shared too, an entry built by the API graph reads that
 * store through these readers. jest.isolateModules stands in for the
 * other graph's DurableMatchStore class.
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  appendCampaignCommandBatch,
  type ICampaignJournalEnvelope,
} from '@/lib/campaign/sync/JournalCampaignEventStore';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import type { IMatchMeta } from '../IMatchStore';

import {
  createDurableCampaignProgressionReaders,
  readStrictCampaignLaunchPrecedence,
} from '../campaignProgressionReaders.durable';
import { DurableMatchStore } from '../DurableMatchStore';
import {
  _resetDefaultMatchStore,
  _setDefaultMatchStoreForTests,
} from '../getDefaultMatchStore';
import {
  COORDINATED_CORRECTION_SAGA_TABLE,
  migrateCoordinatedCorrectionSaga,
} from '../history/CoordinatedOutcomeCorrectionSaga';

const CAMPAIGN_ID = 'campaign-cross-graph';
const MATCH_ID = 'match-cross-graph';
const OUTCOME_ID = 'outcome-cross-graph';
const AT = '2026-09-26T00:00:00.000Z';

type DurableMatchStoreClass = typeof DurableMatchStore;

/** Loads DurableMatchStore in a fresh module graph and returns its class. */
function durableMatchStoreFromAnotherGraph(): DurableMatchStoreClass {
  let loaded: DurableMatchStoreClass | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = (
      require('../DurableMatchStore') as typeof import('../DurableMatchStore')
    ).DurableMatchStore;
  });
  if (!loaded)
    throw new Error('isolated DurableMatchStore load returned nothing');
  return loaded;
}

function matchMeta(): IMatchMeta {
  return {
    matchId: MATCH_ID,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host'],
    sideAssignments: [{ playerId: 'pid_host', side: 'player' }],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
    layout: '1v1',
  };
}

/** One inbox receipt on the campaign journal. */
function seedInboxOutcome(
  journal: Database.Database = getSQLiteService().getDatabase(),
): void {
  journal
    .prepare(
      `INSERT INTO campaign_combat_outcome_inbox
         (outcome_id, outcome_version, campaign_id, command_id, command_digest,
          first_stream_revision, last_stream_revision, first_commit_position,
          last_commit_position, received_at)
       VALUES (?, 1, ?, 'command-cross-graph', ?, 1, 1, 1, 1, ?)`,
    )
    .run(OUTCOME_ID, CAMPAIGN_ID, 'c'.repeat(64), AT);
}

/** One inbox receipt on the journal and one open correction saga on the match store. */
async function seedPendingCorrection(store: DurableMatchStore): Promise<void> {
  seedInboxOutcome();
  await seedCorrectionSaga(store);
}

/** One open correction saga on the match store. */
async function seedCorrectionSaga(store: DurableMatchStore): Promise<void> {
  await store.createMatch(matchMeta());
  const matchDb = store.getDatabase();
  migrateCoordinatedCorrectionSaga(matchDb);
  matchDb
    .prepare(
      `INSERT INTO ${COORDINATED_CORRECTION_SAGA_TABLE}
         (match_id, outcome_id, outcome_version, target_revision, state,
          source_recorded_at, updated_at)
       VALUES (?, ?, 1, 1, 'source-recorded', ?, ?)`,
    )
    .run(MATCH_ID, OUTCOME_ID, AT, AT);
}

describe('durable progression readers across module graphs', () => {
  let dir: string;
  let store: DurableMatchStore | null = null;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-readers-cross-graph-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'campaign.db') }).initialize();
  });

  afterEach(async () => {
    store?.close();
    store = null;
    _resetDefaultMatchStore();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('reads the pending saga from a match store this graph constructed', async () => {
    store = new DurableMatchStore({ path: path.join(dir, 'matches.db') });
    _setDefaultMatchStoreForTests(store);
    await seedPendingCorrection(store);

    const saga =
      createDurableCampaignProgressionReaders().readSagaForCampaign(
        CAMPAIGN_ID,
      );

    expect(saga?.outcomeId).toBe(OUTCOME_ID);
    expect(saga?.state).toBe('source-recorded');
  });

  it('reads the pending saga from a match store another graph constructed', async () => {
    const OtherGraphDurableMatchStore = durableMatchStoreFromAnotherGraph();
    expect(OtherGraphDurableMatchStore).not.toBe(DurableMatchStore);
    store = new OtherGraphDurableMatchStore({
      path: path.join(dir, 'matches.db'),
    });
    _setDefaultMatchStoreForTests(store);
    await seedPendingCorrection(store);

    const saga =
      createDurableCampaignProgressionReaders().readSagaForCampaign(
        CAMPAIGN_ID,
      );

    expect(saga?.outcomeId).toBe(OUTCOME_ID);
    expect(saga?.state).toBe('source-recorded');
  });

  it('strict launch precedence tells known absence from a hidden read failure', async () => {
    const journal = getSQLiteService().getDatabase();
    const strict = () =>
      readStrictCampaignLaunchPrecedence(journal, CAMPAIGN_ID);
    const legacy = () =>
      createDurableCampaignProgressionReaders().readSagaForCampaign(
        CAMPAIGN_ID,
      );

    // No inbox outcome: known absence.
    expect(strict()).toEqual({ kind: 'clear' });
    seedInboxOutcome();
    // An outcome whose match store holds no durable saga evidence.
    expect(strict()).toEqual({ kind: 'unavailable' });
    expect(legacy()).toBeNull();

    store = new DurableMatchStore({ path: path.join(dir, 'matches.db') });
    _setDefaultMatchStoreForTests(store);
    // The lazily created saga table does not exist yet: known absence.
    expect(strict()).toEqual({ kind: 'clear' });
    expect(
      store
        .getDatabase()
        .prepare(`SELECT 1 FROM sqlite_master WHERE name = ?`)
        .get(COORDINATED_CORRECTION_SAGA_TABLE),
    ).toBeUndefined();
    await seedCorrectionSaga(store);
    expect(strict()).toEqual({ kind: 'blocked', reason: 'correction-pending' });

    store.close();
    store = null;
    expect(strict()).toEqual({ kind: 'unavailable' });
    expect(legacy()).toBeNull();

    journal.exec('DROP TABLE campaign_combat_outcome_inbox');
    expect(strict()).toEqual({ kind: 'unavailable' });
    expect(legacy()).toBeNull();
  });
});

interface ICampaignGraph {
  readonly sqlite: typeof import('@/services/persistence/SQLiteService');
  readonly members: typeof import('@/services/campaignPersistence/CampaignSessionParticipantStore');
  readonly applied: typeof import('@/lib/campaign/sync/campaignPublicAppliedView');
  readonly readers: typeof import('../campaignProgressionReaders.durable');
  readonly db: Database.Database;
}

/** A complete campaign module graph with its own SQLiteService on dbPath. */
function campaignGraph(dbPath: string): ICampaignGraph {
  let loaded: Omit<ICampaignGraph, 'db'> | undefined;
  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    loaded = {
      sqlite: require('@/services/persistence/SQLiteService'),
      members: require('@/services/campaignPersistence/CampaignSessionParticipantStore'),
      applied: require('@/lib/campaign/sync/campaignPublicAppliedView'),
      readers: require('../campaignProgressionReaders.durable'),
    };
    /* eslint-enable @typescript-eslint/no-require-imports */
  });
  if (!loaded) throw new Error('isolated campaign graph load returned nothing');
  loaded.sqlite.getSQLiteService({ path: dbPath }).initialize();
  return { ...loaded, db: loaded.sqlite.getSQLiteService().getDatabase() };
}

describe('P2CB launch view across two real campaign graphs', () => {
  const SESSION_ID = 'session-cross-graph';
  const KEY = { campaignId: CAMPAIGN_ID, sessionId: SESSION_ID };
  const STREAM = { streamType: 'campaign', streamId: CAMPAIGN_ID } as const;
  const READY = { kind: 'ready' };
  const FRESH = { kind: 'not-converged', reason: 'fresh-request' };
  const MISMATCH = { kind: 'refused', reason: 'context-mismatch' };
  const BEHIND_P1 = {
    kind: 'not-converged',
    reason: 'participants-behind',
    participantIds: ['p1'],
  };
  let dir: string;
  let dbPath: string;
  let a: ICampaignGraph;
  let b: ICampaignGraph;
  let match: DurableMatchStore | null = null;

  const tx = <T>(graph: ICampaignGraph, fn: () => T): T =>
    graph.db.transaction(fn)();

  function ack(graph: ICampaignGraph, participantId: string, cut: number) {
    const key = { ...KEY, participantId };
    const membership = graph.members.activeCampaignSessionMembership(
      CAMPAIGN_ID,
      SESSION_ID,
      participantId,
    )!;
    const viewer = { participantId, isGm: membership.seat === 'gm' };
    const previous = graph.applied.readCampaignPublicAppliedView(graph.db, key);
    const offer = {
      ...key,
      receiptId: `${participantId}-${cut}`,
      branchId: 'root',
      effectiveGeneration: 1,
      acknowledgedJournalCut: cut,
      viewerAuthorityFingerprint:
        graph.applied.campaignViewerAuthorityFingerprint(membership, viewer),
      kind: previous === null ? 'baseline' : 'delta',
      predecessorReceiptId: previous?.receiptId ?? null,
    } as const;
    return new graph.applied.CampaignPublicAppliedViewStore(graph.db, {
      resolveDeliveredOffer: () => offer,
      readCurrentContext: (handle) => ({
        branchId: 'root',
        effectiveGeneration: 1,
        headRevision: readEffectiveStreamHead(
          handle,
          new SQLiteEventHistoryBranchStore(handle),
          STREAM,
        ).revision,
        viewer,
        membership: graph.members.activeCampaignSessionMembership(
          CAMPAIGN_ID,
          SESSION_ID,
          participantId,
        ),
        participantRemoved: false,
      }),
    }).accept({ ...key, receiptId: offer.receiptId });
  }

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-launch-two-graphs-'));
    dbPath = path.join(dir, 'campaign.db');
    a = campaignGraph(dbPath);
    b = campaignGraph(dbPath);
    const committed = await appendCampaignCommandBatch(
      new SQLiteEventJournal<ICampaignJournalEnvelope>(a.db, () => AT),
      {
        campaignId: CAMPAIGN_ID,
        commandId: 'fact-1',
        events: [
          {
            type: 'FundsChanged',
            sequence: 1,
            campaignId: CAMPAIGN_ID,
            ts: AT,
            authorPlayerId: 'gm',
            scope: 'campaign',
            payload: { delta: 100, reason: 'fact-1', balance: 100 },
          },
        ],
        expectedPostStateDigest: null,
        expectedRevision: 0,
      },
    );
    expect(committed.kind).toBe('committed');
    for (const [participantId, seat] of [
      ['gm', 'gm'],
      ['p1', 'player'],
    ] as const) {
      a.members.bindCampaignSessionParticipant({
        ...KEY,
        participantId,
        seat,
        boundAt: AT,
      });
    }
  });

  afterEach(async () => {
    match?.close();
    match = null;
    _resetDefaultMatchStore();
    a.sqlite.resetSQLiteService();
    b.sqlite.resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('each graph sees only its own uncommitted transaction and never borrows the other handle', async () => {
    expect(a.db).not.toBe(b.db);
    expect(a.readers.createDurableCampaignLaunchView).not.toBe(
      b.readers.createDurableCampaignLaunchView,
    );
    ack(a, 'gm', 1);
    ack(a, 'p1', 0);
    const viewA = a.readers.createDurableCampaignLaunchView()!;
    const viewB = b.readers.createDurableCampaignLaunchView()!;
    const preparedA = await viewA.prepare(KEY);
    const preparedB = await viewB.prepare(KEY);
    expect(preparedA.verdict).toEqual(BEHIND_P1);
    expect(preparedB.verdict).toEqual(BEHIND_P1);
    const p1 = { ...KEY, participantId: 'p1', revokedAt: AT };

    expect(() =>
      tx(a, () => {
        expect(a.members.revokeCampaignSessionParticipant(p1)).toBe(true);
        expect(viewA.revalidate(a.db, preparedA)).toEqual(FRESH);
        expect(
          tx(b, () =>
            b.members.activeCampaignSessionMembership(
              CAMPAIGN_ID,
              SESSION_ID,
              'p1',
            ),
          ),
        ).not.toBeNull();
        expect(tx(b, () => viewB.revalidate(b.db, preparedB))).toEqual(
          BEHIND_P1,
        );
        throw new Error('rollback a');
      }),
    ).toThrow('rollback a');
    expect(() =>
      tx(b, () => {
        expect(ack(b, 'p1', 1)).toEqual({ kind: 'accepted' });
        expect(viewB.revalidate(b.db, preparedB)).toEqual(FRESH);
        expect(tx(a, () => viewA.revalidate(a.db, preparedA))).toEqual(
          BEHIND_P1,
        );
        throw new Error('rollback b');
      }),
    ).toThrow('rollback b');
    expect(tx(a, () => viewA.revalidate(a.db, preparedA))).toEqual(BEHIND_P1);
    expect(tx(b, () => viewB.revalidate(b.db, preparedB))).toEqual(BEHIND_P1);

    // A retained A-graph view keeps A's handle; B's handle or preparation is refused.
    expect(tx(b, () => viewA.revalidate(b.db, preparedA))).toEqual(MISMATCH);
    expect(tx(a, () => viewA.revalidate(a.db, preparedB))).toEqual(MISMATCH);

    // A committed change in B invalidates A's stale capture.
    expect(ack(b, 'p1', 1)).toEqual({ kind: 'accepted' });
    expect(tx(a, () => viewA.revalidate(a.db, preparedA))).toEqual(FRESH);
    expect((await viewA.prepare(KEY)).verdict).toEqual(READY);
  });

  it('a saga recorded after preparation refuses when rechecked, and both stores survive a cold reopen', async () => {
    ack(a, 'gm', 1);
    ack(a, 'p1', 1);
    seedInboxOutcome(a.db);
    match = new DurableMatchStore({ path: path.join(dir, 'matches.db') });
    _setDefaultMatchStoreForTests(match);
    const viewA = a.readers.createDurableCampaignLaunchView()!;
    const prepared = await viewA.prepare(KEY);
    expect(prepared.verdict).toEqual(READY);

    await seedCorrectionSaga(match);
    expect(tx(a, () => viewA.revalidate(a.db, prepared))).toEqual({
      kind: 'refused',
      reason: 'correction-pending',
    });
    match.close();
    match = null;
    expect(tx(a, () => viewA.revalidate(a.db, prepared))).toEqual({
      kind: 'refused',
      reason: 'evidence-unavailable',
    });

    a.sqlite.resetSQLiteService();
    b.sqlite.resetSQLiteService();
    const reopened = campaignGraph(dbPath);
    expect(
      reopened.applied.readCampaignPublicAppliedView(reopened.db, {
        ...KEY,
        participantId: 'p1',
      })?.acknowledgedJournalCut,
    ).toBe(1);
    expect(tx(reopened, () => viewA.revalidate(reopened.db, prepared))).toEqual(
      MISMATCH,
    );
    match = new DurableMatchStore({ path: path.join(dir, 'matches.db') });
    _setDefaultMatchStoreForTests(match);
    expect(
      (await reopened.readers.createDurableCampaignLaunchView()!.prepare(KEY))
        .verdict,
    ).toEqual({ kind: 'refused', reason: 'correction-pending' });
    reopened.sqlite.resetSQLiteService();
  });
});
