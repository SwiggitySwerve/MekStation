/**
 * Seam 17.4: retry / reconnect / restart cannot apply a coordinated
 * correction twice. Fixture matches the saga and target suites.
 *
 * Unit form of the correction-exit kinds throws at the firing point.
 * The e2e form would process.exit; that is not wired in these rows.
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
import { createCorrectionCandidateBranch } from '@/lib/events/journal/EventHistoryCandidateBuild';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  DurableMatchStore,
  E2E_FAULT_KINDS,
  _armE2EFaultOnce,
  _resetE2EFaultsForTests,
} from '@/lib/multiplayer/server/DurableMatchStore';
import { readSupersededMatchEvents } from '@/lib/multiplayer/server/DurableMatchStore.supersede';
import { tryFoldActivatedRewindBranch } from '@/lib/multiplayer/server/ServerMatchHostRewindRebuild';
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

import { runCoordinatedCorrection } from '../CoordinatedOutcomeCorrectionRun';
import {
  readCoordinatedCorrectionSaga,
  sagaKeyOf,
  type IAcceptedCoordinatedOutcomeCorrection,
} from '../CoordinatedOutcomeCorrectionSaga';
import {
  CAMPAIGN_COMBAT_OUTCOME_REPLACEMENT_TABLE,
  coordinatedCorrectionConsequenceCommandId,
  readReplacementReceipt,
} from '../CoordinatedOutcomeCorrectionTarget';

const MATCH_ID = 'stream-1';
const CAMPAIGN_ID = 'campaign-run-1';
const MATCH_STREAM = { streamType: 'match', streamId: MATCH_ID } as const;
const AT = '2026-09-02T00:00:00.000Z';
const TARGET = 2;
const OUTCOME = 'outcome-1';
const DIGEST = 'd'.repeat(64);
const JSON_A = '{"replacement":"a"}';
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

describe('runCoordinatedCorrection', () => {
  let dir: string;
  let journalDb: Database.Database;
  let journal: SQLiteEventJournal<ICampaignJournalEnvelope>;
  let store: DurableMatchStore;
  let matchCandidateBranchId: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'correction-run-'));
    _resetE2EFaultsForTests();
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'journal.db') }).initialize();
    journalDb = getSQLiteService().getDatabase();
    journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      journalDb,
      () => AT,
    );
    store = new DurableMatchStore({ path: ':memory:' });
    await seedMatchTail();
    await seedPublishedDeliveredOutcome();
    await seedMatchJournal();
    await seedCampaignAndInbox();
    new SQLiteEventHistoryBranchStore(journalDb).backfillGenesisBranches();
    matchCandidateBranchId = mintMatchCandidate();
  });

  afterEach(async () => {
    _resetE2EFaultsForTests();
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

  async function seedPublishedDeliveredOutcome(): Promise<void> {
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

  async function runCorrection() {
    return runCoordinatedCorrection(
      {
        matchDb: matchDatabase(store),
        campaignDb: journalDb,
        journalDb,
        journal,
      },
      ACCEPTED,
      {
        at: AT,
        outcomeJson: JSON_A,
        artifacts: ARTIFACTS,
        matchCandidateBranchId,
        campaignId: CAMPAIGN_ID,
        retainedEvents: await retainedC1(),
        consequenceEvents: [fundsEvent(4)],
        expectedPostStateDigest: DIGEST,
        actor: 'gm-1',
        owner: 'host-1',
      },
    );
  }

  function sagaRow() {
    return readCoordinatedCorrectionSaga(
      matchDatabase(store),
      sagaKeyOf(ACCEPTED),
    );
  }

  function supersededCount(): number {
    return readSupersededMatchEvents(matchDatabase(store), MATCH_ID).length;
  }

  function outboxSlot(): {
    readonly outcomeVersion: number;
    readonly publishedAt: string | null;
  } {
    return matchDatabase(store)
      .prepare(
        `SELECT outcome_version AS outcomeVersion, published_at AS publishedAt
           FROM mp_combat_outcome_outbox WHERE match_id = ?`,
      )
      .get(MATCH_ID) as {
      readonly outcomeVersion: number;
      readonly publishedAt: string | null;
    };
  }

  function outboxCount(): number {
    const row = matchDatabase(store)
      .prepare(
        `SELECT COUNT(*) AS n FROM mp_combat_outcome_outbox WHERE match_id = ?`,
      )
      .get(MATCH_ID) as { readonly n: number };
    return row.n;
  }

  function matchManifestCount(): number {
    const row = journalDb
      .prepare(
        `SELECT COUNT(*) AS n FROM event_history_artifact_manifests
          WHERE stream_type = 'match' AND stream_id = ?`,
      )
      .get(MATCH_ID) as { readonly n: number };
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

  function replacementCount(): number {
    // The target step creates this table on its first run, so before that
    // step the table's ABSENCE is the observable "no replacement recorded".
    // Querying it directly would throw and hide the state under test.
    const present = journalDb
      .prepare(
        `SELECT COUNT(*) AS n FROM sqlite_master
          WHERE type = 'table' AND name = ?`,
      )
      .get(CAMPAIGN_COMBAT_OUTCOME_REPLACEMENT_TABLE) as { readonly n: number };
    if (present.n === 0) return 0;
    const row = journalDb
      .prepare(
        `SELECT COUNT(*) AS n FROM ${CAMPAIGN_COMBAT_OUTCOME_REPLACEMENT_TABLE}`,
      )
      .get() as { readonly n: number };
    return row.n;
  }

  function consequenceCount(candidateBranchId: string): number {
    const commandId = coordinatedCorrectionConsequenceCommandId(
      candidateBranchId,
      OUTCOME,
      ACCEPTED.outcomeVersion,
    );
    const row = journalDb
      .prepare(
        `SELECT COUNT(*) AS n FROM event_journal_events WHERE command_id = ?`,
      )
      .get(commandId) as { readonly n: number };
    return row.n;
  }

  function auditCounts(): {
    readonly superseded: number;
    readonly outbox: number;
    readonly matchManifests: number;
    readonly campaignCandidates: number;
    readonly replacements: number;
  } {
    return {
      superseded: supersededCount(),
      outbox: outboxCount(),
      matchManifests: matchManifestCount(),
      campaignCandidates: campaignCandidateCount(),
      replacements: replacementCount(),
    };
  }

  it('pins eight one-shot fault kinds including the two correction-exit windows', () => {
    expect(E2E_FAULT_KINDS).toHaveLength(8);
    expect(E2E_FAULT_KINDS).toEqual(
      expect.arrayContaining([
        'correction-exit-after-source',
        'correction-exit-after-target-mint',
        'post-commit-send',
      ]),
    );
  });

  it('RETRY: crash after source commit, second run finishes once', async () => {
    _armE2EFaultOnce('correction-exit-after-source', { matchId: MATCH_ID });
    await expect(runCorrection()).rejects.toThrow(
      'test-correction-exit-after-source',
    );
    expect(sagaRow()).toMatchObject({ state: 'source-recorded' });
    expect(supersededCount()).toBeGreaterThan(0);
    expect(outboxSlot()).toEqual({
      outcomeVersion: ACCEPTED.outcomeVersion,
      publishedAt: null,
    });
    expect(outboxCount()).toBe(1);
    expect(matchManifestCount()).toBe(0);
    expect(campaignCandidateCount()).toBe(0);
    expect(replacementCount()).toBe(0);

    const siblingAfterCrash = supersededCount();
    const retry = await runCorrection();
    expect(retry).toMatchObject({
      source: 'skipped',
      seal: 'ran',
      target: 'ran',
      saga: { state: 'target-pending' },
    });
    expect(supersededCount()).toBe(siblingAfterCrash);
    expect(outboxCount()).toBe(1);
    expect(outboxSlot().publishedAt).toBeNull();
    expect(matchManifestCount()).toBe(1);
    expect(campaignCandidateCount()).toBe(1);
    expect(replacementCount()).toBe(1);
    const candidate = retry.saga?.candidateBranchId;
    expect(typeof candidate).toBe('string');
    if (typeof candidate !== 'string') return;
    expect(consequenceCount(candidate)).toBe(1);
  });

  it('RECONNECT: second run with the same key skips every step and writes nothing', async () => {
    const first = await runCorrection();
    expect(first).toMatchObject({
      source: 'ran',
      seal: 'ran',
      target: 'ran',
      saga: { state: 'target-pending' },
    });
    const before = auditCounts();
    const sagaBefore = sagaRow();
    const second = await runCorrection();
    expect(second).toMatchObject({
      source: 'skipped',
      seal: 'skipped',
      target: 'skipped',
    });
    expect(sagaRow()).toEqual(sagaBefore);
    expect(auditCounts()).toEqual(before);
  });

  it('MINT-RETRY: crash after candidate persist reuses that branch on retry', async () => {
    _armE2EFaultOnce('correction-exit-after-target-mint', {
      matchId: MATCH_ID,
    });
    await expect(runCorrection()).rejects.toThrow(
      'test-correction-exit-after-target-mint',
    );
    const afterCrash = sagaRow();
    expect(afterCrash).toMatchObject({
      state: 'manifest-sealed',
      candidateBranchId: expect.any(String),
    });
    expect(campaignCandidateCount()).toBe(1);
    expect(replacementCount()).toBe(0);
    const minted = afterCrash?.candidateBranchId;

    const retry = await runCorrection();
    expect(retry).toMatchObject({
      source: 'skipped',
      seal: 'skipped',
      target: 'ran',
      saga: { state: 'target-pending', candidateBranchId: minted },
    });
    expect(campaignCandidateCount()).toBe(1);
    expect(replacementCount()).toBe(1);
  });

  it('CAUSALITY: campaign replacement and match saga name the same candidate', async () => {
    const done = await runCorrection();
    expect(done.saga?.state).toBe('target-pending');
    const candidate = done.saga?.candidateBranchId;
    expect(typeof candidate).toBe('string');
    if (typeof candidate !== 'string') return;
    const receipt = readReplacementReceipt(
      journalDb,
      OUTCOME,
      ACCEPTED.outcomeVersion,
    );
    expect(receipt).toMatchObject({
      outcomeId: OUTCOME,
      outcomeVersion: ACCEPTED.outcomeVersion,
      candidateBranchId: candidate,
    });
    expect(done.saga?.candidateBranchId).toBe(receipt?.candidateBranchId);
    expect(receipt?.commandId).toBe(
      coordinatedCorrectionConsequenceCommandId(
        candidate,
        OUTCOME,
        ACCEPTED.outcomeVersion,
      ),
    );
    expect(
      new SQLiteEventHistoryArtifactManifestStore(
        journalDb,
      ).readArtifactManifest(campaignStreamRef(CAMPAIGN_ID), candidate),
    ).not.toBeNull();
  });
});

describe('runCoordinatedCorrection restart over the same match file', () => {
  let dir: string;
  let journalDb: Database.Database;
  let journal: SQLiteEventJournal<ICampaignJournalEnvelope>;
  let store: DurableMatchStore;
  let matchPath: string;
  let matchCandidateBranchId: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'correction-run-restart-'));
    matchPath = path.join(dir, 'matches.db');
    _resetE2EFaultsForTests();
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'journal.db') }).initialize();
    journalDb = getSQLiteService().getDatabase();
    journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      journalDb,
      () => AT,
    );
    store = new DurableMatchStore({ path: matchPath });
    await seedOn(store);
    await seedJournal();
    new SQLiteEventHistoryBranchStore(journalDb).backfillGenesisBranches();
    matchCandidateBranchId = mintOn(journalDb);
  });

  afterEach(async () => {
    _resetE2EFaultsForTests();
    store.close();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  async function seedOn(next: DurableMatchStore): Promise<void> {
    await next.createMatch({
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
    expect(
      (
        await next.appendCommandBatch(MATCH_ID, {
          commandId: 'cmd-prefix',
          actorId: 'gm-1',
          expectedRevision: 0,
          events: [matchEvent(0), matchEvent(1)],
        })
      ).kind,
    ).toBe('committed');
    expect(
      (
        await next.appendCommandBatch(MATCH_ID, {
          commandId: 'cmd-tail',
          actorId: 'gm-1',
          expectedRevision: 2,
          events: [matchEvent(2), matchEvent(3)],
        })
      ).kind,
    ).toBe('committed');
    expect(
      (
        await next.appendCommandBatch(MATCH_ID, {
          commandId: 'cmd-delivered-outcome',
          actorId: 'gm-1',
          expectedRevision: 4,
          events: [matchEvent(4)],
          combatOutcome: {
            outcomeId: OUTCOME,
            outcomeVersion: ACCEPTED.deliveredVersion,
            outcome: deliveredOutcome(),
          },
        })
      ).kind,
    ).toBe('committed');
    await next.markCombatOutcomePublished(MATCH_ID, OUTCOME);
  }

  async function seedJournal(): Promise<void> {
    const raw = new SQLiteEventJournal(journalDb, () => AT);
    expect(
      (
        await raw.append({
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
        })
      ).kind,
    ).toBe('committed');
    expect(
      (
        await appendCampaignCommandBatch(journal, {
          campaignId: CAMPAIGN_ID,
          commandId: 'genesis',
          events: [fundsEvent(0)],
          expectedPostStateDigest: null,
          expectedRevision: 0,
        })
      ).kind,
    ).toBe('committed');
    expect(
      (
        await appendCampaignCommandBatch(journal, {
          campaignId: CAMPAIGN_ID,
          commandId: 'C1',
          events: [fundsEvent(1)],
          expectedPostStateDigest: null,
          expectedRevision: 1,
        })
      ).kind,
    ).toBe('committed');
    expect(
      (
        await appendCampaignCombatOutcomeBatch(journal, {
          campaignId: CAMPAIGN_ID,
          outcomeId: OUTCOME,
          outcomeVersion: 1,
          commandId: 'outcome-v1',
          events: [fundsEvent(2)],
          expectedPostStateDigest: DIGEST,
        })
      ).kind,
    ).toBe('committed');
  }

  function mintOn(db: Database.Database): string {
    const branches = new SQLiteEventHistoryBranchStore(db);
    const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches, {
      nowMs: () => Date.parse(AT),
    });
    const head = db
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
    return createCorrectionCandidateBranch(db, leases, {
      ...MATCH_STREAM,
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
      createdAt: AT,
      baseRevision: TARGET,
    }).branchId;
  }

  async function runOn(next: DurableMatchStore) {
    const stored = await journal.readStream({
      streamType: 'campaign',
      streamId: CAMPAIGN_ID,
      branchId: 'root',
      afterRevision: 0,
      limit: 20,
    });
    const retained = stored
      .filter((row) => row.commandId === 'C1')
      .map((row) => ({ commandId: row.commandId, event: envelopeOf(row) }));
    return runCoordinatedCorrection(
      {
        matchDb: matchDatabase(next),
        campaignDb: journalDb,
        journalDb,
        journal,
      },
      ACCEPTED,
      {
        at: AT,
        outcomeJson: JSON_A,
        artifacts: ARTIFACTS,
        matchCandidateBranchId,
        campaignId: CAMPAIGN_ID,
        retainedEvents: retained,
        consequenceEvents: [fundsEvent(4)],
        expectedPostStateDigest: DIGEST,
        actor: 'gm-1',
        owner: 'host-1',
      },
    );
  }

  it('RESTART: fresh store over the same file does not re-apply; boot fold sees the tail once', async () => {
    const first = await runOn(store);
    expect(first.saga?.state).toBe('target-pending');
    const sagaBefore = readCoordinatedCorrectionSaga(
      matchDatabase(store),
      sagaKeyOf(ACCEPTED),
    );
    const siblingBefore = readSupersededMatchEvents(
      matchDatabase(store),
      MATCH_ID,
    );
    expect(siblingBefore.length).toBeGreaterThan(0);
    const sequences = Array.from(
      new Set(siblingBefore.map((row) => row.sequence)),
    );

    store.close();
    store = new DurableMatchStore({ path: matchPath });
    const folded = await tryFoldActivatedRewindBranch(store, MATCH_ID);
    const siblingAfterFold = readSupersededMatchEvents(
      matchDatabase(store),
      MATCH_ID,
    );
    expect(siblingAfterFold).toHaveLength(siblingBefore.length);
    expect(
      Array.from(new Set(siblingAfterFold.map((row) => row.sequence))),
    ).toEqual(sequences);
    // Source already moved the tail; 17.2 does not activate, so boot
    // fold is a no-op and must not copy the sibling a second time.
    expect(folded).toBeNull();

    const second = await runOn(store);
    expect(second.source).toBe('skipped');
    expect(second.seal).toBe('skipped');
    expect(second.target).toBe('skipped');
    expect(second.saga).toEqual(sagaBefore);
    expect(
      readSupersededMatchEvents(matchDatabase(store), MATCH_ID),
    ).toHaveLength(siblingBefore.length);
  });
});
