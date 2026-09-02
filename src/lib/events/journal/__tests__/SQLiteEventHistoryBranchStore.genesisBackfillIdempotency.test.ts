/**
 * Seam 2.4: a second genesis backfill must not invent a second root.
 * The store's existing row only asserts the return count; this census
 * is the digest that a silent INSERT OR IGNORE rewrite would still fail.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { sha256Sync } from '@/utils/events/hashUtils';

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);

interface IGenesisBranchRow {
  readonly stream_type: string;
  readonly stream_id: string;
  readonly branch_id: string;
  readonly base_digest: string;
  readonly status: string;
  readonly created_by: string;
  readonly created_at: string;
}

interface IGenesisHeadRow {
  readonly stream_type: string;
  readonly stream_id: string;
  readonly branch_id: string;
  readonly effective_generation: number;
  readonly installed_at: string;
}

function plain<T extends object>(row: T): T {
  return Object.assign({}, row);
}

function genesisCensus(): {
  readonly branchCount: number;
  readonly headCount: number;
  readonly branches: readonly IGenesisBranchRow[];
  readonly heads: readonly IGenesisHeadRow[];
  readonly digest: string;
} {
  const db = getSQLiteService().getDatabase();
  const branches = (
    db
      .prepare(
        `SELECT stream_type, stream_id, branch_id, base_digest, status,
                created_by, created_at
           FROM event_history_branches
          ORDER BY stream_type, stream_id, branch_id`,
      )
      .all() as IGenesisBranchRow[]
  ).map((row) => plain(row));
  const heads = (
    db
      .prepare(
        `SELECT stream_type, stream_id, branch_id, effective_generation,
                installed_at
           FROM event_history_effective_heads
          ORDER BY stream_type, stream_id`,
      )
      .all() as IGenesisHeadRow[]
  ).map((row) => plain(row));
  return {
    branchCount: branches.length,
    headCount: heads.length,
    branches,
    heads,
    digest: sha256Sync(JSON.stringify({ branches, heads })),
  };
}

describe('SQLiteEventHistoryBranchStore genesis backfill idempotency', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'genesis-backfill-idempotency-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'branches.db') }).initialize();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('leaves the same rows, count, and digests on a second backfill', () => {
    const db = getSQLiteService().getDatabase();
    const seedHead = db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('match', ?, 'root', ?, ?)`,
    );
    seedHead.run('stream-with-baseline', 7, DIGEST_A);
    seedHead.run('stream-without-baseline', 5, DIGEST_A);
    db.prepare(
      `INSERT INTO match_authority_baseline
         (stream_id, stream_type, branch_id, revision, digest,
          effective_generation, source, first_retained_revision, imported_at)
       VALUES (?, 'match', 'main', 4, ?, 3, 'retained-log', 0,
               '2026-09-01T00:00:00.000Z')`,
    ).run('stream-with-baseline', DIGEST_B);

    const store = new SQLiteEventHistoryBranchStore(db);
    expect(store.backfillGenesisBranches()).toBe(2);
    const afterFirst = genesisCensus();
    expect(afterFirst.branchCount).toBe(2);
    expect(afterFirst.headCount).toBe(2);

    expect(store.backfillGenesisBranches()).toBe(0);
    expect(genesisCensus()).toEqual(afterFirst);
  });
});
