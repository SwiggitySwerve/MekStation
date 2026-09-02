import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SQLiteService } from '@/services/persistence/SQLiteService';
import { EVENT_HISTORY_GENESIS_DIGEST_LITERAL } from '@/services/persistence/SQLiteService.historyBranches.migration';
import { sha256Sync } from '@/utils/events/hashUtils';

import type {
  EventHistoryBranchErrorCode,
  IEventHistoryBranch,
} from '../EventHistoryBranchContract';

import {
  EVENT_HISTORY_BRANCH_STATUS_RANK,
  EVENT_HISTORY_BRANCH_STATUSES,
  EVENT_HISTORY_BRANCH_TRANSITIONS,
  EVENT_HISTORY_GENESIS_DIGEST,
  EventHistoryBranchError,
  PRODUCTION_BRANCH_CREATION_SEAM,
  _branchCreationSeamForTests,
  assertLegalBranchStatusTransition,
} from '../EventHistoryBranchContract';
import { canonicalizeJsonV1 } from '../EventJournalCanonicalizer';
import { SQLiteEventHistoryBranchStore } from '../SQLiteEventHistoryBranchStore';

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const STREAM = { streamType: 'match', streamId: 'stream-1' } as const;

function codeOf(run: () => unknown): EventHistoryBranchErrorCode | 'no-throw' {
  try {
    run();
  } catch (error) {
    if (error instanceof EventHistoryBranchError) return error.code;
    throw error;
  }
  return 'no-throw';
}

