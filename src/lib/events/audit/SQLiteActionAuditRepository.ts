/**
 * SQLite action-audit repository (authority-audit PR 4, design D3).
 *
 * Borrowed-handle adapter over the v11 `action_audit` table. Append-once:
 * plain INSERT (never REPLACE); a matching retry returns the stored row;
 * a conflicting retry is a typed error and leaves the row unchanged.
 * Published receipt identity stamps accepted rows exactly once.
 *
 * Server-internal only (design D2): no IAuthorizedViewer in this API.
 * Not wired into live intent/command paths; later PRs own that seam.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/audit-timeline/spec.md
 */

import type Database from 'better-sqlite3';

import {
  assertActionAuditInsert,
  hydrateActionAuditRow,
  isNonempty,
  isUniqueViolation,
  sameTerminalIdentity,
  type IActionAuditRow,
} from './actionAuditGuards';
import {
  ActionAuditError,
  type ActionAuditWriteResult,
  type IActionAuditInsert,
  type IActionAuditRecord,
  type IActionAuditRepository,
} from './IActionAuditRepository';

const ROW_COLUMNS = `command_id, campaign_session_id, match_id, stream_type, stream_id, command_digest, actor_principal_id, actor_participant_id, actor_role, lifecycle_state, safe_reason_code, correlation_id, created_at, updated_at, published_receipt_id, committed_first_revision, committed_last_revision, committed_event_count`;

const INSERT_SQL = `INSERT INTO action_audit (
  command_id, campaign_session_id, match_id, stream_type, stream_id,
  command_digest, actor_principal_id, actor_participant_id, actor_role,
  lifecycle_state, safe_reason_code, correlation_id, created_at, updated_at,
  published_receipt_id, committed_first_revision, committed_last_revision,
  committed_event_count
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`;

const PUBLISH_SQL = `UPDATE action_audit
  SET lifecycle_state = 'published', published_receipt_id = ?, updated_at = ?
  WHERE command_id = ?`;

export class SQLiteActionAuditRepository implements IActionAuditRepository {
  public constructor(private readonly db: Database.Database) {}

  /**
   * Records one already-terminal lifecycle. Matching identity returns the
   * stored row; a different digest or terminal state is identity-conflict.
   */
  public recordLifecycle(input: IActionAuditInsert): ActionAuditWriteResult {
    assertActionAuditInsert(input);
    return this.db.transaction((): ActionAuditWriteResult => {
      const existing = this.load(input.commandId);
      if (existing !== null) {
        if (!sameTerminalIdentity(existing, input)) {
          throw new ActionAuditError(
            'identity-conflict',
            'A conflicting action-audit record already occupies this command identity',
          );
        }
        return { kind: 'existing' as const, record: existing };
      }
      try {
        this.insertRow(input);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const raced = this.load(input.commandId);
        if (raced !== null && sameTerminalIdentity(raced, input)) {
          return { kind: 'existing' as const, record: raced };
        }
        throw new ActionAuditError(
          'identity-conflict',
          'A conflicting action-audit record already occupies this command identity',
        );
      }
      const created = this.load(input.commandId);
      if (created === null) {
        throw new ActionAuditError(
          'invalid-record',
          'Action-audit insert did not persist',
        );
      }
      return { kind: 'created' as const, record: created };
    })();
  }

  /**
   * Stamps published receipt identity on an accepted row exactly once.
   * Same value is idempotent; a different value is receipt-conflict.
   */
  public linkPublishedReceipt(
    commandId: string,
    publishedReceiptId: string,
    stampedAt: string,
  ): ActionAuditWriteResult {
    if (!isNonempty(commandId) || !isNonempty(publishedReceiptId)) {
      throw new ActionAuditError(
        'invalid-record',
        'Published receipt identity requires a nonempty command id and receipt id',
      );
    }
    if (!isNonempty(stampedAt)) {
      throw new ActionAuditError(
        'invalid-record',
        'Published receipt identity requires a nonempty stamp time',
      );
    }
    return this.db.transaction((): ActionAuditWriteResult => {
      const existing = this.load(commandId);
      if (existing === null) {
        throw new ActionAuditError(
          'not-found',
          'No action-audit record exists for this command identity',
        );
      }
      if (existing.lifecycleState === 'published') {
        if (existing.publishedReceiptId === publishedReceiptId) {
          return { kind: 'existing' as const, record: existing };
        }
        throw new ActionAuditError(
          'receipt-conflict',
          'Published receipt identity does not match the stored stamp',
        );
      }
      if (existing.lifecycleState !== 'accepted') {
        throw new ActionAuditError(
          'not-accepted',
          'Only an accepted action-audit record may stamp a published receipt',
        );
      }
      this.db
        .prepare(PUBLISH_SQL)
        .run(publishedReceiptId, stampedAt, commandId);
      const stamped = this.load(commandId);
      if (stamped === null) {
        throw new ActionAuditError(
          'invalid-record',
          'Action-audit publish stamp did not persist',
        );
      }
      return { kind: 'created' as const, record: stamped };
    })();
  }

  /** Loads one row by global command identity, or null when absent. */
  public readByCommandId(commandId: string): IActionAuditRecord | null {
    if (!isNonempty(commandId)) return null;
    return this.load(commandId);
  }

  /** Loads every row for a campaign session, oldest-first then command id. */
  public readBySession(
    campaignSessionId: string,
  ): readonly IActionAuditRecord[] {
    if (!isNonempty(campaignSessionId)) return [];
    const rows = this.db
      .prepare(
        `SELECT ${ROW_COLUMNS} FROM action_audit
         WHERE campaign_session_id = ?
         ORDER BY created_at ASC, command_id ASC`,
      )
      .all(campaignSessionId) as IActionAuditRow[];
    return Object.freeze(rows.map((row) => hydrateActionAuditRow(row)));
  }

  /** SELECT by primary key; returns null when the identity is absent. */
  private load(commandId: string): IActionAuditRecord | null {
    const row = this.db
      .prepare(`SELECT ${ROW_COLUMNS} FROM action_audit WHERE command_id = ?`)
      .get(commandId) as IActionAuditRow | undefined;
    return row === undefined ? null : hydrateActionAuditRow(row);
  }

  /** Inserts one validated terminal row; published_receipt_id stays null. */
  private insertRow(input: IActionAuditInsert): void {
    this.db
      .prepare(INSERT_SQL)
      .run(
        input.commandId,
        input.campaignSessionId,
        input.matchId,
        input.streamType,
        input.streamId,
        input.commandDigest,
        input.actor.principalId,
        input.actor.participantId,
        input.actor.role,
        input.lifecycleState,
        input.safeReasonCode,
        input.correlationId,
        input.createdAt,
        input.createdAt,
        input.committedFirstRevision,
        input.committedLastRevision,
        input.committedEventCount,
      );
  }
}
