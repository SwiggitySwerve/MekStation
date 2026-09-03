/**
 * Seam 17.2-a: source-side coordinated correction saga.
 * Match store is DurableMatchStore(':memory:'). Journal is a temp
 * SQLiteService, same harness as GmCombatRewindCommit.
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IAffectedArtifact } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { createCorrectionCandidateBranch } from '@/lib/events/journal/EventHistoryCandidateBuild';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
import { readSupersededMatchEvents } from '@/lib/multiplayer/server/DurableMatchStore.supersede';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  CombatEndReason,
  type ICombatOutcome,
} from '@/types/combat/CombatOutcome';
import {
  GameEventType,
  GamePhase,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  blockCoordinatedCorrection,
  firstSupersededMatchSequence,
  readCoordinatedCorrectionSaga,
  readRecordedOutcomeJson,
  recordCoordinatedCorrectionSource,
  sealCoordinatedCorrectionManifest,
  sagaKeyOf,
  type IAcceptedCoordinatedOutcomeCorrection,
} from '../CoordinatedOutcomeCorrectionSaga';

const MATCH_ID = 'stream-1';
const STREAM = { streamType: 'match', streamId: MATCH_ID } as const;
const AT = '2026-09-02T00:00:00.000Z';
const TARGET = 2;
const OUTCOME = 'outcome-1';
const JSON_A = '{"replacement":"a"}';
const JSON_B = '{"replacement":"b"}';
const ARTIFACTS: readonly IAffectedArtifact[] = [
  { artifactKind: 'checkpoint', artifactId: 'ckpt-1', sourceRevision: 3 },
];

const ACCEPTED: IAcceptedCoordinatedOutcomeCorrection = {
  kind: 'accepted-pending-saga',
  matchId: MATCH_ID,
  outcomeId: OUTCOME,
  outcomeVersion: 2,
  deliveredVersion: 1,
  targetRevision: TARGET,
};

function matchDatabase(store: DurableMatchStore): Database.Database {
  const db = Reflect.get(store, 'db');
  if (typeof db !== 'object' || db === null || !('prepare' in db)) {
    throw new Error('DurableMatchStore db handle missing');
  }
  return db as Database.Database;
}

function matchEvent(
  sequence: number,
  id = `match-event-${sequence}`,
): IGameEvent {
  return {
    id,
    gameId: MATCH_ID,
    sequence,
    timestamp: AT,
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Movement,
    payload: {
      fromPhase: GamePhase.Initiative,
      toPhase: GamePhase.Movement,
    },
  };
}

async function seedMatchTail(store: DurableMatchStore): Promise<void> {
  await store.createMatch({
    matchId: MATCH_ID,
    hostPlayerId: 'gm-1',
    playerIds: ['gm-1', 'player-2'],
    sideAssignments: [
      { playerId: 'gm-1', side: 'player' },
      { playerId: 'player-2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 4, turnLimit: 5 },
  });
  const prefix = await store.appendCommandBatch(MATCH_ID, {
    commandId: 'cmd-prefix',
    actorId: 'gm-1',
    expectedRevision: 0,
    events: [matchEvent(0), matchEvent(1)],
  });
  const tail = await store.appendCommandBatch(MATCH_ID, {
    commandId: 'cmd-tail',
    actorId: 'gm-1',
    expectedRevision: 2,
    events: [matchEvent(2), matchEvent(3)],
  });
  expect(prefix.kind).toBe('committed');
  expect(tail.kind).toBe('committed');
}

function liveSequences(store: DurableMatchStore): Promise<readonly number[]> {
  return store
    .getEvents(MATCH_ID)
    .then((events) => events.map((e) => e.sequence));
}

function record(store: DurableMatchStore, outcomeJson = JSON_A) {
  return recordCoordinatedCorrectionSource(matchDatabase(store), ACCEPTED, {
    at: AT,
    outcomeJson,
  });
}

function deliveredOutcome(): ICombatOutcome {
  return {
    version: 1,
    matchId: MATCH_ID,
    contractId: null,
    scenarioId: null,
    endReason: CombatEndReason.Destruction,
    report: {} as ICombatOutcome['report'],
    unitDeltas: [],
    capturedAt: AT,
  };
}

/** Occupies the one-row slot the way DurableMatchStore.appendCommandBatch does. */
async function seedPublishedDeliveredOutcome(
  store: DurableMatchStore,
): Promise<void> {
  const committed = await store.appendCommandBatch(MATCH_ID, {
    commandId: 'cmd-delivered-outcome',
    actorId: 'gm-1',
    expectedRevision: 4,
    events: [matchEvent(4)],
    combatOutcome: {
      outcomeId: OUTCOME,
      outcomeVersion: ACCEPTED.deliveredVersion,
      outcome: deliveredOutcome(),
    },
  });
  expect(committed.kind).toBe('committed');
  await store.markCombatOutcomePublished(MATCH_ID, OUTCOME);
}

