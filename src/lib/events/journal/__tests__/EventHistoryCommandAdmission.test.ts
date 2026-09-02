import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SQLiteService } from '@/services/persistence/SQLiteService';

import type { IExpectedBranchHead } from '../EventHistoryExpectedHead';

import {
  REBUILD_RETRY_ACTION,
  admitStreamCommand,
  readRebuildRefusal,
} from '../EventHistoryCommandAdmission';
import { SQLiteEventHistoryBranchStore } from '../SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '../SQLiteEventHistoryCorrectionLeaseStore';

const HEAD_DIGEST = 'c'.repeat(64);
const STREAM = { streamType: 'match', streamId: 'stream-1' } as const;
const HEAD_REVISION = 4;
const TTL_MS = 30_000;

describe('admitStreamCommand', () => {
  let dir: string;
  let service: SQLiteService;
  let db: Database.Database;
  let now: number;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'command-admission-'));
    now = 1_000_000;
    service = new SQLiteService({ path: path.join(dir, 'admission.db') });
    service.initialize();
    db = service.getDatabase();
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('match', 'stream-1', 'root', ?, ?)`,
    ).run(HEAD_REVISION, HEAD_DIGEST);
    branches().backfillGenesisBranches();
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

  /** The head an ordinary, up-to-date client names. */
  function current(
    overrides: Partial<IExpectedBranchHead> = {},
  ): IExpectedBranchHead {
    return {
      branchId: 'root',
      revision: HEAD_REVISION,
      effectiveGeneration: 1,
      ...overrides,
    };
  }

  function acquire(owner = 'host-1'): { leaseId: string; epoch: number } {
    const lease = leases().acquireCorrectionLease({
      ...STREAM,
      owner,
      actor: 'gm-1',
      reason: 'authorized rewind to turn 3',
      ttlMs: TTL_MS,
      expectedBranchId: 'root',
      expectedRevision: HEAD_REVISION,
      expectedDigest: HEAD_DIGEST,
      expectedGeneration: 1,
    });
    return { leaseId: lease.leaseId, epoch: lease.fencingEpoch };
  }

  function admit(
    expected: IExpectedBranchHead = current(),
  ): ReturnType<typeof admitStreamCommand> {
    return admitStreamCommand(
      branches(),
      leases(),
      STREAM,
      HEAD_REVISION,
      expected,
    );
  }

  /** Every durable row a refused command must not have touched. */
  function storageCensus(): Record<string, number> {
    const count = (table: string): number =>
      (
        db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as {
          readonly n: number;
        }
      ).n;
    return {
      events: count('event_journal_events'),
      branches: count('event_history_branches'),
      heads: count('event_history_effective_heads'),
      supersessions: count('event_history_supersessions'),
      leases: count('event_history_correction_leases'),
    };
  }

  it('names the live rebuild on its own, for a caller that has no expected head to compare', () => {
    // The combat wire carries no client-claimed head, so the command gate
    // there can consume only this arm. It is the SAME rule the full
    // admission runs first - extracted so the two cannot drift, not
    // restated for the caller that needs less.
    expect(
      readRebuildRefusal(branches(), leases(), STREAM, HEAD_REVISION),
    ).toBe(null);
    const { leaseId, epoch } = acquire();
    expect(
      readRebuildRefusal(branches(), leases(), STREAM, HEAD_REVISION),
    ).toEqual({
      kind: 'rebuilding',
      code: 'PROJECTION_REBUILDING',
      retryable: true,
      leaseId,
      owner: 'host-1',
      fencingEpoch: epoch,
      activeHead: {
        branchId: 'root',
        revision: HEAD_REVISION,
        effectiveGeneration: 1,
      },
      action: REBUILD_RETRY_ACTION,
    });
    // And the full admission answers with exactly what the extracted rule
    // produced - one rule, two callers.
    expect(admit()).toEqual(
      readRebuildRefusal(branches(), leases(), STREAM, HEAD_REVISION),
    );
  });

  it('admits a command that names the current head when no rebuild is running', () => {
    expect(admit()).toEqual({
      kind: 'admitted',
      activeHead: {
        branchId: 'root',
        revision: HEAD_REVISION,
        effectiveGeneration: 1,
      },
    });
  });

  it('refuses every command with PROJECTION_REBUILDING while a live lease rebuilds, naming the lease, owner, and epoch', () => {
    const { leaseId, epoch } = acquire();

    expect(admit()).toEqual({
      kind: 'rebuilding',
      code: 'PROJECTION_REBUILDING',
      retryable: true,
      leaseId,
      owner: 'host-1',
      fencingEpoch: epoch,
      activeHead: {
        branchId: 'root',
        revision: HEAD_REVISION,
        effectiveGeneration: 1,
      },
      action: REBUILD_RETRY_ACTION,
    });
  });

  it('reports the rebuild before staleness, so a client is not told to resync to a head about to be replaced', () => {
    acquire();
    // The client is BOTH stale and arriving mid-rebuild. Answering
    // STALE_BRANCH would send it to resync against a head that is about to
    // be superseded; the rebuild verdict is the one that is still true a
    // moment from now.
    expect(admit(current({ branchId: 'candidate-1' })).kind).toBe('rebuilding');
    expect(admit(current({ revision: 3 })).kind).toBe('rebuilding');
    expect(admit(current({ effectiveGeneration: 2 })).kind).toBe('rebuilding');
  });

  it('still refuses a stale head with the expected-head codes when no lease is live', () => {
    expect(admit(current({ branchId: 'candidate-1' }))).toMatchObject({
      kind: 'stale',
      code: 'STALE_BRANCH',
      resyncAction: 'resync-to-active-head',
    });
    expect(admit(current({ revision: 3 }))).toMatchObject({
      kind: 'stale',
      code: 'STALE_REVISION',
    });
    expect(admit(current({ effectiveGeneration: 2 }))).toMatchObject({
      kind: 'stale',
      code: 'STALE_GENERATION',
    });
  });

  it('refuses synchronously and queues nothing - the stream carries no trace of the refused commands', () => {
    acquire();
    const before = storageCensus();

    // Ten commands arrive mid-rebuild. Each gets its answer on the spot:
    // the verdict is the RETURN VALUE, so there is no handle a caller
    // could be holding while a queue drains later.
    const verdicts = Array.from({ length: 10 }, () => admit());
    expect(verdicts.every((verdict) => verdict.kind === 'rebuilding')).toBe(
      true,
    );
    // Not a thenable. A gate that handed back something to await would be
    // an invisible queue wearing a return type: the caller would block,
    // believing it had been accepted, until the rebuild finished.
    expect(
      verdicts.every(
        (verdict) =>
          typeof (verdict as { then?: unknown }).then === 'undefined',
      ),
    ).toBe(true);
    expect(storageCensus()).toEqual(before);

    // The lease lapses and the stream reopens. If any of the ten had been
    // parked, this is where it would surface - as an appended event, a
    // branch, or a lease row. Nothing does.
    now += TTL_MS;
    expect(admit().kind).toBe('admitted');
    expect(storageCensus()).toEqual(before);
  });

  it('admits again the moment the lease expires, without a write to release it', () => {
    acquire();
    const before = storageCensus();
    expect(admit().kind).toBe('rebuilding');

    now += TTL_MS;
    expect(admit().kind).toBe('admitted');
    // Release is by the clock, not by a write: no reaper ran, so the row
    // is still storage-`active`. A write-based release could fail and
    // leave the stream blocked forever; this one cannot fail.
    expect(storageCensus()).toEqual(before);
    expect(leases().readActiveLease(STREAM)?.state).toBe('active');
    expect(leases().readLiveLease(STREAM)).toBeNull();
  });

  it('moves the rebuild to the new epoch after a takeover and stops naming the old owner', () => {
    const first = acquire('host-1');
    now += TTL_MS;
    const second = acquire('host-2');

    expect(second.epoch).toBe(first.epoch + 1);
    expect(admit()).toMatchObject({
      kind: 'rebuilding',
      leaseId: second.leaseId,
      owner: 'host-2',
      fencingEpoch: second.epoch,
    });
  });
});
