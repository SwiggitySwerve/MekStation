import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import type { IEventHistoryBranch } from '../EventHistoryBranchContract';

import { _branchCreationSeamForTests } from '../EventHistoryBranchContract';
import { readDurableStreamRebuild } from '../EventHistoryDurableRebuild';
import { SQLiteEventHistoryBranchStore } from '../SQLiteEventHistoryBranchStore';

const STREAM = { streamType: 'match', streamId: 'stream-1' } as const;
const AT = '2026-09-02T00:00:00.000Z';
const ROOT_DIGEST = 'c'.repeat(64);
const CANDIDATE_DIGEST = 'd'.repeat(64);
const LIVE_LEASE_ID = 'a'.repeat(32);

describe('readDurableStreamRebuild', () => {
  let dir: string;
  let db: Database.Database;
  let branches: SQLiteEventHistoryBranchStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'durable-rebuild-head-'));
    resetSQLiteService();
    const service = getSQLiteService({ path: path.join(dir, 'rebuild.db') });
    service.initialize();
    db = service.getDatabase();
    branches = seedDualHeads(db);
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /**
   * C1a shape: root at revision 4 and a candidate head planted at the
   * base it was cut from. Inserted directly because migration 26 permits
   * several head rows on one stream, and the PK scan hits `candidate-1`
   * before `root` - which is why an unqualified read answers 2 today.
   */
  function seedDualHeads(
    handle: Database.Database,
  ): SQLiteEventHistoryBranchStore {
    handle
      .prepare(
        `INSERT INTO event_journal_stream_heads
           (stream_type, stream_id, branch_id, stream_revision, event_digest)
         VALUES ('match', 'stream-1', 'root', 4, ?)`,
      )
      .run(ROOT_DIGEST);
    const store = new SQLiteEventHistoryBranchStore(
      handle,
      _branchCreationSeamForTests(),
    );
    store.backfillGenesisBranches();
    store.createBranch(candidate());
    handle
      .prepare(
        `INSERT INTO event_journal_stream_heads
           (stream_type, stream_id, branch_id, stream_revision, event_digest)
         VALUES ('match', 'stream-1', 'candidate-1', 2, ?)`,
      )
      .run(CANDIDATE_DIGEST);
    return store;
  }

  function candidate(): IEventHistoryBranch {
    return {
      ...STREAM,
      branchId: 'candidate-1',
      parentBranchId: 'root',
      ancestorDepth: 1,
      baseRevision: 2,
      baseEventId: 'event-2',
      baseDigest: CANDIDATE_DIGEST,
      status: 'building',
      createdBy: 'host-1',
      reason: 'correction-rebuild:lease:1:rewind',
      createdAt: AT,
    };
  }

  /**
   * A live lease planted by INSERT, not acquire. R1 must not depend on
   * the lease store's own head read: that is R2/R3, and M3 leaves it
   * unqualified on purpose.
   */
  function plantLiveLease(): void {
    db.prepare(
      `INSERT INTO event_history_correction_leases (
         stream_type, stream_id, lease_id, owner, actor, reason,
         fencing_epoch, expected_branch_id, expected_revision,
         expected_digest, expected_generation, acquired_at_ms,
         expires_at_ms, state
       ) VALUES (
         'match', 'stream-1', ?, 'host-1', 'gm-1',
         'authorized rewind to turn 3', 1, 'root', 4, ?, 1,
         1, 4102444800000, 'active')`,
    ).run(LIVE_LEASE_ID, ROOT_DIGEST);
  }

  function pointEffectiveAtCandidate(): void {
    branches.transitionBranchStatus(STREAM, 'root', 'superseded');
    branches.transitionBranchStatus(STREAM, 'candidate-1', 'effective');
    db.prepare(
      `UPDATE event_history_effective_heads
         SET branch_id = 'candidate-1', effective_generation = 2
       WHERE stream_id = 'stream-1'`,
    ).run();
  }

  it('reports the effective head revision when a candidate head row sits below it', () => {
    plantLiveLease();
    expect(readDurableStreamRebuild(STREAM)?.activeHead.revision).toBe(4);
  });

  it('reports the candidate revision when that branch is the effective head', () => {
    pointEffectiveAtCandidate();
    plantLiveLease();
    expect(readDurableStreamRebuild(STREAM)?.activeHead.revision).toBe(2);
  });

  it('answers revision 0 when the effective branch has no head row at all', () => {
    // The fallback is the genesis answer, not a guess: a mutant that made
    // a missing row read as revision 1 survived every other row here, so
    // this one exists to say what 'nothing yet' means.
    plantLiveLease();
    db.prepare(
      `DELETE FROM event_journal_stream_heads WHERE stream_id = 'stream-1'`,
    ).run();
    expect(readDurableStreamRebuild(STREAM)?.activeHead.revision).toBe(0);
  });
});
