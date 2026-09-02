import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SQLiteService } from '@/services/persistence/SQLiteService';

import type {
  EventHistoryCorrectionLeaseErrorCode,
  ICorrectionLeaseRequest,
} from '../EventHistoryCorrectionLeaseContract';

import { EventHistoryCorrectionLeaseError } from '../EventHistoryCorrectionLeaseContract';
import { SQLiteEventHistoryBranchStore } from '../SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '../SQLiteEventHistoryCorrectionLeaseStore';

const HEAD_DIGEST = 'c'.repeat(64);
const OTHER_DIGEST = 'd'.repeat(64);
const STREAM = { streamType: 'match', streamId: 'stream-1' } as const;
const TTL_MS = 30_000;

function codeOf(
  run: () => unknown,
): EventHistoryCorrectionLeaseErrorCode | 'no-throw' {
  try {
    run();
  } catch (error) {
    if (error instanceof EventHistoryCorrectionLeaseError) return error.code;
    throw error;
  }
  return 'no-throw';
}

describe('SQLiteEventHistoryCorrectionLeaseStore', () => {
  let dir: string;
  let dbPath: string;
  let service: SQLiteService;
  let db: Database.Database;
  let now: number;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'correction-lease-store-'));
    dbPath = path.join(dir, 'leases.db');
    now = 1_000_000;
    service = new SQLiteService({ path: dbPath });
    service.initialize();
    db = service.getDatabase();
    seedStream(4);
  });

  afterEach(async () => {
    service.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /** A linear stream at `revision`, plus the genesis branch backfill. */
  function seedStream(revision: number): void {
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('match', 'stream-1', 'root', ?, ?)`,
    ).run(revision, HEAD_DIGEST);
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
  }

  /**
   * C1a plants a candidate head at the base it was cut from, so the
   * stream holds two `event_journal_stream_heads` rows. The PK scan
   * hits `candidate-1` before `root`; an unqualified read therefore
   * treats the lower revision as current and refuses the true head.
   */
  function seedCandidateHead(): void {
    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES ('match', 'stream-1', 'candidate-1', 'root', 1, 2, 'event-2', ?,
               'building', 'host-1', 'correction-rebuild:lease:1:rewind',
               '2026-09-02T00:00:00.000Z')`,
    ).run(OTHER_DIGEST);
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('match', 'stream-1', 'candidate-1', 2, ?)`,
    ).run(OTHER_DIGEST);
  }

  function leaseStore(): SQLiteEventHistoryCorrectionLeaseStore {
    return new SQLiteEventHistoryCorrectionLeaseStore(
      db,
      new SQLiteEventHistoryBranchStore(db),
      { nowMs: () => now },
    );
  }

  function request(
    overrides: Partial<ICorrectionLeaseRequest> = {},
  ): ICorrectionLeaseRequest {
    return {
      ...STREAM,
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'authorized rewind to turn 3',
      ttlMs: TTL_MS,
      expectedBranchId: 'root',
      expectedRevision: 4,
      expectedDigest: HEAD_DIGEST,
      expectedGeneration: 1,
      ...overrides,
    };
  }

  /** Everything the lease table holds for this stream, in epoch order. */
  function storedLeases(): unknown[] {
    return db
      .prepare(
        `SELECT lease_id AS leaseId, owner, fencing_epoch AS epoch,
                expires_at_ms AS expiresAtMs, state
         FROM event_history_correction_leases
         WHERE stream_id = 'stream-1' ORDER BY fencing_epoch`,
      )
      .all();
  }

  it('mints an opaque lease bound to the stream effective head', () => {
    const lease = leaseStore().acquireCorrectionLease(request());

    expect(lease.leaseId).toMatch(/^[0-9a-f]{32}$/);
    expect(lease.fencingEpoch).toBe(1);
    expect(lease.owner).toBe('host-1');
    expect(lease.actor).toBe('gm-1');
    expect(lease.expectedBranchId).toBe('root');
    expect(lease.expectedRevision).toBe(4);
    expect(lease.expectedDigest).toBe(HEAD_DIGEST);
    expect(lease.expectedGeneration).toBe(1);
    expect(lease.acquiredAtMs).toBe(now);
    expect(lease.expiresAtMs).toBe(now + TTL_MS);
    expect(lease.state).toBe('active');
    expect(leaseStore().readLiveLease(STREAM)).toEqual(lease);
  });

  it('refuses a lease bound to a head the stream does not hold, and stores nothing', () => {
    const store = leaseStore();
    // Each of the four bound facts is separately load-bearing: binding a
    // build to a head that is not current is exactly the silent-rebase the
    // design forbids.
    expect(
      codeOf(() =>
        store.acquireCorrectionLease(
          request({ expectedBranchId: 'candidate-1' }),
        ),
      ),
    ).toBe('stale-expected-head');
    expect(
      codeOf(() =>
        store.acquireCorrectionLease(request({ expectedRevision: 3 })),
      ),
    ).toBe('stale-expected-head');
    expect(
      codeOf(() =>
        store.acquireCorrectionLease(request({ expectedGeneration: 2 })),
      ),
    ).toBe('stale-expected-head');
    expect(
      codeOf(() =>
        store.acquireCorrectionLease(request({ expectedDigest: OTHER_DIGEST })),
      ),
    ).toBe('stale-expected-head');
    expect(storedLeases()).toEqual([]);
  });

  it('names which part of the head went stale rather than collapsing it to one conflict', () => {
    const store = leaseStore();
    const refusalOf = (overrides: Partial<ICorrectionLeaseRequest>): string => {
      try {
        store.acquireCorrectionLease(request(overrides));
      } catch (error) {
        if (error instanceof EventHistoryCorrectionLeaseError) {
          return error.staleHeadReason ?? 'none';
        }
      }
      return 'no-throw';
    };
    expect(refusalOf({ expectedBranchId: 'candidate-1' })).toBe('STALE_BRANCH');
    expect(refusalOf({ expectedRevision: 3 })).toBe('STALE_REVISION');
    expect(refusalOf({ expectedGeneration: 2 })).toBe('STALE_GENERATION');
    expect(refusalOf({ expectedDigest: OTHER_DIGEST })).toBe('STALE_DIGEST');
  });

  it('refuses a second lease while the first is still live, whoever asks', () => {
    const store = leaseStore();
    const first = store.acquireCorrectionLease(request());

    now += TTL_MS - 1;
    expect(
      codeOf(() => store.acquireCorrectionLease(request({ owner: 'host-2' }))),
    ).toBe('correction-lease-held');
    // Even the holder may not take a second lease: two live leases on one
    // stream is the state the fencing epoch exists to make impossible.
    expect(codeOf(() => store.acquireCorrectionLease(request()))).toBe(
      'correction-lease-held',
    );
    expect(storedLeases()).toEqual([
      {
        leaseId: first.leaseId,
        owner: 'host-1',
        epoch: 1,
        expiresAtMs: 1_000_000 + TTL_MS,
        state: 'active',
      },
    ]);
  });

  it('renews by extending the expiry and preserving the fencing epoch', () => {
    const store = leaseStore();
    const first = store.acquireCorrectionLease(request());

    now += 10_000;
    const renewed = store.renewCorrectionLease(STREAM, {
      leaseId: first.leaseId,
      owner: 'host-1',
      ttlMs: TTL_MS,
    });

    expect(renewed.fencingEpoch).toBe(first.fencingEpoch);
    expect(renewed.leaseId).toBe(first.leaseId);
    expect(renewed.expiresAtMs).toBe(now + TTL_MS);
    expect(renewed.acquiredAtMs).toBe(first.acquiredAtMs);
    // The renewal spent no epoch - there is still exactly one row.
    expect(storedLeases()).toHaveLength(1);

    // A renewal that would land BEFORE the current expiry is refused, not
    // clamped: silently keeping the longer expiry would tell the caller a
    // shortening it asked for had taken effect.
    expect(
      codeOf(() =>
        store.renewCorrectionLease(STREAM, {
          leaseId: first.leaseId,
          owner: 'host-1',
          ttlMs: 1,
        }),
      ),
    ).toBe('invalid-correction-lease-request');
    expect(store.readLiveLease(STREAM)?.expiresAtMs).toBe(now + TTL_MS);
  });

  it('refuses renewal by a stranger, for an unknown lease, or after expiry', () => {
    const store = leaseStore();
    const first = store.acquireCorrectionLease(request());
    const renewal = { leaseId: first.leaseId, owner: 'host-1', ttlMs: TTL_MS };

    expect(
      codeOf(() =>
        store.renewCorrectionLease(STREAM, { ...renewal, owner: 'host-2' }),
      ),
    ).toBe('stale-correction-lease');
    expect(
      codeOf(() =>
        store.renewCorrectionLease(STREAM, {
          ...renewal,
          leaseId: 'f'.repeat(32),
        }),
      ),
    ).toBe('stale-correction-lease');

    // Expiry is not a suggestion: a lapsed owner must re-acquire (and mint
    // a higher epoch), never quietly extend the lease it already lost.
    now += TTL_MS;
    expect(codeOf(() => store.renewCorrectionLease(STREAM, renewal))).toBe(
      'stale-correction-lease',
    );
    expect(storedLeases()).toEqual([
      {
        leaseId: first.leaseId,
        owner: 'host-1',
        epoch: 1,
        expiresAtMs: 1_000_000 + TTL_MS,
        state: 'active',
      },
    ]);
  });

  it('reaps an expired lease on takeover and mints a strictly higher epoch', () => {
    const store = leaseStore();
    const first = store.acquireCorrectionLease(request());

    now += TTL_MS;
    const second = store.acquireCorrectionLease(request({ owner: 'host-2' }));

    expect(second.fencingEpoch).toBe(first.fencingEpoch + 1);
    expect(second.leaseId).not.toBe(first.leaseId);
    // The reaped lease stays as evidence, marked expired - which is what
    // keeps epoch 1 spent forever.
    expect(storedLeases()).toEqual([
      {
        leaseId: first.leaseId,
        owner: 'host-1',
        epoch: 1,
        expiresAtMs: 1_000_000 + TTL_MS,
        state: 'expired',
      },
      {
        leaseId: second.leaseId,
        owner: 'host-2',
        epoch: 2,
        expiresAtMs: 1_000_000 + TTL_MS + TTL_MS,
        state: 'active',
      },
    ]);
    expect(store.readLiveLease(STREAM)?.leaseId).toBe(second.leaseId);
  });

  it('releases without spending an epoch and lets the next acquirer climb', () => {
    const store = leaseStore();
    const first = store.acquireCorrectionLease(request());
    store.releaseCorrectionLease(STREAM, {
      leaseId: first.leaseId,
      owner: 'host-1',
    });

    expect(store.readLiveLease(STREAM)).toBeNull();
    expect(
      codeOf(() =>
        store.releaseCorrectionLease(STREAM, {
          leaseId: first.leaseId,
          owner: 'host-1',
        }),
      ),
    ).toBe('stale-correction-lease');

    const second = store.acquireCorrectionLease(request({ owner: 'host-2' }));
    expect(second.fencingEpoch).toBe(2);
    expect(
      storedLeases().map((row) => (row as { state: string }).state),
    ).toEqual(['released', 'active']);
  });

  it('recovers the live lease, owner, and epoch across a cold reopen', () => {
    const acquired = leaseStore().acquireCorrectionLease(request());

    // Restart: close the handle and reopen the same file. Nothing about
    // the lease lives in process memory, which is what makes owner
    // recovery possible at all.
    service.close();
    service = new SQLiteService({ path: dbPath });
    service.initialize();
    db = service.getDatabase();

    const recovered = leaseStore().readLiveLease(STREAM);
    expect(recovered).toEqual(acquired);
    expect(
      leaseStore().requireLiveLease(STREAM, {
        leaseId: acquired.leaseId,
        owner: 'host-1',
        fencingEpoch: acquired.fencingEpoch,
      }),
    ).toEqual(acquired);
  });

  it('requires the resuming owner to present the id, owner, and epoch it holds', () => {
    const store = leaseStore();
    const first = store.acquireCorrectionLease(request());
    const held = {
      leaseId: first.leaseId,
      owner: 'host-1',
      fencingEpoch: first.fencingEpoch,
    };

    expect(
      codeOf(() =>
        store.requireLiveLease(STREAM, { ...held, leaseId: 'f'.repeat(32) }),
      ),
    ).toBe('stale-correction-lease');
    expect(
      codeOf(() =>
        store.requireLiveLease(STREAM, { ...held, owner: 'host-2' }),
      ),
    ).toBe('stale-correction-lease');
    expect(
      codeOf(() =>
        store.requireLiveLease(STREAM, { ...held, fencingEpoch: 2 }),
      ),
    ).toBe('stale-correction-lease');

    // After takeover the old owner is refused with the SAME code even
    // though its row still exists - the epoch it holds is no longer live.
    now += TTL_MS;
    const second = store.acquireCorrectionLease(request({ owner: 'host-2' }));
    expect(codeOf(() => store.requireLiveLease(STREAM, held))).toBe(
      'stale-correction-lease',
    );
    expect(
      store.requireLiveLease(STREAM, {
        leaseId: second.leaseId,
        owner: 'host-2',
        fencingEpoch: 2,
      }),
    ).toEqual(second);
  });

  it('reads an expired row as no live lease while still reporting it as the active one', () => {
    const store = leaseStore();
    const first = store.acquireCorrectionLease(request());

    now += TTL_MS;
    // The row is still `active` - nobody reaped it. `readLiveLease` is the
    // domain question ("may this owner still rebuild?") and answers no;
    // `readActiveLease` is the storage question and still sees the row.
    expect(store.readLiveLease(STREAM)).toBeNull();
    expect(store.readActiveLease(STREAM)?.leaseId).toBe(first.leaseId);
  });

  it('refuses a malformed request without touching storage', () => {
    const store = leaseStore();
    for (const override of [
      { owner: '  ' },
      { actor: '' },
      { reason: '' },
      { ttlMs: 0 },
      { ttlMs: -1 },
      { ttlMs: 1.5 },
      { expectedDigest: 'c'.repeat(63) },
      { expectedRevision: -1 },
      { expectedGeneration: 0 },
    ] as Partial<ICorrectionLeaseRequest>[]) {
      expect(
        codeOf(() => store.acquireCorrectionLease(request(override))),
      ).toBe('invalid-correction-lease-request');
    }
    expect(storedLeases()).toEqual([]);
  });

  it('acquires a lease bound to the true head when a candidate head row sits below it', () => {
    seedCandidateHead();
    const lease = leaseStore().acquireCorrectionLease(request());
    expect(lease.expectedBranchId).toBe('root');
    expect(lease.expectedRevision).toBe(4);
    expect(lease.expectedDigest).toBe(HEAD_DIGEST);
    expect(lease.state).toBe('active');
  });

  it('refuses a lease bound to the candidate digest as STALE_DIGEST', () => {
    seedCandidateHead();
    try {
      leaseStore().acquireCorrectionLease(
        request({ expectedDigest: OTHER_DIGEST }),
      );
      throw new Error('expected STALE_DIGEST');
    } catch (error) {
      if (!(error instanceof EventHistoryCorrectionLeaseError)) throw error;
      expect(error.staleHeadReason).toBe('STALE_DIGEST');
    }
  });
});