describe('SQLiteEventHistoryBranchStore', () => {
  let dir: string;
  let service: SQLiteService;
  let db: Database.Database;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'event-history-branch-store-'));
    service = new SQLiteService({ path: path.join(dir, 'branches.db') });
    service.initialize();
    db = service.getDatabase();
  });

  afterEach(async () => {
    service.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function seedStream(streamId: string, streamRevision: number): void {
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('match', ?, 'root', ?, ?)`,
    ).run(streamId, streamRevision, DIGEST_A);
  }

  function seedBaseline(streamId: string, effectiveGeneration: number): void {
    db.prepare(
      `INSERT INTO match_authority_baseline
         (stream_id, stream_type, branch_id, revision, digest,
          effective_generation, source, first_retained_revision, imported_at)
       VALUES (?, 'match', 'main', 4, ?, ?, 'retained-log', 0,
               '2026-09-01T00:00:00.000Z')`,
    ).run(streamId, DIGEST_B, effectiveGeneration);
  }

  function store(allowCreation = false): SQLiteEventHistoryBranchStore {
    return new SQLiteEventHistoryBranchStore(
      db,
      allowCreation
        ? _branchCreationSeamForTests()
        : PRODUCTION_BRANCH_CREATION_SEAM,
    );
  }

  function child(
    overrides: Partial<IEventHistoryBranch> = {},
  ): IEventHistoryBranch {
    return {
      ...STREAM,
      branchId: 'candidate-1',
      parentBranchId: 'root',
      ancestorDepth: 1,
      baseRevision: 3,
      baseEventId: 'event-3',
      baseDigest: DIGEST_B,
      status: 'building',
      createdBy: 'gm-1',
      reason: 'authorized rewind',
      createdAt: '2026-09-02T00:00:00.000Z',
      ...overrides,
    };
  }

  it('agrees with the migration and the storage trigger about the two pinned constants', () => {
    // The migration may not import from lib/, so it pins the genesis digest
    // as a hex literal. This is the proof the literal is still the
    // derivation and not a stale copy of one.
    expect(EVENT_HISTORY_GENESIS_DIGEST).toBe(
      sha256Sync(canonicalizeJsonV1([])),
    );
    expect(EVENT_HISTORY_GENESIS_DIGEST_LITERAL).toBe(
      EVENT_HISTORY_GENESIS_DIGEST,
    );

    // EVERY legal transition must also climb the storage trigger's ladder.
    // Driven off the real table rather than a restated copy: a transition
    // added later that descended the ladder would make the typed refusal
    // and the SQL constraint disagree about which moves are possible, and
    // a restated list would not notice.
    for (const from of EVENT_HISTORY_BRANCH_STATUSES) {
      for (const to of EVENT_HISTORY_BRANCH_TRANSITIONS[from]) {
        expect(EVENT_HISTORY_BRANCH_STATUS_RANK[to]).toBeGreaterThan(
          EVENT_HISTORY_BRANCH_STATUS_RANK[from],
        );
        expect(() => assertLegalBranchStatusTransition(from, to)).not.toThrow();
      }
    }
    expect(
      codeOf(() => assertLegalBranchStatusTransition('blocked', 'effective')),
    ).toBe('illegal-status-transition');
  });

  it('backfills one genesis effective branch per stream, preserving the stored generation, idempotently', () => {
    seedStream('stream-with-baseline', 7);
    seedStream('stream-without-baseline', 5);
    seedBaseline('stream-with-baseline', 3);

    const subject = store();
    expect(subject.backfillGenesisBranches()).toBe(2);
    // A second call is a no-op, not a second row and not a rewritten
    // generation.
    expect(subject.backfillGenesisBranches()).toBe(0);

    const withBaseline = {
      streamType: 'match',
      streamId: 'stream-with-baseline',
    };
    const without = {
      streamType: 'match',
      streamId: 'stream-without-baseline',
    };
    expect(subject.readBranch(withBaseline, 'root')).toEqual({
      ...withBaseline,
      branchId: 'root',
      parentBranchId: null,
      ancestorDepth: 0,
      baseRevision: 0,
      baseEventId: null,
      baseDigest: EVENT_HISTORY_GENESIS_DIGEST,
      status: 'effective',
      createdBy: 'migration',
      reason: expect.stringContaining('genesis'),
      createdAt: expect.any(String),
    });
    // Preserved, not reset to 1 and not derived from revision 7.
    expect(subject.requireEffectiveHead(withBaseline).effectiveGeneration).toBe(
      3,
    );
    // Absent a stored generation, 1 - and again not the revision 5.
    expect(subject.requireEffectiveHead(without).effectiveGeneration).toBe(1);
    expect(subject.requireEffectiveHead(without).branchId).toBe('root');
  });

  it('refuses to answer for a stream that has no effective branch', () => {
    expect(store().readEffectiveHead(STREAM)).toBeNull();
    expect(codeOf(() => store().requireEffectiveHead(STREAM))).toBe(
      'no-effective-branch',
    );
    expect(codeOf(() => store().requireBranch(STREAM, 'root'))).toBe(
      'unknown-branch',
    );
  });

  it('keeps branch creation off in production and open only through the explicit seam', () => {
    seedStream('stream-1', 4);
    store().backfillGenesisBranches();

    expect(codeOf(() => store().createBranch(child()))).toBe(
      'branch-creation-disabled',
    );
    expect(
      store()
        .listBranches(STREAM)
        .map((b) => b.branchId),
    ).toEqual(['root']);

    const seamed = store(true);
    seamed.createBranch(child());
    expect(seamed.readBranch(STREAM, 'candidate-1')).toEqual(child());
  });

  it('refuses invalid ancestry and duplicate identity with typed codes', () => {
    seedStream('stream-1', 4);
    seedStream('stream-2', 4);
    const subject = store(true);
    subject.backfillGenesisBranches();

    expect(
      codeOf(() => subject.createBranch(child({ parentBranchId: 'ghost' }))),
    ).toBe('invalid-ancestry');
    expect(
      codeOf(() => subject.createBranch(child({ ancestorDepth: 2 }))),
    ).toBe('invalid-ancestry');
    expect(
      codeOf(() =>
        subject.createBranch(
          child({ branchId: 'loop', parentBranchId: 'loop' }),
        ),
      ),
    ).toBe('invalid-ancestry');
    // Same-stream rule: 'candidate-1' exists, but only in stream-1. A
    // second stream may not reach across and anchor to it.
    subject.createBranch(child());
    expect(
      codeOf(() =>
        subject.createBranch(
          child({
            streamType: 'match',
            streamId: 'stream-2',
            parentBranchId: 'candidate-1',
            branchId: 'candidate-2',
            ancestorDepth: 2,
          }),
        ),
      ),
    ).toBe('invalid-ancestry');
    // Root semantics.
    expect(
      codeOf(() =>
        subject.createBranch(
          child({ branchId: 'fake-root', parentBranchId: null }),
        ),
      ),
    ).toBe('invalid-branch-record');
    // Identity slot already taken.
    expect(codeOf(() => subject.createBranch(child()))).toBe(
      'duplicate-branch',
    );
    // Only one branch may be effective.
    expect(
      codeOf(() =>
        subject.createBranch(
          child({ branchId: 'candidate-3', status: 'effective' }),
        ),
      ),
    ).toBe('duplicate-effective-branch');
  });

  it('moves status only along the legal table and never backwards', () => {
    seedStream('stream-1', 4);
    const subject = store(true);
    subject.backfillGenesisBranches();
    subject.createBranch(child());

    subject.transitionBranchStatus(STREAM, 'candidate-1', 'waiting-effects');
    expect(subject.requireBranch(STREAM, 'candidate-1').status).toBe(
      'waiting-effects',
    );
    expect(
      codeOf(() =>
        subject.transitionBranchStatus(STREAM, 'candidate-1', 'building'),
      ),
    ).toBe('illegal-status-transition');
    subject.transitionBranchStatus(STREAM, 'candidate-1', 'blocked');
    // Blocked is terminal: the rank ladder would allow 'effective', the
    // domain does not.
    expect(
      codeOf(() =>
        subject.transitionBranchStatus(STREAM, 'candidate-1', 'effective'),
      ),
    ).toBe('illegal-status-transition');
    expect(subject.requireBranch(STREAM, 'candidate-1').status).toBe('blocked');
    expect(
      codeOf(() => subject.transitionBranchStatus(STREAM, 'ghost', 'blocked')),
    ).toBe('unknown-branch');
  });

  it('refuses to promote a second branch to effective', () => {
    seedStream('stream-1', 4);
    const subject = store(true);
    subject.backfillGenesisBranches();
    subject.createBranch(child());

    expect(
      codeOf(() =>
        subject.transitionBranchStatus(STREAM, 'candidate-1', 'effective'),
      ),
    ).toBe('duplicate-effective-branch');
    expect(subject.requireEffectiveHead(STREAM).branchId).toBe('root');
    expect(subject.requireBranch(STREAM, 'candidate-1').status).toBe(
      'building',
    );
  });

  it('reads supersession facts for a stream', () => {
    seedStream('stream-1', 4);
    const subject = store(true);
    subject.backfillGenesisBranches();
    subject.createBranch(child());
    db.prepare(
      `INSERT INTO event_history_supersessions
         (stream_type, stream_id, superseded_branch_id, replacement_branch_id,
          prior_generation, replacement_generation, reason, recorded_at)
       VALUES ('match', 'stream-1', 'root', 'candidate-1', 1, 2, 'rewind',
               '2026-09-02T00:00:00.000Z')`,
    ).run();

    expect(subject.readSupersessions(STREAM)).toEqual([
      {
        ...STREAM,
        supersededBranchId: 'root',
        replacementBranchId: 'candidate-1',
        priorGeneration: 1,
        replacementGeneration: 2,
        reason: 'rewind',
        recordedAt: '2026-09-02T00:00:00.000Z',
      },
    ]);
  });
});
