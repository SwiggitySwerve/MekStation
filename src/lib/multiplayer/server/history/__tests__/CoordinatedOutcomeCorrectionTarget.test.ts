/**
 * Seam 17.2-b: target-side coordinated correction.
 * Match store is DurableMatchStore(':memory:'). Journal is a temp
 * SQLiteService, same harness as CoordinatedOutcomeCorrectionSaga.
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IRetainedSourceEvent } from '@/lib/campaign/rebuild/CampaignReplacementReplay';
import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { IAffectedArtifact } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { campaignStreamRef } from '@/lib/campaign/authority/campaignLaunchHead';
import {
  appendCampaignCommandBatch,
  appendCampaignCombatOutcomeBatch,
  envelopeOf,
} from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { EventHistoryBranchError } from '@/lib/events/journal/EventHistoryBranchContract';
import { createCorrectionCandidateBranch } from '@/lib/events/journal/EventHistoryCandidateBuild';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  GameEventType,
  GamePhase,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  COORDINATED_CORRECTION_SAGA_TABLE,
  recordCoordinatedCorrectionSource,
  sealCoordinatedCorrectionManifest,
  readCoordinatedCorrectionSaga,
  sagaKeyOf,
  type IAcceptedCoordinatedOutcomeCorrection,
} from '../CoordinatedOutcomeCorrectionSaga';
import {
  _setFailAfterCandidatePersistForTests,
  CAMPAIGN_COMBAT_OUTCOME_REPLACEMENT_TABLE,
  coordinatedCorrectionConsequenceCommandId,
  recordCoordinatedCorrectionTarget,
} from '../CoordinatedOutcomeCorrectionTarget';
import {
  insertReplacementReceipt,
  readReplacementReceipt,
} from '../CoordinatedOutcomeCorrectionTarget.steps';

const MATCH_ID = 'stream-1';
const CAMPAIGN_ID = 'campaign-target-1';
const MATCH_STREAM = { streamType: 'match', streamId: MATCH_ID } as const;
const AT = '2026-09-02T00:00:00.000Z';
const TARGET = 2;
const OUTCOME = 'outcome-1';
const DIGEST = 'd'.repeat(64);
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

function fundsEvent(sequence: number): ICampaignEvent {
  return {
    type: 'FundsChanged',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: AT,
    authorPlayerId: 'gm-1',
    scope: 'campaign',
    payload: {
      delta: 100,
      reason: `fact-${sequence}`,
      balance: sequence * 100,
    },
  };
}

function plain<T extends object>(row: T): T {
  return Object.assign({}, row);
}

describe('recordCoordinatedCorrectionTarget', () => {
  let dir: string;
  let journalDb: Database.Database;
  let journal: SQLiteEventJournal<ICampaignJournalEnvelope>;
  let store: DurableMatchStore;
  let inboxBefore: object | undefined;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'correction-target-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'journal.db') }).initialize();
    journalDb = getSQLiteService().getDatabase();
    journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      journalDb,
      () => AT,
    );
    store = new DurableMatchStore({ path: ':memory:' });
    await seedMatchTail();
    await seedMatchJournal();
    await seedCampaignAndInbox();
    new SQLiteEventHistoryBranchStore(journalDb).backfillGenesisBranches();
  });

  afterEach(async () => {
    _setFailAfterCandidatePersistForTests(false);
    store.close();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  async function seedMatchTail(): Promise<void> {
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

  async function seedMatchJournal(): Promise<void> {
    const raw = new SQLiteEventJournal(journalDb, () => AT);
    const result = await raw.append({
      ...MATCH_STREAM,
      expectedBranchId: 'root',
      expectedRevision: 0,
      commandId: 'match-command-1',
      principal: {
        actorKind: 'human',
        actorId: 'player-1',
        authorityType: 'host',
        authorityId: 'host-1',
      },
      events: [1, 2, 3, 4].map((index) => ({
        eventId: `match-event-${index}`,
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
  }

  async function seedCampaignAndInbox(): Promise<void> {
    const genesis = await appendCampaignCommandBatch(journal, {
      campaignId: CAMPAIGN_ID,
      commandId: 'genesis',
      events: [fundsEvent(0)],
      expectedPostStateDigest: null,
      expectedRevision: 0,
    });
    const follow = await appendCampaignCommandBatch(journal, {
      campaignId: CAMPAIGN_ID,
      commandId: 'C1',
      events: [fundsEvent(1)],
      expectedPostStateDigest: null,
      expectedRevision: 1,
    });
    expect(genesis.kind).toBe('committed');
    expect(follow.kind).toBe('committed');
    const delivered = await appendCampaignCombatOutcomeBatch(journal, {
      campaignId: CAMPAIGN_ID,
      outcomeId: OUTCOME,
      outcomeVersion: 1,
      commandId: 'outcome-v1',
      events: [fundsEvent(2)],
      expectedPostStateDigest: DIGEST,
    });
    expect(delivered.kind).toBe('committed');
    inboxBefore = inboxRow();
  }

  function mintMatchCandidate(): string {
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
      ...MATCH_STREAM,
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
      ...MATCH_STREAM,
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
      createdAt: AT,
      baseRevision: TARGET,
    }).branchId;
  }

  function sealSource(): void {
    expect(
      recordCoordinatedCorrectionSource(matchDatabase(store), ACCEPTED, {
        at: AT,
        outcomeJson: '{"replacement":"a"}',
      }).kind,
    ).toBe('recorded');
    const sealed = sealCoordinatedCorrectionManifest(
      { journal: journalDb, matchDb: matchDatabase(store) },
      { ...ACCEPTED, candidateBranchId: mintMatchCandidate() },
      ARTIFACTS,
      AT,
    );
    expect(sealed).toMatchObject({
      kind: 'sealed',
      saga: { state: 'manifest-sealed' },
    });
  }

  async function retainedC1(): Promise<readonly IRetainedSourceEvent[]> {
    const stored = await journal.readStream({
      streamType: 'campaign',
      streamId: CAMPAIGN_ID,
      branchId: 'root',
      afterRevision: 0,
      limit: 20,
    });
    return stored
      .filter((row) => row.commandId === 'C1')
      .map((row) => ({ commandId: row.commandId, event: envelopeOf(row) }));
  }

  async function recordTarget() {
    return recordCoordinatedCorrectionTarget(
      { journal, campaignDb: journalDb, matchDb: matchDatabase(store) },
      ACCEPTED,
      {
        campaignId: CAMPAIGN_ID,
        retainedEvents: await retainedC1(),
        consequenceEvents: [fundsEvent(4)],
        expectedPostStateDigest: DIGEST,
        actor: 'gm-1',
        owner: 'host-1',
        at: AT,
      },
    );
  }

  function inboxRow(): object | undefined {
    const row = journalDb
      .prepare(
        `SELECT outcome_id, outcome_version, campaign_id, command_id,
                command_digest, first_stream_revision, last_stream_revision,
                first_commit_position, last_commit_position, received_at
           FROM campaign_combat_outcome_inbox WHERE outcome_id = ?`,
      )
      .get(OUTCOME);
    return row === undefined ? undefined : plain(row as object);
  }

  function replacementCount(): number {
    const row = journalDb
      .prepare(
        `SELECT COUNT(*) AS n FROM ${CAMPAIGN_COMBAT_OUTCOME_REPLACEMENT_TABLE}`,
      )
      .get() as { readonly n: number };
    return row.n;
  }

  function campaignCandidateCount(): number {
    const row = journalDb
      .prepare(
        `SELECT COUNT(*) AS n FROM event_history_branches
          WHERE stream_type = 'campaign' AND stream_id = ?
            AND branch_id != 'root'`,
      )
      .get(CAMPAIGN_ID) as { readonly n: number };
    return row.n;
  }

  function rootEventCount(): number {
    const row = journalDb
      .prepare(
        `SELECT COUNT(*) AS n FROM event_journal_events
          WHERE stream_type = 'campaign' AND stream_id = ?
            AND branch_id = 'root'`,
      )
      .get(CAMPAIGN_ID) as { readonly n: number };
    return row.n;
  }

  function consequenceRows(candidateBranchId: string): readonly {
    readonly branchId: string;
    readonly commandId: string;
  }[] {
    const commandId = coordinatedCorrectionConsequenceCommandId(
      candidateBranchId,
      OUTCOME,
      ACCEPTED.outcomeVersion,
    );
    return (
      journalDb
        .prepare(
          `SELECT branch_id AS branchId, command_id AS commandId
             FROM event_journal_events
            WHERE command_id = ? ORDER BY stream_revision`,
        )
        .all(commandId) as Array<{
        readonly branchId: string;
        readonly commandId: string;
      }>
    ).map((row) => plain(row));
  }

  it('target record on a manifest-sealed saga mints one candidate, replays, appends the consequence batch on the candidate, inserts one replacement row, seals, and answers pending', async () => {
    sealSource();
    const rootBefore = rootEventCount();
    const first = await recordTarget();
    expect(first.kind).toBe('pending');
    if (first.kind !== 'pending') return;
    expect(first.saga.state).toBe('target-pending');
    expect(first.saga.candidateBranchId).toEqual(expect.any(String));
    expect(first.receipt.candidateBranchId).toBe(first.saga.candidateBranchId);
    expect(campaignCandidateCount()).toBe(1);
    expect(replacementCount()).toBe(1);
    expect(rootEventCount()).toBe(rootBefore);
    const rows = consequenceRows(first.receipt.candidateBranchId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      branchId: first.receipt.candidateBranchId,
      commandId: first.receipt.commandId,
    });
    expect(
      new SQLiteEventHistoryArtifactManifestStore(
        journalDb,
      ).readArtifactManifest(
        campaignStreamRef(CAMPAIGN_ID),
        first.receipt.candidateBranchId,
      ),
    ).not.toBeNull();
    expect(inboxRow()).toEqual(inboxBefore);
  });

  it('the consequence command id is scoped to the candidate that carries it', async () => {
    // Two attempts at the same correction mint different candidates (the
    // id is random). If the consequence command id did not carry the
    // candidate, the journal's command-identity guard would treat the
    // second candidate's batch as a duplicate of the first and silently
    // append nothing, leaving a candidate with no consequence on it.
    const first = coordinatedCorrectionConsequenceCommandId(
      'candidate-alpha',
      OUTCOME,
      ACCEPTED.outcomeVersion,
    );
    const second = coordinatedCorrectionConsequenceCommandId(
      'candidate-beta',
      OUTCOME,
      ACCEPTED.outcomeVersion,
    );
    expect(first).toContain('candidate-alpha');
    expect(second).toContain('candidate-beta');
    expect(first).not.toBe(second);
  });

  it('recording the replacement receipt twice keeps the first (a racing writer cannot throw the saga)', async () => {
    // The caller short-circuits on an existing receipt, so a second
    // insert only happens when another writer landed between that read
    // and this write. It must converge on the stored row rather than
    // raise a uniqueness error that would block an otherwise healthy saga.
    const receipt = {
      outcomeId: OUTCOME,
      outcomeVersion: ACCEPTED.outcomeVersion,
      campaignId: CAMPAIGN_ID,
      candidateBranchId: 'candidate-alpha',
      commandId: 'command-alpha',
      firstStreamRevision: 3,
      lastStreamRevision: 3,
      recordedAt: AT,
    };
    expect(insertReplacementReceipt(journalDb, receipt)).toStrictEqual(receipt);
    expect(
      insertReplacementReceipt(journalDb, {
        ...receipt,
        candidateBranchId: 'candidate-beta',
        commandId: 'command-beta',
      }),
    ).toStrictEqual(receipt);
    expect(
      readReplacementReceipt(journalDb, OUTCOME, ACCEPTED.outcomeVersion),
    ).toStrictEqual(receipt);
    expect(replacementCount()).toBe(1);
  });

  it('a retry after success is a no-op (same receipt, one candidate, one replacement row, one consequence batch)', async () => {
    sealSource();
    const first = await recordTarget();
    expect(first.kind).toBe('pending');
    if (first.kind !== 'pending') return;
    const second = await recordTarget();
    expect(second.kind).toBe('recorded');
    if (second.kind !== 'recorded') return;
    expect(second.receipt).toEqual(first.receipt);
    expect(second.saga.candidateBranchId).toBe(first.saga.candidateBranchId);
    expect(campaignCandidateCount()).toBe(1);
    expect(replacementCount()).toBe(1);
    expect(consequenceRows(first.receipt.candidateBranchId)).toHaveLength(1);
    expect(inboxRow()).toEqual(inboxBefore);
  });

  it('an injected failure after the mint leaves the candidate id and reuses it on retry', async () => {
    sealSource();
    _setFailAfterCandidatePersistForTests(true);
    const failed = await recordTarget();
    _setFailAfterCandidatePersistForTests(false);
    expect(failed.kind).toBe('blocked');
    const afterCrash = readCoordinatedCorrectionSaga(
      matchDatabase(store),
      sagaKeyOf(ACCEPTED),
    );
    expect(afterCrash).toMatchObject({
      state: 'manifest-sealed',
      candidateBranchId: expect.any(String),
    });
    expect(campaignCandidateCount()).toBe(1);
    expect(replacementCount()).toBe(0);
    const minted = afterCrash?.candidateBranchId;
    const retry = await recordTarget();
    expect(retry.kind).toBe('pending');
    if (retry.kind !== 'pending') return;
    expect(retry.saga.candidateBranchId).toBe(minted);
    expect(campaignCandidateCount()).toBe(1);
    expect(replacementCount()).toBe(1);
  });

  it('the accepted inbox row is unchanged after the whole flow', async () => {
    sealSource();
    await recordTarget();
    expect(inboxRow()).toEqual(inboxBefore);
    expect(inboxRow()).toMatchObject({
      outcome_id: OUTCOME,
      outcome_version: 1,
    });
  });

  it('a saga not yet manifest-sealed answers not-ready and writes nothing', async () => {
    expect(
      recordCoordinatedCorrectionSource(matchDatabase(store), ACCEPTED, {
        at: AT,
        outcomeJson: '{"replacement":"a"}',
      }).kind,
    ).toBe('recorded');
    const result = await recordTarget();
    expect(result).toMatchObject({
      kind: 'not-ready',
      state: 'source-recorded',
    });
    expect(campaignCandidateCount()).toBe(0);
    expect(
      journalDb
        .prepare(
          `SELECT name FROM sqlite_master
            WHERE type = 'table' AND name = ?`,
        )
        .get(CAMPAIGN_COMBAT_OUTCOME_REPLACEMENT_TABLE),
    ).toBeUndefined();
    expect(inboxRow()).toEqual(inboxBefore);
  });

  describe('D-3b candidate lifecycle', () => {
    const campaignStream = campaignStreamRef(CAMPAIGN_ID);

    function candidates(): { branchId: string; status: string }[] {
      return new SQLiteEventHistoryBranchStore(journalDb)
        .listBranches(campaignStream)
        .filter((branch) => branch.branchId !== 'root')
        .map(({ branchId, status }) => ({ branchId, status }));
    }

    function statusOf(branchId: string | null | undefined): string | undefined {
      return candidates().find((c) => c.branchId === branchId)?.status;
    }

    function leaseStore(): SQLiteEventHistoryCorrectionLeaseStore {
      return new SQLiteEventHistoryCorrectionLeaseStore(
        journalDb,
        new SQLiteEventHistoryBranchStore(journalDb),
        { nowMs: () => Date.parse(AT) },
      );
    }

    function liveLease(): unknown {
      return leaseStore().readLiveLease(campaignStream);
    }

    function acquireCampaignLease(owner: string) {
      const head = journalDb
        .prepare(
          `SELECT stream_revision AS revision, event_digest AS digest
             FROM event_journal_stream_heads
            WHERE stream_id = ? AND branch_id = 'root'`,
        )
        .get(CAMPAIGN_ID) as {
        readonly revision: number;
        readonly digest: string;
      };
      return leaseStore().acquireCorrectionLease({
        ...campaignStream,
        owner,
        actor: 'gm-0',
        reason: `lease-of-${owner}`,
        ttlMs: 60_000,
        expectedBranchId: 'root',
        expectedRevision: head.revision,
        expectedDigest: head.digest,
        expectedGeneration: 1,
      });
    }

    /** A candidate whose correction crashed: built under a lease, never sealed. */
    function strandCandidate(): string {
      const lease = acquireCampaignLease('crashed-host');
      const id = createCorrectionCandidateBranch(journalDb, leaseStore(), {
        ...campaignStream,
        leaseId: lease.leaseId,
        owner: lease.owner,
        fencingEpoch: lease.fencingEpoch,
        createdAt: AT,
      }).branchId;
      leaseStore().releaseCorrectionLease(campaignStream, {
        leaseId: lease.leaseId,
        owner: lease.owner,
      });
      return id;
    }

    /** A saga row of another outcome that names `candidateBranchId`. */
    function otherSaga(
      outcomeId: string,
      state: 'target-pending' | 'blocked',
      candidateBranchId: string,
    ): void {
      matchDatabase(store)
        .prepare(
          `INSERT INTO ${COORDINATED_CORRECTION_SAGA_TABLE} (
             match_id, outcome_id, outcome_version, target_revision, state,
             blocked_reason, source_recorded_at, manifest_sealed_at,
             target_recorded_at, updated_at, candidate_branch_id
           ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          MATCH_ID,
          outcomeId,
          TARGET,
          state,
          state === 'blocked' ? 'earlier refusal' : null,
          AT,
          AT,
          AT,
          AT,
          candidateBranchId,
        );
    }

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('a non-retryable refusal after the mint blocks the saga and its candidate', async () => {
      sealSource();
      jest
        .spyOn(
          SQLiteEventHistoryArtifactManifestStore.prototype,
          'sealArtifactManifest',
        )
        .mockImplementation(() => {
          throw new EventHistoryBranchError(
            'invalid-branch-record',
            'injected: branch refused',
          );
        });
      const result = await recordTarget();
      expect(result).toMatchObject({
        kind: 'blocked',
        reason: 'injected: branch refused',
        saga: { state: 'blocked' },
      });
      const minted = readCoordinatedCorrectionSaga(
        matchDatabase(store),
        sagaKeyOf(ACCEPTED),
      )?.candidateBranchId;
      expect(minted).toEqual(expect.any(String));
      expect(statusOf(minted)).toBe('blocked');
      expect(liveLease()).toBeNull();
    });

    it('a crash after the mint keeps the candidate building for the retry, and still releases the lease', async () => {
      sealSource();
      _setFailAfterCandidatePersistForTests(true);
      const failed = await recordTarget();
      _setFailAfterCandidatePersistForTests(false);
      expect(failed.kind).toBe('blocked');
      const minted = readCoordinatedCorrectionSaga(
        matchDatabase(store),
        sagaKeyOf(ACCEPTED),
      )?.candidateBranchId;
      expect(statusOf(minted)).toBe('building');
      expect(liveLease()).toBeNull();
      const retry = await recordTarget();
      expect(retry.kind).toBe('pending');
      expect(statusOf(minted)).toBe('building');
    });

    it('releases the lease after a successful record', async () => {
      sealSource();
      expect((await recordTarget()).kind).toBe('pending');
      expect(liveLease()).toBeNull();
    });

    it('blocks an unsealed stranded candidate no live saga names, and keeps its own', async () => {
      sealSource();
      const stranded = strandCandidate();
      const result = await recordTarget();
      expect(result.kind).toBe('pending');
      if (result.kind !== 'pending') return;
      expect(statusOf(stranded)).toBe('blocked');
      expect(statusOf(result.receipt.candidateBranchId)).toBe('building');
      expect(candidates()).toHaveLength(2);
    });

    it('keeps an unsealed candidate that a non-blocked saga names, and blocks one only a blocked saga names', async () => {
      sealSource();
      const named = strandCandidate();
      const abandoned = strandCandidate();
      otherSaga('outcome-live', 'target-pending', named);
      otherSaga('outcome-dead', 'blocked', abandoned);
      const result = await recordTarget();
      expect(result.kind).toBe('pending');
      expect(statusOf(named)).toBe('building');
      expect(statusOf(abandoned)).toBe('blocked');
    });

    it('keeps a sealed candidate awaiting activation', async () => {
      sealSource();
      const sealed = strandCandidate();
      new SQLiteEventHistoryArtifactManifestStore(
        journalDb,
      ).sealArtifactManifest(campaignStream, sealed, [], AT);
      const result = await recordTarget();
      expect(result.kind).toBe('pending');
      expect(statusOf(sealed)).toBe('building');
    });

    it('does not sweep when another owner holds the lease', async () => {
      sealSource();
      const stranded = strandCandidate();
      acquireCampaignLease('host-other');
      const result = await recordTarget();
      expect(result.kind).toBe('not-ready');
      expect(statusOf(stranded)).toBe('building');
    });
  });

  it('a foreign lease answers not-ready, not blocked', async () => {
    sealSource();
    const branches = new SQLiteEventHistoryBranchStore(journalDb);
    const leases = new SQLiteEventHistoryCorrectionLeaseStore(
      journalDb,
      branches,
      { nowMs: () => Date.parse(AT) },
    );
    const stream = campaignStreamRef(CAMPAIGN_ID);
    const head = journalDb
      .prepare(
        `SELECT stream_revision AS revision, event_digest AS digest
           FROM event_journal_stream_heads
          WHERE stream_id = ? AND branch_id = 'root'`,
      )
      .get(CAMPAIGN_ID) as {
      readonly revision: number;
      readonly digest: string;
    };
    leases.acquireCorrectionLease({
      ...stream,
      owner: 'host-other',
      actor: 'gm-other',
      reason: 'foreign-lease',
      ttlMs: 60_000,
      expectedBranchId: 'root',
      expectedRevision: head.revision,
      expectedDigest: head.digest,
      expectedGeneration: 1,
    });
    const result = await recordTarget();
    expect(result.kind).toBe('not-ready');
    expect(result).toMatchObject({
      kind: 'not-ready',
      state: 'manifest-sealed',
    });
    expect(
      readCoordinatedCorrectionSaga(matchDatabase(store), sagaKeyOf(ACCEPTED)),
    ).toMatchObject({ state: 'manifest-sealed', blockedReason: null });
    expect(campaignCandidateCount()).toBe(0);
    expect(replacementCount()).toBe(0);
    expect(inboxRow()).toEqual(inboxBefore);
  });
});