function insertOutboxSlot(
  store: DurableMatchStore,
  outcomeVersion: number,
  outcomeJson: string,
): void {
  matchDatabase(store)
    .prepare(
      `INSERT INTO mp_combat_outcome_outbox
         (match_id, outcome_id, outcome_version, outcome_json,
          created_at, published_at)
       VALUES (?, ?, ?, ?, ?, NULL)`,
    )
    .run(MATCH_ID, OUTCOME, outcomeVersion, outcomeJson, AT);
}

function outboxRowCount(store: DurableMatchStore): number {
  const row = matchDatabase(store)
    .prepare(
      `SELECT COUNT(*) AS n FROM mp_combat_outcome_outbox WHERE match_id = ?`,
    )
    .get(MATCH_ID) as { readonly n: number };
  return row.n;
}

describe('recordCoordinatedCorrectionSource', () => {
  let store: DurableMatchStore;

  beforeEach(async () => {
    store = new DurableMatchStore({ path: ':memory:' });
    await seedMatchTail(store);
  });

  afterEach(() => {
    store.close();
  });

  it('source record moves the tail and writes the replacement outbox row and the saga row in one transaction', async () => {
    expect(firstSupersededMatchSequence(TARGET)).toBe(TARGET);
    const result = record(store);
    expect(result.kind).toBe('recorded');
    expect(await liveSequences(store)).toEqual([0, 1]);
    expect(
      readSupersededMatchEvents(matchDatabase(store), MATCH_ID).map(
        (row) => row.sequence,
      ),
    ).toEqual([2, 3]);
    expect(
      readCoordinatedCorrectionSaga(matchDatabase(store), sagaKeyOf(ACCEPTED)),
    ).toMatchObject({
      state: 'source-recorded',
      blockedReason: null,
      targetRevision: TARGET,
      outcomeVersion: 2,
    });
    const outbox = await store.getCombatOutcomeOutbox(MATCH_ID);
    expect(outbox).toMatchObject({
      outcomeId: OUTCOME,
      outcomeVersion: 2,
      publishedAt: null,
    });
  });

  it('an injected failure on the outbox insert leaves no supersession and no saga row', async () => {
    matchDatabase(store).exec(`
      CREATE TEMP TRIGGER fail_combat_outbox
      BEFORE INSERT ON mp_combat_outcome_outbox
      BEGIN
        SELECT RAISE(ABORT, 'injected outbox failure');
      END;
    `);
    const failure = (() => {
      try {
        record(store);
        return 'no failure';
      } catch (error) {
        return String(error);
      }
    })();
    expect(failure).toContain('injected outbox failure');
    expect(await liveSequences(store)).toEqual([0, 1, 2, 3]);
    expect(readSupersededMatchEvents(matchDatabase(store), MATCH_ID)).toEqual(
      [],
    );
    expect(
      readCoordinatedCorrectionSaga(matchDatabase(store), sagaKeyOf(ACCEPTED)),
    ).toBeNull();
    expect(await store.getCombatOutcomeOutbox(MATCH_ID)).toBeNull();
  });

  it('a retry with the same key is a no-op (one supersession, one outbox row, same saga row)', async () => {
    const first = record(store);
    const extend = await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-extend',
      actorId: 'gm-1',
      expectedRevision: TARGET,
      events: [matchEvent(2, 'evt-cut-new')],
    });
    expect(extend.kind).toBe('committed');
    const second = record(store);
    expect(second).toEqual(first);
    expect(await liveSequences(store)).toEqual([0, 1, 2]);
    expect(
      readSupersededMatchEvents(matchDatabase(store), MATCH_ID).map(
        (row) => row.sequence,
      ),
    ).toEqual([2, 3]);
    expect(outboxRowCount(store)).toBe(1);
  });

  it('a different outcome_json at the same version is refused typed', () => {
    expect(record(store).kind).toBe('recorded');
    const refused = record(store, JSON_B);
    expect(refused).toMatchObject({
      kind: 'refused',
      reason: 'replacement-immutable',
    });
    expect(
      readCoordinatedCorrectionSaga(matchDatabase(store), sagaKeyOf(ACCEPTED)),
    ).toMatchObject({ state: 'source-recorded' });
  });

  it('replacement slot is pending (published_at NULL); listPendingPublications does not cover mp_combat_outcome_outbox', async () => {
    record(store);
    const outbox = await store.getCombatOutcomeOutbox(MATCH_ID);
    expect(outbox?.publishedAt).toBeNull();
    // listPendingPublications reads mp_match_outbox only — not the combat slot.
    expect(
      (await store.listPendingPublications(MATCH_ID)).map(
        (row) => row.sequence,
      ),
    ).toEqual([0, 1]);
  });

  it('a delivered published slot is replaced in place at N+1 and listed pending', async () => {
    await seedPublishedDeliveredOutcome(store);
    const delivered = await store.getCombatOutcomeOutbox(MATCH_ID);
    expect(delivered).toMatchObject({
      outcomeVersion: ACCEPTED.deliveredVersion,
      publishedAt: expect.any(String),
    });

    const result = record(store);
    expect(result.kind).toBe('recorded');
    expect(readRecordedOutcomeJson(matchDatabase(store), MATCH_ID)).toBe(
      JSON_A,
    );
    const row = matchDatabase(store)
      .prepare(
        `SELECT outcome_version AS outcomeVersion, outcome_json AS outcomeJson,
                published_at AS publishedAt
           FROM mp_combat_outcome_outbox WHERE match_id = ?`,
      )
      .get(MATCH_ID) as {
      readonly outcomeVersion: number;
      readonly outcomeJson: string;
      readonly publishedAt: string | null;
    };
    expect(row).toEqual({
      outcomeVersion: ACCEPTED.outcomeVersion,
      outcomeJson: JSON_A,
      publishedAt: null,
    });
    expect(outboxRowCount(store)).toBe(1);
    const pending = await store.getCombatOutcomeOutbox(MATCH_ID);
    expect(pending).toMatchObject({
      outcomeId: OUTCOME,
      outcomeVersion: ACCEPTED.outcomeVersion,
      publishedAt: null,
    });
  });

  it('a slot already at N+1 with the same json and no saga row is adopted', async () => {
    insertOutboxSlot(store, ACCEPTED.outcomeVersion, JSON_A);
    const result = record(store);
    expect(result.kind).toBe('recorded');
    expect(await liveSequences(store)).toEqual([0, 1]);
    expect(
      readSupersededMatchEvents(matchDatabase(store), MATCH_ID).map(
        (row) => row.sequence,
      ),
    ).toEqual([2, 3]);
    expect(outboxRowCount(store)).toBe(1);
    expect(readRecordedOutcomeJson(matchDatabase(store), MATCH_ID)).toBe(
      JSON_A,
    );
    expect(
      readCoordinatedCorrectionSaga(matchDatabase(store), sagaKeyOf(ACCEPTED)),
    ).toMatchObject({ state: 'source-recorded', outcomeVersion: 2 });
  });

  it('a slot at N+2 refuses replacement-immutable and moves nothing', async () => {
    insertOutboxSlot(store, ACCEPTED.outcomeVersion + 1, JSON_B);
    const refused = record(store);
    expect(refused).toMatchObject({
      kind: 'refused',
      reason: 'replacement-immutable',
    });
    expect(await liveSequences(store)).toEqual([0, 1, 2, 3]);
    expect(readSupersededMatchEvents(matchDatabase(store), MATCH_ID)).toEqual(
      [],
    );
    expect(
      readCoordinatedCorrectionSaga(matchDatabase(store), sagaKeyOf(ACCEPTED)),
    ).toBeNull();
    expect(readRecordedOutcomeJson(matchDatabase(store), MATCH_ID)).toBe(
      JSON_B,
    );
    expect(outboxRowCount(store)).toBe(1);
  });

  it('a saga read after only the source step answers source-recorded', () => {
    record(store);
    expect(
      readCoordinatedCorrectionSaga(matchDatabase(store), sagaKeyOf(ACCEPTED)),
    ).toMatchObject({ state: 'source-recorded', blockedReason: null });
  });

  it('block transition answers blocked with the reason', () => {
    record(store);
    const blocked = blockCoordinatedCorrection(
      matchDatabase(store),
      sagaKeyOf(ACCEPTED),
      'campaign target unreachable',
    );
    expect(blocked).toMatchObject({
      state: 'blocked',
      blockedReason: 'campaign target unreachable',
    });
    expect(
      readCoordinatedCorrectionSaga(matchDatabase(store), sagaKeyOf(ACCEPTED)),
    ).toMatchObject({
      state: 'blocked',
      blockedReason: 'campaign target unreachable',
    });
  });
});

