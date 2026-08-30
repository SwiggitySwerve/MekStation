/**
 * SQLite private-record repository (authority-audit PR 5, design D4).
 *
 * Borrowed-handle adapter over the v12 private_record,
 * private_access_audit, and private_retention_state tables. Opaque refs
 * are minted here from crypto randomness. Lookups, includePrivate
 * export, erase, and redact recheck authorizeHumanAction kind
 * 'private-audit' and then require server-derived role gm.
 *
 * Server-internal only. Not wired into live intent, export, or
 * retention-job paths; later PRs own that seam.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import type Database from 'better-sqlite3';

import {
  isPrivateRetentionPolicy,
  PrivateRecordError,
  type IPrivateAccessAuditRecord,
  type IPrivateRecordAuthorizedCreate,
  type IPrivateRecordCreate,
  type IPrivateRecordEraseInput,
  type IPrivateRecordErasedView,
  type IPrivateRecordExportInput,
  type IPrivateRecordExportView,
  type IPrivateRecordLookupInput,
  type IPrivateRecordOpenView,
  type IPrivateRecordPrivateExportView,
  type IPrivateRecordRedactInput,
  type IPrivateRecordRepository,
  type IPrivateRecordView,
  type IPrivateRetentionConfig,
  type IPrivateRetentionRun,
} from './IPrivateRecordRepository';
import { PrivateRecordAccessLog } from './privateRecordAccess';
import {
  assertPrivateRecordCreate,
  generateOpaqueRef,
  hydrateAccessAuditRow,
  isNonempty,
  isUniqueViolation,
  parseStoredKind,
  parseStoredPayloadState,
  parseStoredRetentionClass,
  throwAccessDenied,
  type IPrivateAccessAuditRow,
  type IPrivateRecordRow,
} from './privateRecordGuards';

const RECORD_COLUMNS = `opaque_ref, campaign_session_id, command_id, record_kind, payload, payload_state, retention_class, created_at, updated_at`;

const INSERT_RECORD_SQL = `INSERT INTO private_record (
  opaque_ref, campaign_session_id, command_id, record_kind, payload,
  payload_state, retention_class, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, 'present', ?, ?, ?)`;

const ERASE_SQL = `UPDATE private_record
  SET payload_state = 'erased', payload = NULL, updated_at = ?
  WHERE opaque_ref = ?`;

const REDACT_SQL = `UPDATE private_record
  SET payload_state = 'redacted', payload = ?, updated_at = ?
  WHERE opaque_ref = ?`;

const MAX_REF_ATTEMPTS = 5;

export class SQLitePrivateRecordRepository implements IPrivateRecordRepository {
  private readonly access: PrivateRecordAccessLog;

  public constructor(private readonly db: Database.Database) {
    this.access = new PrivateRecordAccessLog(db);
  }

  /**
   * Inserts a present row and returns it, including the minted ref.
   * Duplicate payload is allowed; each call is a new handle. Ungated
   * because the caller supplied the payload; later PRs own who may call.
   */
  public createPrivateRecord(
    input: IPrivateRecordCreate,
  ): IPrivateRecordOpenView {
    assertPrivateRecordCreate(input);
    for (let attempt = 0; attempt < MAX_REF_ATTEMPTS; attempt += 1) {
      const opaqueRef = generateOpaqueRef();
      try {
        return this.insertPrivateRecord(input, opaqueRef);
      } catch (error) {
        if (isUniqueViolation(error)) continue;
        throw error;
      }
    }
    throw new PrivateRecordError(
      'invalid-record',
      'Private-record opaque ref mint collided repeatedly',
    );
  }

  /**
   * GM-only private write for a human GM surface. The membership check
   * happens before the insert, and the private row plus payload-free
   * granted audit row commit together. Direct server maintenance writes
   * retain `createPrivateRecord`; human preview producers use this path.
   */
  public async createAuthorizedPrivateRecord(
    input: IPrivateRecordAuthorizedCreate,
  ): Promise<IPrivateRecordOpenView> {
    assertPrivateRecordCreate(input);
    for (let attempt = 0; attempt < MAX_REF_ATTEMPTS; attempt += 1) {
      const opaqueRef = generateOpaqueRef();
      const viewer = await this.access.requireGmViewer(
        input,
        opaqueRef,
        'write',
      );
      if (viewer.campaignSessionId !== input.campaignSessionId) {
        this.access.insertDenied(
          input,
          viewer,
          opaqueRef,
          'write',
          'wrong-session',
        );
        throwAccessDenied();
      }
      try {
        return this.db.transaction(() => {
          const created = this.insertPrivateRecord(input, opaqueRef);
          this.access.insertGranted(input, viewer, opaqueRef, 'write');
          return created;
        })();
      } catch (error) {
        if (isUniqueViolation(error)) continue;
        throw error;
      }
    }
    throw new PrivateRecordError(
      'invalid-record',
      'Private-record opaque ref mint collided repeatedly',
    );
  }

  /**
   * GM-gated read. Denied lookups (no viewer, wrong scope, wrong role,
   * or absent) append a payload-free denied row and throw one identical
   * access-denied error so absence is not an oracle.
   */
  public async lookupPrivate(
    input: IPrivateRecordLookupInput,
  ): Promise<IPrivateRecordView> {
    const viewer = await this.access.requireGmViewer(
      input,
      input.opaqueRef,
      'lookup',
    );
    const record = this.load(input.opaqueRef);
    this.access.assertRecordVisible(
      input,
      viewer,
      record,
      'lookup',
      input.opaqueRef,
    );
    this.access.insertGranted(input, viewer, input.opaqueRef, 'lookup');
    return record;
  }

  /**
   * Default export omits the payload key entirely. includePrivate
   * requires the same gm gate and records export-attempt.
   */
  public async exportView(
    input: IPrivateRecordExportInput,
  ): Promise<
    IPrivateRecordExportView | IPrivateRecordPrivateExportView | null
  > {
    if (input.includePrivate !== true) {
      const row = this.loadRow(input.opaqueRef);
      if (row === null) return null;
      return Object.freeze({
        opaqueRef: row.opaque_ref,
        payloadState: parseStoredPayloadState(row.payload_state),
        recordKind: parseStoredKind(row.record_kind),
      });
    }
    const viewer = await this.access.requireGmViewer(
      input,
      input.opaqueRef,
      'export-attempt',
    );
    const row = this.loadRow(input.opaqueRef);
    const view = row === null ? null : this.toView(row);
    this.access.assertRecordVisible(
      input,
      viewer,
      view,
      'export-attempt',
      input.opaqueRef,
    );
    this.access.insertGranted(input, viewer, input.opaqueRef, 'export-attempt');
    if (view.payloadState === 'erased') {
      return Object.freeze({
        opaqueRef: view.opaqueRef,
        payloadState: view.payloadState,
        recordKind: view.recordKind,
        payload: null,
      });
    }
    return Object.freeze({
      opaqueRef: view.opaqueRef,
      payloadState: view.payloadState,
      recordKind: view.recordKind,
      payload: view.payload,
    });
  }

  /**
   * GM-gated present-to-erased transition. Does not touch action_audit
   * or journal tables. Second call is already-terminal.
   */
  public async erase(
    input: IPrivateRecordEraseInput,
  ): Promise<IPrivateRecordErasedView> {
    const viewer = await this.access.requireGmViewer(
      input,
      input.opaqueRef,
      'erasure',
    );
    const existing = this.load(input.opaqueRef);
    this.access.assertRecordVisible(
      input,
      viewer,
      existing,
      'erasure',
      input.opaqueRef,
    );
    if (existing.payloadState !== 'present') {
      this.access.insertDenied(
        input,
        viewer,
        input.opaqueRef,
        'erasure',
        'already-terminal',
      );
      throw new PrivateRecordError(
        'already-terminal',
        'Private record is already terminal',
      );
    }
    this.db.prepare(ERASE_SQL).run(input.occurredAt, input.opaqueRef);
    this.access.insertGranted(input, viewer, input.opaqueRef, 'erasure');
    const erased = this.load(input.opaqueRef);
    if (erased === null || erased.payloadState !== 'erased') {
      throw new PrivateRecordError(
        'invalid-record',
        'Private-record erase did not persist',
      );
    }
    return erased;
  }

  /**
   * GM-gated present-to-redacted transition with a nonempty replacement.
   * Identity columns stay pinned; action_audit is not rewritten.
   */
  public async redact(
    input: IPrivateRecordRedactInput,
  ): Promise<IPrivateRecordOpenView> {
    if (!isNonempty(input.replacement)) {
      throw new PrivateRecordError(
        'invalid-record',
        'Redaction replacement must be nonempty',
      );
    }
    const viewer = await this.access.requireGmViewer(
      input,
      input.opaqueRef,
      'redaction',
    );
    const existing = this.load(input.opaqueRef);
    this.access.assertRecordVisible(
      input,
      viewer,
      existing,
      'redaction',
      input.opaqueRef,
    );
    if (existing.payloadState !== 'present') {
      this.access.insertDenied(
        input,
        viewer,
        input.opaqueRef,
        'redaction',
        'already-terminal',
      );
      throw new PrivateRecordError(
        'already-terminal',
        'Private record is already terminal',
      );
    }
    this.db
      .prepare(REDACT_SQL)
      .run(input.replacement, input.occurredAt, input.opaqueRef);
    this.access.insertGranted(input, viewer, input.opaqueRef, 'redaction');
    const redacted = this.load(input.opaqueRef);
    if (redacted === null || redacted.payloadState !== 'redacted') {
      throw new PrivateRecordError(
        'invalid-record',
        'Private-record redact did not persist',
      );
    }
    return redacted;
  }

  /** Server-internal access log read for tests and later PRs. */
  public listAccessAudit(
    opaqueRef: string,
  ): readonly IPrivateAccessAuditRecord[] {
    if (!isNonempty(opaqueRef)) return [];
    const rows = this.db
      .prepare(
        `SELECT id, opaque_ref, actor_principal_id, actor_role, purpose,
                result, safe_reason_code, occurred_at
         FROM private_access_audit
         WHERE opaque_ref = ?
         ORDER BY id ASC`,
      )
      .all(opaqueRef) as IPrivateAccessAuditRow[];
    return Object.freeze(rows.map((row) => hydrateAccessAuditRow(row)));
  }

  /** Upserts retention policy for one closed class. Ungated config. */
  public configureRetention(input: IPrivateRetentionConfig): void {
    if (!isNonempty(input.configuredAt)) {
      throw new PrivateRecordError(
        'invalid-record',
        'Retention configuration requires a nonempty configuredAt',
      );
    }
    if (!isPrivateRetentionPolicy(input.policy)) {
      throw new PrivateRecordError(
        'invalid-record',
        'Retention policy is not a closed value',
      );
    }
    this.db
      .prepare(
        `INSERT INTO private_retention_state (retention_class, policy, configured_at)
         VALUES (?, ?, ?)
         ON CONFLICT(retention_class) DO UPDATE SET
           policy = excluded.policy,
           configured_at = excluded.configured_at`,
      )
      .run(input.retentionClass, input.policy, input.configuredAt);
  }

  /**
   * Erases present rows whose class policy is erase-on-expiry and whose
   * created_at is at or before cutoffAt. No clock reads; timestamps are
   * injected. Audited as retention-action with the job principal.
   */
  public runRetention(input: IPrivateRetentionRun): readonly string[] {
    if (
      !isNonempty(input.cutoffAt) ||
      !isNonempty(input.occurredAt) ||
      !isNonempty(input.actorPrincipalId)
    ) {
      throw new PrivateRecordError(
        'invalid-record',
        'Retention run requires nonempty cutoff, occurredAt, and actor principal',
      );
    }
    return this.db.transaction((): readonly string[] => {
      const rows = this.db
        .prepare(
          `SELECT ${RECORD_COLUMNS} FROM private_record
           WHERE payload_state = 'present'
             AND created_at <= ?
             AND retention_class IN (
               SELECT retention_class FROM private_retention_state
               WHERE policy = 'erase-on-expiry'
             )`,
        )
        .all(input.cutoffAt) as IPrivateRecordRow[];
      const erased: string[] = [];
      for (const row of rows) {
        this.db.prepare(ERASE_SQL).run(input.occurredAt, row.opaque_ref);
        this.access.insertAccessRow(
          row.opaque_ref,
          input.actorPrincipalId,
          null,
          'retention-action',
          'granted',
          null,
          input.occurredAt,
        );
        erased.push(row.opaque_ref);
      }
      return Object.freeze(erased);
    })();
  }

  /** SELECT by opaque ref; returns null when absent. */
  private load(opaqueRef: string): IPrivateRecordView | null {
    const row = this.loadRow(opaqueRef);
    return row === null ? null : this.toView(row);
  }

  /** Inserts one present record under an already-minted opaque ref. */
  private insertPrivateRecord(
    input: IPrivateRecordCreate,
    opaqueRef: string,
  ): IPrivateRecordOpenView {
    this.db
      .prepare(INSERT_RECORD_SQL)
      .run(
        opaqueRef,
        input.campaignSessionId,
        input.commandId,
        input.recordKind,
        input.payload,
        input.retentionClass,
        input.createdAt,
        input.createdAt,
      );
    const created = this.load(opaqueRef);
    if (created === null || created.payloadState === 'erased') {
      throw new PrivateRecordError(
        'invalid-record',
        'Private-record insert did not persist as present',
      );
    }
    return created;
  }

  /** Raw row load used by default export (no payload in the return shape). */
  private loadRow(opaqueRef: string): IPrivateRecordRow | null {
    if (!isNonempty(opaqueRef)) return null;
    const row = this.db
      .prepare(
        `SELECT ${RECORD_COLUMNS} FROM private_record WHERE opaque_ref = ?`,
      )
      .get(opaqueRef) as IPrivateRecordRow | undefined;
    return row === undefined ? null : row;
  }

  /**
   * Maps a stored row to the view. Erased rows omit the payload key.
   * Private to this class so payload cannot be returned ungated.
   */
  private toView(row: IPrivateRecordRow): IPrivateRecordView {
    const identity = {
      opaqueRef: row.opaque_ref,
      campaignSessionId: row.campaign_session_id,
      commandId: row.command_id,
      recordKind: parseStoredKind(row.record_kind),
      retentionClass: parseStoredRetentionClass(row.retention_class),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    const state = parseStoredPayloadState(row.payload_state);
    if (state === 'erased') {
      return Object.freeze({ ...identity, payloadState: 'erased' });
    }
    if (row.payload === null) {
      throw new PrivateRecordError(
        'invalid-record',
        'Stored private record payload is missing for a non-erased state',
      );
    }
    return Object.freeze({
      ...identity,
      payloadState: state,
      payload: row.payload,
    });
  }
}
