import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SQLiteService } from '@/services/persistence/SQLiteService';

import type { IEventHistoryBranch } from '../EventHistoryBranchContract';

import {
  EventHistoryBranchError,
  PRODUCTION_BRANCH_CREATION_SEAM,
  _branchCreationSeamForTests,
} from '../EventHistoryBranchContract';
import {
  EXPECTED_HEAD_RESYNC_ACTION,
  readActiveBranchHead,
  validateExpectedBranchHead,
} from '../EventHistoryExpectedHead';
import { SQLiteEventHistoryBranchStore } from '../SQLiteEventHistoryBranchStore';

const STREAM = { streamType: 'match', streamId: 'stream-1' } as const;
const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const HEAD_REVISION = 4;

describe('EventHistoryExpectedHead', () => {
  let dir: string;
  let service: SQLiteService;
  let db: Database.Database;
  let store: SQLiteEventHistoryBranchStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'event-history-expected-head-'));
    service = new SQLiteService({ path: path.join(dir, 'branches.db') });
    service.initialize();
    db = service.getDatabase();
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('match', 'stream-1', 'root', ?, ?)`,
    ).run(HEAD_REVISION, DIGEST_A);
    store = new SQLiteEventHistoryBranchStore(
      db,
      _branchCreationSeamForTests(),
    );
    store.backfillGenesisBranches();
  });

  afterEach(async () => {
    service.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function candidate(): IEventHistoryBranch {
    return {
      ...STREAM,
      branchId: 'candidate-1',
      parentBranchId: 'root',
      ancestorDepth: 1,
      baseRevision: 2,
      baseEventId: 'root#2',
      baseDigest: DIGEST_B,
      status: 'building',
      createdBy: 'gm-1',
      reason: 'authorized rewind',
      createdAt: '2026-09-02T00:00:00.000Z',
    };
  }

  /** Everything a refusal must leave untouched. */
  function snapshot(): unknown {
    return {
      branches: db
        .prepare(
          `SELECT branch_id, status FROM event_history_branches ORDER BY branch_id`,
        )
        .all(),
      heads: db.prepare(`SELECT * FROM event_history_effective_heads`).all(),
      supersessions: db
        .prepare(`SELECT * FROM event_history_supersessions`)
        .all(),
      events: db
        .prepare(`SELECT COUNT(*) AS count FROM event_journal_events`)
        .get(),
    };
  }

  function validate(
    branchId: string,
    revision: number,
    effectiveGeneration = 1,
  ) {
    return validateExpectedBranchHead(store, STREAM, HEAD_REVISION, {
      branchId,
      revision,
      effectiveGeneration,
    });
  }

  it('reads the active head from the effective branch and the stream revision', () => {
    expect(readActiveBranchHead(store, STREAM, HEAD_REVISION)).toEqual({
      branchId: 'root',
      revision: HEAD_REVISION,
      effectiveGeneration: 1,
    });
    // A stream with no effective branch refuses rather than guessing root.
    expect(() =>
      readActiveBranchHead(
        store,
        { streamType: 'match', streamId: 'absent' },
        0,
      ),
    ).toThrow(EventHistoryBranchError);
  });

  it('accepts a command that names the current effective head', () => {
    const verdict = validate('root', HEAD_REVISION);
    expect(verdict).toEqual({
      kind: 'current',
      activeHead: {
        branchId: 'root',
        revision: HEAD_REVISION,
        effectiveGeneration: 1,
      },
    });
  });

  it('refuses a superseded branch with STALE_BRANCH, the active head, and a resync action', () => {
    // Promote the candidate the way PR 2's activation will, so the root is
    // genuinely superseded rather than merely non-effective.
    store.createBranch(candidate());
    store.transitionBranchStatus(STREAM, 'root', 'superseded');
    store.transitionBranchStatus(STREAM, 'candidate-1', 'effective');
    db.prepare(
      `UPDATE event_history_effective_heads
         SET branch_id = 'candidate-1', effective_generation = 2
       WHERE stream_id = 'stream-1'`,
    ).run();

    const before = snapshot();
    const verdict = validate('root', HEAD_REVISION, 1);
    expect(verdict).toEqual({
      kind: 'refused',
      code: 'STALE_BRANCH',
      namedBranchStatus: 'superseded',
      activeHead: {
        branchId: 'candidate-1',
        revision: HEAD_REVISION,
        effectiveGeneration: 2,
      },
      resyncAction: EXPECTED_HEAD_RESYNC_ACTION,
    });
    // The SHALL is "append nothing": validation is a read.
    expect(snapshot()).toEqual(before);
  });

  it('refuses a non-effective or unknown branch with STALE_BRANCH', () => {
    store.createBranch(candidate());
    const before = snapshot();

    // A building candidate is not somewhere a command may land.
    const building = validate('candidate-1', HEAD_REVISION);
    expect(building).toMatchObject({
      kind: 'refused',
      code: 'STALE_BRANCH',
      namedBranchStatus: 'building',
      activeHead: { branchId: 'root' },
    });
    // A branch that does not exist is stale, not a crash - a client that
    // reconnects with a branch id this server never had gets told to
    // resync like any other stale client.
    expect(validate('ghost', HEAD_REVISION)).toMatchObject({
      kind: 'refused',
      code: 'STALE_BRANCH',
      namedBranchStatus: null,
      activeHead: { branchId: 'root' },
    });
    expect(snapshot()).toEqual(before);
  });

  it('separates a stale revision and a stale generation from a stale branch', () => {
    const before = snapshot();
    expect(validate('root', HEAD_REVISION - 1)).toMatchObject({
      kind: 'refused',
      code: 'STALE_REVISION',
      activeHead: { branchId: 'root', revision: HEAD_REVISION },
    });
    expect(validate('root', HEAD_REVISION + 1)).toMatchObject({
      kind: 'refused',
      code: 'STALE_REVISION',
    });
    expect(validate('root', HEAD_REVISION, 2)).toMatchObject({
      kind: 'refused',
      code: 'STALE_GENERATION',
      activeHead: { effectiveGeneration: 1 },
    });
    expect(snapshot()).toEqual(before);
  });

  it('validates without enabling branch creation in production', () => {
    // The production seam is the one a production surface gets, and it
    // refuses. Validation needs no creation capability at all.
    expect(PRODUCTION_BRANCH_CREATION_SEAM.allowsBranchCreation).toBe(false);
    const production = new SQLiteEventHistoryBranchStore(db);
    const before = snapshot();

    expect(
      validateExpectedBranchHead(production, STREAM, HEAD_REVISION, {
        branchId: 'root',
        revision: HEAD_REVISION,
        effectiveGeneration: 1,
      }),
    ).toMatchObject({ kind: 'current' });
    expect(
      validateExpectedBranchHead(production, STREAM, HEAD_REVISION, {
        branchId: 'candidate-1',
        revision: HEAD_REVISION,
        effectiveGeneration: 1,
      }),
    ).toMatchObject({ code: 'STALE_BRANCH' });
    expect(() => production.createBranch(candidate())).toThrow(
      /Branch creation is disabled/,
    );
    expect(snapshot()).toEqual(before);
  });
});
