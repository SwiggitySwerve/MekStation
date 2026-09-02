/**
 * SQLite branch, effective-head, and supersession store
 * (add-authoritative-history-branches tasks 1.1 / 1.2; design D1).
 *
 * Borrowed-handle adapter, the same idiom as `SQLiteEventJournal` and
 * `SQLiteReplayCheckpointRepository`: it never opens or migrates a
 * database, only reads and writes the three tables migration 23 created.
 *
 * Three things this store is careful about:
 *
 * - **Backfill reads a generation; it never computes one.** The SQL is the
 *   migration's own `EVENT_HISTORY_GENESIS_BACKFILL_SQL`, shared rather
 *   than restated, so the migration-time and runtime backfills cannot
 *   drift into two different definitions of "genesis". Both statements are
 *   `NOT EXISTS`-guarded, so re-running after a cold reopen inserts
 *   nothing and rewrites nothing.
 * - **Every refusal is typed.** A caller that asks for an illegal ancestry,
 *   an illegal status move, a duplicate identity, or a second effective
 *   branch gets an `EventHistoryBranchError` carrying the code - never a
 *   raw SQLite constraint error naming a column, and never a silent no-op
 *   that leaves the caller believing the write landed.
 * - **Creation is a capability, not a flag.** `createBranch` refuses
 *   unless it was constructed with a seam that permits it, and the default
 *   seam does not. Production surfaces stay genesis-only until PR 2's
 *   authorized build path exists.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import {
  isSqliteUniqueConstraintError,
  sqliteConstraintMessage,
} from '@/services/persistence/sqliteConstraintErrors';
import { EVENT_HISTORY_GENESIS_BACKFILL_SQL } from '@/services/persistence/SQLiteService.historyBranches.migration';

import type {
  EventHistoryBranchStatus,
  IBranchCreationSeam,
  IEventHistoryBranch,
  IEventHistoryEffectiveHead,
  IEventHistoryStreamRef,
  IEventHistorySupersession,
} from './EventHistoryBranchContract';

import {
  EventHistoryBranchError,
  PRODUCTION_BRANCH_CREATION_SEAM,
  assertLegalBranchStatusTransition,
  assertValidBranchRecord,
} from './EventHistoryBranchContract';

const BRANCH_COLUMNS = `stream_type AS streamType, stream_id AS streamId, branch_id AS branchId, parent_branch_id AS parentBranchId, ancestor_depth AS ancestorDepth, base_revision AS baseRevision, base_event_id AS baseEventId, base_digest AS baseDigest, status, created_by AS createdBy, reason, created_at AS createdAt`;
const HEAD_COLUMNS = `stream_type AS streamType, stream_id AS streamId, branch_id AS branchId, effective_generation AS effectiveGeneration, installed_at AS installedAt`;
const SUPERSESSION_COLUMNS = `stream_type AS streamType, stream_id AS streamId, superseded_branch_id AS supersededBranchId, replacement_branch_id AS replacementBranchId, prior_generation AS priorGeneration, replacement_generation AS replacementGeneration, reason, recorded_at AS recordedAt`;

export class SQLiteEventHistoryBranchStore {
  public constructor(
    private readonly db: Database.Database,
    private readonly seam: IBranchCreationSeam = PRODUCTION_BRANCH_CREATION_SEAM,
  ) {}

  /**
   * Give every journal stream that has none a genesis/effective branch at
   * its stored generation. Returns how many streams were backfilled, which
   * is 0 on every call after the first.
   */
  public backfillGenesisBranches(): number {
    const before = this.streamCount();
    this.db.transaction(() => {
      this.db.exec(EVENT_HISTORY_GENESIS_BACKFILL_SQL);
    })();
    return this.streamCount() - before;
  }

  public readBranch(
    stream: IEventHistoryStreamRef,
    branchId: string,
  ): IEventHistoryBranch | null {
    const row = this.db
      .prepare(
        `SELECT ${BRANCH_COLUMNS} FROM event_history_branches
         WHERE stream_type = ? AND stream_id = ? AND branch_id = ?`,
      )
      .get(stream.streamType, stream.streamId, branchId) as
      | IEventHistoryBranch
      | undefined;
    return row ?? null;
  }

  /** The same read, refusing rather than returning null. */
  public requireBranch(
    stream: IEventHistoryStreamRef,
    branchId: string,
  ): IEventHistoryBranch {
    const branch = this.readBranch(stream, branchId);
    if (branch === null) {
      throw new EventHistoryBranchError(
        'unknown-branch',
        `Branch '${branchId}' does not exist in stream ${stream.streamType}/${stream.streamId}`,
      );
    }
    return branch;
  }

  public listBranches(
    stream: IEventHistoryStreamRef,
  ): readonly IEventHistoryBranch[] {
    return this.db
      .prepare(
        `SELECT ${BRANCH_COLUMNS} FROM event_history_branches
         WHERE stream_type = ? AND stream_id = ?
         ORDER BY ancestor_depth, branch_id`,
      )
      .all(stream.streamType, stream.streamId) as IEventHistoryBranch[];
  }

  public readEffectiveHead(
    stream: IEventHistoryStreamRef,
  ): IEventHistoryEffectiveHead | null {
    const row = this.db
      .prepare(
        `SELECT ${HEAD_COLUMNS} FROM event_history_effective_heads
         WHERE stream_type = ? AND stream_id = ?`,
      )
      .get(stream.streamType, stream.streamId) as
      | IEventHistoryEffectiveHead
      | undefined;
    return row ?? null;
  }

  /**
   * The effective head, refusing when the stream has none. A stream with
   * no effective branch has not been backfilled; answering with the root
   * anyway would invent an authority nobody installed.
   */
  public requireEffectiveHead(
    stream: IEventHistoryStreamRef,
  ): IEventHistoryEffectiveHead {
    const head = this.readEffectiveHead(stream);
    if (head === null) {
      throw new EventHistoryBranchError(
        'no-effective-branch',
        `Stream ${stream.streamType}/${stream.streamId} has no effective branch`,
      );
    }
    return head;
  }

  public readSupersessions(
    stream: IEventHistoryStreamRef,
  ): readonly IEventHistorySupersession[] {
    return this.db
      .prepare(
        `SELECT ${SUPERSESSION_COLUMNS} FROM event_history_supersessions
         WHERE stream_type = ? AND stream_id = ?
         ORDER BY prior_generation`,
      )
      .all(stream.streamType, stream.streamId) as IEventHistorySupersession[];
  }

  /**
   * Mint one branch. Refuses unless this store was constructed with a seam
   * that permits creation - production holds one that does not, so no
   * production surface can create a second branch before PR 2 lands the
   * authorized build path.
   */
  public createBranch(branch: IEventHistoryBranch): void {
    if (!this.seam.allowsBranchCreation) {
      throw new EventHistoryBranchError(
        'branch-creation-disabled',
        'Branch creation is disabled; production streams stay genesis-only',
      );
    }
    assertValidBranchRecord(branch);
    this.assertResolvableParent(branch);
    if (branch.status === 'effective') this.assertNoEffectiveBranch(branch);
    try {
      this.db
        .prepare(
          `INSERT INTO event_history_branches (
             stream_type, stream_id, branch_id, parent_branch_id,
             ancestor_depth, base_revision, base_event_id, base_digest,
             status, created_by, reason, created_at
           ) VALUES (
             @streamType, @streamId, @branchId, @parentBranchId,
             @ancestorDepth, @baseRevision, @baseEventId, @baseDigest,
             @status, @createdBy, @reason, @createdAt)`,
        )
        .run(branch);
    } catch (error) {
      throw this.classifyWriteFailure(error, branch.branchId);
    }
  }

  /**
   * Advance one branch's status along the legal transition table. The
   * table is stricter than the storage trigger's rank ladder, so an
   * illegal-but-climbing move (`blocked -> effective`) is refused here
   * before it ever reaches SQLite.
   */
  public transitionBranchStatus(
    stream: IEventHistoryStreamRef,
    branchId: string,
    to: EventHistoryBranchStatus,
  ): void {
    const current = this.requireBranch(stream, branchId);
    assertLegalBranchStatusTransition(current.status, to);
    if (to === 'effective') this.assertNoEffectiveBranch(stream);
    try {
      const result = this.db
        .prepare(
          `UPDATE event_history_branches SET status = ?
           WHERE stream_type = ? AND stream_id = ? AND branch_id = ?
             AND status = ?`,
        )
        .run(to, stream.streamType, stream.streamId, branchId, current.status);
      if (result.changes !== 1) {
        throw new EventHistoryBranchError(
          'illegal-status-transition',
          `Branch '${branchId}' moved out from under a '${current.status}' -> '${to}' transition`,
        );
      }
    } catch (error) {
      if (error instanceof EventHistoryBranchError) throw error;
      throw this.classifyWriteFailure(error, branchId);
    }
  }

  private streamCount(): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS streams FROM event_history_effective_heads`)
      .get() as { readonly streams: number };
    return row.streams;
  }

  /**
   * A child's parent must already exist in the SAME stream at exactly one
   * less depth. That is what makes the ancestry acyclic: depth strictly
   * increases along parentage, and lineage columns are immutable, so no
   * later write can bend an edge backwards.
   */
  private assertResolvableParent(branch: IEventHistoryBranch): void {
    if (branch.parentBranchId === null) return;
    const parent = this.readBranch(branch, branch.parentBranchId);
    if (parent === null || parent.ancestorDepth !== branch.ancestorDepth - 1) {
      throw new EventHistoryBranchError(
        'invalid-ancestry',
        `Branch '${branch.branchId}' names a parent '${branch.parentBranchId}' that does not resolve in this stream one depth above it`,
      );
    }
  }

  /**
   * Refuse a second effective branch BEFORE the write.
   *
   * The partial unique index is the constraint that actually holds - it
   * binds even a writer that never comes through this store. This check
   * exists so a caller that does come through gets the typed refusal that
   * names the rule, rather than a UNIQUE violation reporting two column
   * names that do not obviously mean "effective".
   */
  private assertNoEffectiveBranch(stream: IEventHistoryStreamRef): void {
    const existing = this.db
      .prepare(
        `SELECT branch_id AS branchId FROM event_history_branches
         WHERE stream_type = ? AND stream_id = ? AND status = 'effective'`,
      )
      .get(stream.streamType, stream.streamId) as
      | { readonly branchId: string }
      | undefined;
    if (existing === undefined) return;
    throw new EventHistoryBranchError(
      'duplicate-effective-branch',
      `Stream ${stream.streamType}/${stream.streamId} is already effective on branch '${existing.branchId}'; there may be only one`,
    );
  }

  /**
   * Turn a constraint violation into the typed refusal that names the rule
   * it broke, so no caller ever sees a raw SQLite error naming a column.
   */
  private classifyWriteFailure(
    error: unknown,
    branchId: string,
  ): EventHistoryBranchError {
    // ORDER MATTERS. `isSqliteUniqueConstraintError` is true for EVERY
    // `SQLITE_CONSTRAINT*` code - trigger aborts, CHECKs and foreign keys
    // included - so the specific shapes have to be recognised by message
    // first. Asking the unique predicate first would report a trigger
    // abort as a duplicate identity, which is a lie about which rule the
    // caller broke.
    const message = sqliteConstraintMessage(error);
    if (message.includes('same-stream and acyclic')) {
      return new EventHistoryBranchError('invalid-ancestry', message);
    }
    if (message.includes('status must advance monotonically')) {
      return new EventHistoryBranchError('illegal-status-transition', message);
    }
    if (message.includes('lineage is immutable')) {
      return new EventHistoryBranchError('invalid-branch-record', message);
    }
    if (message.includes('CHECK constraint failed')) {
      return new EventHistoryBranchError('invalid-branch-record', message);
    }
    if (message.includes('FOREIGN KEY constraint failed')) {
      return new EventHistoryBranchError('invalid-ancestry', message);
    }
    if (!isSqliteUniqueConstraintError(error)) {
      throw error;
    }
    if (message.includes('idx_event_history_branches_one_effective')) {
      return new EventHistoryBranchError(
        'duplicate-effective-branch',
        'This stream already has an effective branch; there may be only one',
      );
    }
    return new EventHistoryBranchError(
      'duplicate-branch',
      `A branch already occupies the identity slot '${branchId}'`,
    );
  }
}