describe('sealCoordinatedCorrectionManifest', () => {
  let dir: string;
  let journalDb: Database.Database;
  let store: DurableMatchStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'correction-saga-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'journal.db') }).initialize();
    journalDb = getSQLiteService().getDatabase();
    store = new DurableMatchStore({ path: ':memory:' });
    await seedMatchTail(store);
    await seedJournal();
  });

  afterEach(async () => {
    store.close();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  async function seedJournal(): Promise<void> {
    const result = await new SQLiteEventJournal(journalDb, () => AT).append({
      ...STREAM,
      expectedBranchId: 'root',
      expectedRevision: 0,
      commandId: 'command-1',
      principal: {
        actorKind: 'human',
        actorId: 'player-1',
        authorityType: 'host',
        authorityId: 'host-1',
      },
      events: [1, 2, 3, 4].map((index) => ({
        eventId: `event-${index}`,
        eventType: 'probe_damage',
        eventVersion: 1,
        correlationId: 'correlation-1',
        causationEventIds: [],
        occurredAt: AT,
        payload: { amount: index },
        entityRefs: [
          { entityType: 'unit', entityId: 'unit-a', role: 'subject' },
        ],
      })),
    });
    expect(result.kind).toBe('committed');
    expect(
      new SQLiteEventHistoryBranchStore(journalDb).backfillGenesisBranches(),
    ).toBe(1);
  }

  function mintCandidate(): string {
    const branches = new SQLiteEventHistoryBranchStore(journalDb);
    const leases = new SQLiteEventHistoryCorrectionLeaseStore(
      journalDb,
      branches,
      { nowMs: () => Date.parse(AT) },
    );
    const head = journalDb
      .prepare(
        `SELECT stream_revision AS revision, event_digest AS digest
           FROM event_journal_stream_heads
          WHERE stream_id = ? AND branch_id = 'root'`,
      )
      .get(MATCH_ID) as { readonly revision: number; readonly digest: string };
    const lease = leases.acquireCorrectionLease({
      ...STREAM,
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'saga-source-seal',
      ttlMs: 60_000,
      expectedBranchId: 'root',
      expectedRevision: head.revision,
      expectedDigest: head.digest,
      expectedGeneration: 1,
    });
    return createCorrectionCandidateBranch(journalDb, leases, {
      ...STREAM,
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
      createdAt: AT,
      baseRevision: TARGET,
    }).branchId;
  }

  it('manifest seal advances the saga and is idempotent', () => {
    expect(record(store).kind).toBe('recorded');
    expect(
      readCoordinatedCorrectionSaga(matchDatabase(store), sagaKeyOf(ACCEPTED)),
    ).toMatchObject({ state: 'source-recorded' });

    const candidateBranchId = mintCandidate();
    const accepted = { ...ACCEPTED, candidateBranchId };
    const stores = { journal: journalDb, matchDb: matchDatabase(store) };
    const first = sealCoordinatedCorrectionManifest(
      stores,
      accepted,
      ARTIFACTS,
      AT,
    );
    expect(first).toMatchObject({
      kind: 'sealed',
      saga: { state: 'manifest-sealed', blockedReason: null },
    });
    const sealed = new SQLiteEventHistoryArtifactManifestStore(
      journalDb,
    ).readArtifactManifest(STREAM, candidateBranchId);
    expect(sealed?.entries).toEqual(ARTIFACTS);

    const second = sealCoordinatedCorrectionManifest(
      stores,
      accepted,
      ARTIFACTS,
      AT,
    );
    expect(second).toEqual(first);
    expect(
      readCoordinatedCorrectionSaga(matchDatabase(store), sagaKeyOf(ACCEPTED)),
    ).toMatchObject({ state: 'manifest-sealed', blockedReason: null });
  });

  it('seal on a blocked saga does not advance it', () => {
    expect(record(store).kind).toBe('recorded');
    const blockedReason = 'campaign target unreachable';
    expect(
      blockCoordinatedCorrection(
        matchDatabase(store),
        sagaKeyOf(ACCEPTED),
        blockedReason,
      ),
    ).toMatchObject({ state: 'blocked', blockedReason });

    const candidateBranchId = mintCandidate();
    const sealed = sealCoordinatedCorrectionManifest(
      { journal: journalDb, matchDb: matchDatabase(store) },
      { ...ACCEPTED, candidateBranchId },
      ARTIFACTS,
      AT,
    );
    expect(sealed).toMatchObject({
      kind: 'refused',
      reason: 'saga-blocked',
      detail: blockedReason,
    });
    expect(
      readCoordinatedCorrectionSaga(matchDatabase(store), sagaKeyOf(ACCEPTED)),
    ).toMatchObject({ state: 'blocked', blockedReason });
    expect(
      new SQLiteEventHistoryArtifactManifestStore(
        journalDb,
      ).readArtifactManifest(STREAM, candidateBranchId),
    ).toBeNull();
  });
});
