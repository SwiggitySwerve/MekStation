import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SQLiteService } from '@/services/persistence/SQLiteService';

import type { EventHistoryBranchErrorCode } from '../EventHistoryBranchContract';
import type { EventHistoryCorrectionLeaseErrorCode } from '../EventHistoryCorrectionLeaseContract';

import { EventHistoryBranchError } from '../EventHistoryBranchContract';
import {
  createCorrectionCandidateBranch,
  readCandidateLeaseRef,
} from '../EventHistoryCandidateBuild';
import { EventHistoryCorrectionLeaseError } from '../EventHistoryCorrectionLeaseContract';
import { SQLiteEventHistoryBranchStore } from '../SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '../SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '../SQLiteEventJournal';

const STREAM = { streamType: 'match', streamId: 'stream-1' } as const;
const TTL_MS = 30_000;
const CREATED_AT = '2026-09-02T00:00:00.000Z';

type AnyCode =
  | EventHistoryBranchErrorCode
  | EventHistoryCorrectionLeaseErrorCode
  | 'no-throw';

function codeOf(run: () => unknown): AnyCode {
  try {
    run();
  } catch (error) {
    if (
      error instanceof EventHistoryBranchError ||
      error instanceof EventHistoryCorrectionLeaseError
    ) {
      return error.code;
    }
    throw error;
  }
  return 'no-throw';
}

interface IHead {
  readonly revision: number;
  readonly digest: string;
}

