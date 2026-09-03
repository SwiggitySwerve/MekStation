import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { appendCampaignCommandBatch } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteService } from '@/services/persistence/SQLiteService';

import type { EventHistoryArtifactManifestErrorCode } from '../EventHistoryArtifactManifest';
import type { IAffectedArtifact } from '../EventHistoryArtifactManifest';
import type { EventHistoryBranchErrorCode } from '../EventHistoryBranchContract';
import type { EventHistoryCorrectionLeaseErrorCode } from '../EventHistoryCorrectionLeaseContract';
import type { IHeldCorrectionLease } from '../EventHistoryCorrectionLeaseContract';

import { createCorrectionCandidateBranch } from '../EventHistoryCandidateBuild';
import { activateCandidateBranch } from '../EventHistoryActivation';
import { EventHistoryArtifactManifestError } from '../EventHistoryArtifactManifest';
import { SQLiteEventHistoryArtifactManifestStore } from '../EventHistoryArtifactManifest';
import { EventHistoryBranchError } from '../EventHistoryBranchContract';
import { EventHistoryCorrectionLeaseError } from '../EventHistoryCorrectionLeaseContract';
import { SQLiteEventHistoryBranchStore } from '../SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '../SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '../SQLiteEventJournal';

const STREAM = { streamType: 'match', streamId: 'stream-1' } as const;
const AT = '2026-09-02T00:00:00.000Z';
const CANDIDATE = 'candidate-1';
const BASE_REVISION = 2;
const TTL_MS = 30_000;
const REASON = 'authorized rewind to turn 2';

const INVALIDATIONS: readonly IAffectedArtifact[] = [
  { artifactKind: 'projection', artifactId: 'gm', sourceRevision: 2 },
  { artifactKind: 'checkpoint', artifactId: 'ckpt-3', sourceRevision: 3 },
];

type AnyCode =
  | EventHistoryBranchErrorCode
  | EventHistoryCorrectionLeaseErrorCode
  | EventHistoryArtifactManifestErrorCode
  | 'no-throw';

function codeOf(run: () => unknown): AnyCode {
  try {
    run();
  } catch (error) {
    if (
      error instanceof EventHistoryBranchError ||
      error instanceof EventHistoryCorrectionLeaseError ||
      error instanceof EventHistoryArtifactManifestError
    ) {
      return error.code;
    }
    throw error;
  }
  return 'no-throw';
}