describe('createCorrectionCandidateBranch', () => {
  let dir: string;
  let service: SQLiteService;
  let db: Database.Database;
  let now: number;
  let head: IHead;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'candidate-build-'));
    now = 1_000_000;
    service = new SQLiteService({ path: path.join(dir, 'candidate.db') });
    service.initialize();
    db = service.getDatabase();
    head = { revision: 0, digest: '' };
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

  /** The real shipped writer - the digest chain is the one it produced. */
  function journal(): SQLiteEventJournal<{ value: string }> {
    return new SQLiteEventJournal<{ value: string }>(db, () => CREATED_AT);
  }

  function readHead(): IHead {
    const row = db
      .prepare(
        `SELECT stream_revision AS revision, event_digest AS digest
         FROM event_journal_stream_heads
         WHERE stream_type = 'match' AND stream_id = 'stream-1'`,
      )
      .get() as IHead | undefined;
    if (row === undefined) throw new Error('no stream head');
    return row;
  }

  /** Append `count` real events after `afterRevision`, then re-read the head. */
  async function append(
    commandId: string,
    afterRevision: number,
    count: number,
  ): Promise<void> {
    const result = await journal().append({
      ...STREAM,
      expectedBranchId: 'root',
      expectedRevision: afterRevision,
      commandId,
      principal: {
        actorKind: 'human',
        actorId: 'player-1',
        authorityType: 'host',
        authorityId: 'host-1',
      },
      events: Array.from({ length: count }, (_ignored, index) => ({
        eventId: `${commandId}-event-${index + 1}`,
        eventType: 'TestEvent',
        eventVersion: 1,
        correlationId: 'correlation-1',
        causationEventIds: [],
        occurredAt: CREATED_AT,
        payload: { value: `${commandId}-${index + 1}` },
        entityRefs: [
          { entityType: 'unit', entityId: 'unit-a', role: 'subject' },
        ],
      })),
    });
    expect(result.kind).toBe('committed');
    head = readHead();
  }

  /** A stream with four real events and its backfilled genesis branch. */
  async function seedStream(): Promise<void> {
    await append('command-1', 0, 4);
    expect(branches().backfillGenesisBranches()).toBe(1);
  }

  function acquire(owner = 'host-1'): {
    leaseId: string;
    owner: string;
    fencingEpoch: number;
  } {
    const lease = leases().acquireCorrectionLease({
      ...STREAM,
      owner,
      actor: 'gm-1',
      reason: 'authorized rewind to turn 3',
      ttlMs: TTL_MS,
      expectedBranchId: 'root',
      expectedRevision: head.revision,
      expectedDigest: head.digest,
      expectedGeneration: 1,
    });
    return {
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
    };
  }

  function build(held: {
    leaseId: string;
    owner: string;
    fencingEpoch: number;
  }): ReturnType<typeof createCorrectionCandidateBranch> {
    return createCorrectionCandidateBranch(db, leases(), {
      ...STREAM,
      ...held,
      createdAt: CREATED_AT,
    });
  }

  it('mints a building candidate anchored to the head the lease bound', async () => {
    await seedStream();
    const held = acquire();

    const candidate = build(held);

    expect(candidate).toMatchObject({
      ...STREAM,
      parentBranchId: 'root',
      ancestorDepth: 1,
      baseRevision: head.revision,
      baseEventId: 'command-1-event-4',
      baseDigest: head.digest,
      status: 'building',
      createdBy: 'host-1',
      createdAt: CREATED_AT,
    });
    expect(candidate.branchId).toMatch(/^[0-9a-f]{32}$/);
    expect(branches().readBranch(STREAM, candidate.branchId)).toEqual(
      candidate,
    );
    // Activation is not this seam's business: the stream still answers from
    // root at generation 1, and nothing was superseded.
    expect(branches().readEffectiveHead(STREAM)).toMatchObject({
      branchId: 'root',
      effectiveGeneration: 1,
    });
    expect(branches().readSupersessions(STREAM)).toEqual([]);
  });

  it('keeps production genesis-only - the default branch store still refuses to create', async () => {
    await seedStream();
    // The capability is not weakened by an authorized path existing. A
    // caller that does not come through it holds the refusing seam.
    expect(
      codeOf(() =>
        branches().createBranch({
          ...STREAM,
          branchId: 'candidate-1',
          parentBranchId: 'root',
          ancestorDepth: 1,
          baseRevision: head.revision,
          baseEventId: 'command-1-event-4',
          baseDigest: head.digest,
          status: 'building',
          createdBy: 'host-1',
          reason: 'hand-rolled',
          createdAt: CREATED_AT,
        }),
      ),
    ).toBe('branch-creation-disabled');
    expect(branches().listBranches(STREAM)).toHaveLength(1);
  });

  it('refuses to build without a live lease', async () => {
    await seedStream();
    expect(
      codeOf(() =>
        build({ leaseId: '0'.repeat(32), owner: 'host-1', fencingEpoch: 1 }),
      ),
    ).toBe('stale-correction-lease');

    const held = acquire();
    now += TTL_MS;
    // The lease lapsed mid-rebuild. Its holder may not quietly go on
    // building: the permission it is acting on no longer exists.
    expect(codeOf(() => build(held))).toBe('stale-correction-lease');
    expect(branches().listBranches(STREAM)).toHaveLength(1);
  });

  it('fences the old owner after a takeover - its next build refuses on epoch', async () => {
    await seedStream();
    const first = acquire('host-1');
    now += TTL_MS;
    const second = acquire('host-2');
    expect(second.fencingEpoch).toBe(first.fencingEpoch + 1);

    // The old owner restarts and resumes, still holding everything it had.
    // Nothing about its own record changed; the stream moved on without it.
    expect(codeOf(() => build(first))).toBe('stale-correction-lease');
    // Nor can it borrow the new epoch: the live lease names another owner.
    expect(
      codeOf(() => build({ ...first, fencingEpoch: second.fencingEpoch })),
    ).toBe('stale-correction-lease');

    // The epoch fences ON ITS OWN. Here the live holder presents its real
    // lease id and its real name, and only the epoch is stale - a caller
    // acting on a cached fencing token from before the handover. Without
    // this row the two above pass on the owner comparison alone, and a
    // build that read the live epoch instead of checking the presented one
    // would go unnoticed (the mutant that survived until this row existed).
    expect(
      codeOf(() => build({ ...second, fencingEpoch: first.fencingEpoch })),
    ).toBe('stale-correction-lease');
    expect(branches().listBranches(STREAM)).toHaveLength(1);

    expect(build(second).status).toBe('building');
  });

  it('refuses when the head moved after the lease was acquired', async () => {
    await seedStream();
    const held = acquire();
    // An append slipped in between acquisition and build. The lease is
    // still live, but it is bound to a head that is no longer there.
    await append('command-2', head.revision, 1);

    let reason = 'none';
    expect(
      codeOf(() => {
        try {
          build(held);
        } catch (error) {
          if (error instanceof EventHistoryCorrectionLeaseError) {
            reason = error.staleHeadReason ?? 'none';
          }
          throw error;
        }
      }),
    ).toBe('stale-expected-head');
    expect(reason).toBe('STALE_REVISION');
    expect(branches().listBranches(STREAM)).toHaveLength(1);
  });

  it('cannot lease a stream that has no history to rewind to', () => {
    // An empty stream has no journal head row, so the genesis backfill
    // gives it no branch - and with no effective branch there is nothing
    // for a lease to bind to. The refusal lands at acquisition, which is
    // where the question is actually decided.
    expect(branches().backfillGenesisBranches()).toBe(0);
    expect(
      codeOf(() =>
        leases().acquireCorrectionLease({
          ...STREAM,
          owner: 'host-1',
          actor: 'gm-1',
          reason: 'rewind an empty stream',
          ttlMs: TTL_MS,
          expectedBranchId: 'root',
          expectedRevision: 0,
          expectedDigest: 'c'.repeat(64),
          expectedGeneration: 1,
        }),
      ),
    ).toBe('no-effective-branch');
  });

  it('records a machine-readable link from the candidate back to the lease that built it', async () => {
    await seedStream();
    const held = acquire();
    const candidate = build(held);

    // The reason is not prose. An abandoned candidate has to answer which
    // lease stranded it, and a sentence somebody wrote would not survive
    // that question.
    expect(readCandidateLeaseRef(candidate)).toEqual({
      leaseId: held.leaseId,
      fencingEpoch: held.fencingEpoch,
    });
    expect(candidate.reason).toContain('authorized rewind to turn 3');
    // A branch nobody built by correction names no lease.
    expect(
      readCandidateLeaseRef(branches().requireBranch(STREAM, 'root')),
    ).toBe(null);
  });

  it('leaves an abandoned candidate building and never effective when the lease expires', async () => {
    await seedStream();
    const held = acquire();
    const candidate = build(held);

    now += TTL_MS;

    // Expiry releases the stream. It does not promote, block, or delete
    // the candidate - the branch stands exactly as its builder left it,
    // and the lease it names is no longer live, which is the recorded
    // reason it stopped.
    expect(branches().requireBranch(STREAM, candidate.branchId).status).toBe(
      'building',
    );
    expect(branches().readEffectiveHead(STREAM)).toMatchObject({
      branchId: 'root',
      effectiveGeneration: 1,
    });
    expect(branches().readSupersessions(STREAM)).toEqual([]);
    expect(leases().readLiveLease(STREAM)).toBeNull();
    expect(readCandidateLeaseRef(candidate)?.leaseId).toBe(held.leaseId);
  });
});