describe('activateCandidateBranch', () => {
  let dir: string;
  let service: SQLiteService;
  let db: Database.Database;
  let now: number;
  let headRevision: number;
  let headDigest: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'history-activation-'));
    service = new SQLiteService({ path: path.join(dir, 'activate.db') });
    service.initialize();
    db = service.getDatabase();
    now = 1_000_000;
    await seedStream();
    seedCandidate();
    sealManifest();
  });

  afterEach(async () => {
    service.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function branches(): SQLiteEventHistoryBranchStore {
    return new SQLiteEventHistoryBranchStore(db);
  }

  function leases(): SQLiteEventHistoryCorrectionLeaseStore {
    return new SQLiteEventHistoryCorrectionLeaseStore(db, branches(), {
      nowMs: () => now,
    });
  }

  function manifests(): SQLiteEventHistoryArtifactManifestStore {
    return new SQLiteEventHistoryArtifactManifestStore(db);
  }

  async function seedStream(): Promise<void> {
    const journal = new SQLiteEventJournal<{ amount: number }>(db, () => AT);
    const result = await journal.append({
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
    expect(branches().backfillGenesisBranches()).toBe(1);
    const head = db
      .prepare(
        `SELECT stream_revision AS revision, event_digest AS digest
         FROM event_journal_stream_heads WHERE stream_id = 'stream-1'`,
      )
      .get() as { readonly revision: number; readonly digest: string };
    headRevision = head.revision;
    headDigest = head.digest;
  }

  /** The rewind candidate a correction builds; anchored below the head. */
  function seedCandidate(branchId = CANDIDATE): void {
    const base = (
      db
        .prepare(
          `SELECT event_digest AS digest FROM event_journal_events
           WHERE stream_id = 'stream-1' AND stream_revision = ?`,
        )
        .get(BASE_REVISION) as { readonly digest: string }
    ).digest;
    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES ('match', 'stream-1', ?, 'root', 1, ?, ?, ?, 'building',
               'host-1', 'correction-rebuild:lease:1:rewind', ?)`,
    ).run(branchId, BASE_REVISION, `event-${BASE_REVISION}`, base, AT);
  }

  function sealManifest(branchId = CANDIDATE): void {
    manifests().sealArtifactManifest(STREAM, branchId, INVALIDATIONS, AT);
  }

  function acquire(owner = 'host-1'): IHeldCorrectionLease {
    const lease = leases().acquireCorrectionLease({
      ...STREAM,
      owner,
      actor: 'gm-1',
      reason: REASON,
      ttlMs: TTL_MS,
      expectedBranchId: 'root',
      expectedRevision: headRevision,
      expectedDigest: headDigest,
      expectedGeneration: 1,
    });
    return {
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
    };
  }

  function activate(
    held: IHeldCorrectionLease,
    candidateBranchId = CANDIDATE,
  ): ReturnType<typeof activateCandidateBranch> {
    return activateCandidateBranch(db, branches(), leases(), manifests(), {
      stream: STREAM,
      candidateBranchId,
      held,
      reason: REASON,
      activatedAt: AT,
    });
  }

  /** Everything a refused activation must leave exactly as it found it. */
  function census(): Record<string, unknown> {
    const count = (table: string): number =>
      (
        db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as {
          readonly n: number;
        }
      ).n;
    return {
      head: db
        .prepare(
          `SELECT branch_id AS branchId, effective_generation AS generation
           FROM event_history_effective_heads`,
        )
        .get() as unknown,
      statuses: db
        .prepare(
          `SELECT branch_id AS branchId, status FROM event_history_branches
           ORDER BY branch_id`,
        )
        .all() as unknown,
      supersessions: count('event_history_supersessions'),
      leases: count('event_history_correction_leases'),
      manifests: count('event_history_artifact_manifests'),
      events: count('event_journal_events'),
    };
  }

  it('activates the candidate, supersedes the prior branch, and increments the generation by exactly one', () => {
    const held = acquire();
    const result = activate(held);

    expect(result).toMatchObject({
      branchId: CANDIDATE,
      supersededBranchId: 'root',
      priorGeneration: 1,
      effectiveGeneration: 2,
    });
    // Canonical order, not the order they were sealed in: the manifest
    // digests order-free, so what comes back is sorted by kind then id.
    expect(result.invalidations).toEqual([INVALIDATIONS[1], INVALIDATIONS[0]]);

    expect(branches().readEffectiveHead(STREAM)).toMatchObject({
      branchId: CANDIDATE,
      effectiveGeneration: 2,
    });
    expect(branches().requireBranch(STREAM, 'root').status).toBe('superseded');
    expect(branches().requireBranch(STREAM, CANDIDATE).status).toBe(
      'effective',
    );
    // The supersession row PR 1 left unwritten - the fence, recorded once.
    expect(branches().readSupersessions(STREAM)).toEqual([
      {
        ...STREAM,
        supersededBranchId: 'root',
        replacementBranchId: CANDIDATE,
        priorGeneration: 1,
        replacementGeneration: 2,
        reason: REASON,
        recordedAt: AT,
      },
    ]);
  });

  it('refuses a stale owner and leaves the head untouched', () => {
    const first = acquire('host-1');
    now += TTL_MS;
    acquire('host-2');
    const before = census();

    // The old owner resumes with the lease it still remembers. Only the
    // epoch reveals the takeover, and nothing it touches may move.
    expect(codeOf(() => activate(first))).toBe('stale-correction-lease');
    expect(census()).toEqual(before);
  });

  it('refuses when the head moved after the lease was taken', async () => {
    const held = acquire();
    const journal = new SQLiteEventJournal<{ amount: number }>(db, () => AT);
    const appended = await journal.append({
      ...STREAM,
      expectedBranchId: 'root',
      expectedRevision: headRevision,
      commandId: 'command-2',
      principal: {
        actorKind: 'human',
        actorId: 'player-1',
        authorityType: 'host',
        authorityId: 'host-1',
      },
      events: [
        {
          eventId: 'event-5',
          eventType: 'probe_damage',
          eventVersion: 1,
          correlationId: 'correlation-1',
          causationEventIds: [],
          occurredAt: AT,
          payload: { amount: 5 },
          entityRefs: [
            { entityType: 'unit', entityId: 'unit-a', role: 'subject' },
          ],
        },
      ],
    });
    expect(appended.kind).toBe('committed');
    const before = census();

    expect(codeOf(() => activate(held))).toBe('stale-expected-head');
    expect(census()).toEqual(before);
  });

  it('refuses GENERATION_EXHAUSTED before any mutation at the safe-integer bound', () => {
    db.prepare(
      `UPDATE event_history_effective_heads SET effective_generation = ?`,
    ).run(Number.MAX_SAFE_INTEGER);
    const held = leases().acquireCorrectionLease({
      ...STREAM,
      owner: 'host-1',
      actor: 'gm-1',
      reason: REASON,
      ttlMs: TTL_MS,
      expectedBranchId: 'root',
      expectedRevision: headRevision,
      expectedDigest: headDigest,
      expectedGeneration: Number.MAX_SAFE_INTEGER,
    });
    const before = census();

    // There is no next safe integer, so there is nothing to activate INTO.
    // The refusal lands before any write, not as a constraint failure after
    // the branches have already moved.
    expect(
      codeOf(() =>
        activate({
          leaseId: held.leaseId,
          owner: held.owner,
          fencingEpoch: held.fencingEpoch,
        }),
      ),
    ).toBe('generation-exhausted');
    expect(census()).toEqual(before);
  });

  it('rolls back the whole activation when a write fails part-way through', () => {
    const held = acquire();
    // A supersession row already occupies this candidate's slot for the
    // prior branch. Demote, promote and the head repoint all succeed; the
    // activation's own supersession INSERT then collides on the primary
    // key. Every write is synchronous, so all of it is ONE transaction and
    // the failure takes the whole thing back out.
    db.prepare(
      `INSERT INTO event_history_supersessions
         (stream_type, stream_id, superseded_branch_id, replacement_branch_id,
          prior_generation, replacement_generation, reason, recorded_at)
       VALUES ('match', 'stream-1', 'root', ?, 1, 2, 'stray', ?)`,
    ).run(CANDIDATE, AT);
    const before = census();

    expect(() => activate(held)).toThrow();
    expect(census()).toEqual(before);
    expect(branches().requireBranch(STREAM, 'root').status).toBe('effective');
    expect(branches().requireBranch(STREAM, CANDIDATE).status).toBe('building');
  });

  it('refuses a candidate whose manifest was never sealed', () => {
    seedCandidate('candidate-2');
    const held = acquire();
    const before = census();

    // Activation publishes invalidations FROM the manifest. Without one
    // there is no answer to what this activation breaks, and an activation
    // nobody can audit is not one worth allowing.
    expect(codeOf(() => activate(held, 'candidate-2'))).toBe(
      'manifest-not-found',
    );
    expect(census()).toEqual(before);
  });

  it('serial order - activation first: the next lease is refused on generation', () => {
    activate(acquire());

    // The fence, seen from the other side. The stream now answers at
    // generation 2, so a correction that still names 1 is refused; nothing
    // else had to be built to stop it.
    let reason = 'none';
    try {
      leases().acquireCorrectionLease({
        ...STREAM,
        owner: 'host-2',
        actor: 'gm-1',
        reason: 'late correction',
        ttlMs: TTL_MS,
        expectedBranchId: 'root',
        expectedRevision: headRevision,
        expectedDigest: headDigest,
        expectedGeneration: 1,
      });
    } catch (error) {
      if (error instanceof EventHistoryCorrectionLeaseError) {
        expect(error.code).toBe('stale-expected-head');
        reason = error.staleHeadReason ?? 'none';
      }
    }
    expect(reason).toBe('STALE_BRANCH');
  });

  it('activation over a campaign candidate returns sealed campaign artifact ids', async () => {
    const campaign = {
      streamType: 'campaign' as const,
      streamId: 'camp-activate',
    };
    const campaignJournal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      db,
      () => AT,
    );
    const funds = (sequence: number): ICampaignEvent => ({
      type: 'FundsChanged',
      sequence,
      campaignId: campaign.streamId,
      ts: AT,
      authorPlayerId: 'gm-1',
      scope: 'campaign',
      payload: { delta: sequence, reason: `f-${sequence}`, balance: sequence },
    });
    for (const sequence of [1, 2] as const) {
      const appended = await appendCampaignCommandBatch(campaignJournal, {
        campaignId: campaign.streamId,
        commandId: `camp-cmd-${sequence}`,
        events: [funds(sequence)],
        expectedPostStateDigest: null,
        expectedRevision: sequence - 1,
      });
      expect(appended.kind).toBe('committed');
    }
    branches().backfillGenesisBranches();
    const head = db
      .prepare(
        `SELECT stream_revision AS revision, event_digest AS digest
         FROM event_journal_stream_heads
         WHERE stream_id = ? AND branch_id = 'root'`,
      )
      .get(campaign.streamId) as { revision: number; digest: string };
    const lease = leases().acquireCorrectionLease({
      ...campaign,
      owner: 'host-1',
      actor: 'gm-1',
      reason: REASON,
      ttlMs: TTL_MS,
      expectedBranchId: 'root',
      expectedRevision: head.revision,
      expectedDigest: head.digest,
      expectedGeneration: 1,
    });
    const candidate = createCorrectionCandidateBranch(db, leases(), {
      ...campaign,
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
      createdAt: AT,
      baseRevision: 2,
    });
    const campaignArtifacts: readonly IAffectedArtifact[] = [
      {
        artifactKind: 'scenario',
        artifactId: 'scn-c-3025-06-15-force-a',
        sourceRevision: 2,
      },
      {
        artifactKind: 'contract',
        artifactId: 'contract-c',
        sourceRevision: 2,
      },
      { artifactKind: 'salvage', artifactId: 'match-c', sourceRevision: 2 },
    ];
    manifests().sealArtifactManifest(
      campaign,
      candidate.branchId,
      campaignArtifacts,
      AT,
    );
    const result = activateCandidateBranch(
      db,
      branches(),
      leases(),
      manifests(),
      {
        stream: campaign,
        candidateBranchId: candidate.branchId,
        held: {
          leaseId: lease.leaseId,
          owner: lease.owner,
          fencingEpoch: lease.fencingEpoch,
        },
        reason: REASON,
        activatedAt: AT,
      },
    );
    expect(result.invalidations.map((entry) => entry.artifactId)).toEqual([
      'contract-c',
      'match-c',
      'scn-c-3025-06-15-force-a',
    ]);
  });

  it('serial order - lease first: the activation is refused on the lease', () => {
    const first = acquire('host-1');
    now += TTL_MS;
    acquire('host-2');
    const before = census();

    // The other order, and the same single consistent outcome: whichever
    // wins, exactly one of the two proceeds and the loser changes nothing.
    expect(codeOf(() => activate(first))).toBe('stale-correction-lease');
    expect(census()).toEqual(before);
  });
});
