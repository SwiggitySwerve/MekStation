/**
 * Private-record gate and payload-free access-audit writes (PR 5).
 *
 * Every human lookup/export/erase/redact rechecks authorizeHumanAction
 * kind 'private-audit', then requires server-derived role gm. Access
 * rows never receive a payload column. Not a live-path chokepoint;
 * later PRs own wiring.
 */

import type Database from 'better-sqlite3';

import {
  isAuthorizedViewer,
  type IAuthorizedViewer,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import {
  authorizeHumanAction,
  isHumanActionAuthorizationError,
} from '@/lib/multiplayer/server/authorization/HumanActionAuthorizationGate';

import type {
  IPrivateRecordGateInput,
  IPrivateRecordView,
  PrivateAccessPurpose,
  PrivateAccessReasonCode,
  PrivateRecordActorRole,
} from './IPrivateRecordRepository';

import { isNonempty, throwAccessDenied } from './privateRecordGuards';

const INSERT_ACCESS_SQL = `INSERT INTO private_access_audit (
  opaque_ref, actor_principal_id, actor_role, purpose, result,
  safe_reason_code, occurred_at
) VALUES (?, ?, ?, ?, ?, ?, ?)`;

export class PrivateRecordAccessLog {
  public constructor(private readonly db: Database.Database) {}

  /**
   * Fresh gate pass plus gm role. Refusals append denied (when the
   * audit row would be legal) and throw one identical access-denied.
   * Infrastructure errors propagate unchanged.
   */
  public async requireGmViewer(
    input: IPrivateRecordGateInput,
    opaqueRef: string,
    purpose: PrivateAccessPurpose,
  ): Promise<IAuthorizedViewer> {
    let viewer: IAuthorizedViewer | null = null;
    try {
      viewer = await authorizeHumanAction(
        input.resolver,
        input.principalId,
        input.matchId,
        {
          kind: 'private-audit',
          streamType: 'private-audit',
          streamId: input.streamId ?? input.matchId,
        },
      );
    } catch (error) {
      if (isHumanActionAuthorizationError(error)) {
        this.insertDenied(input, null, opaqueRef, purpose, error.code);
        throwAccessDenied();
      }
      throw error;
    }
    if (!isAuthorizedViewer(viewer) || viewer.role !== 'gm') {
      this.insertDenied(
        input,
        isAuthorizedViewer(viewer) ? viewer : null,
        opaqueRef,
        purpose,
        isAuthorizedViewer(viewer) ? 'role-denied' : 'no-viewer',
      );
      throwAccessDenied();
    }
    return viewer;
  }

  /**
   * Absent rows and session mismatches share the public access-denied
   * error so neither existence nor content is disclosed.
   */
  public assertRecordVisible(
    input: IPrivateRecordGateInput,
    viewer: IAuthorizedViewer,
    record: IPrivateRecordView | null,
    purpose: PrivateAccessPurpose,
    opaqueRef: string,
  ): asserts record is IPrivateRecordView {
    if (record === null) {
      this.insertDenied(input, viewer, opaqueRef, purpose, 'not-found');
      throwAccessDenied();
    }
    if (record.campaignSessionId !== viewer.campaignSessionId) {
      this.insertDenied(input, viewer, opaqueRef, purpose, 'wrong-session');
      throwAccessDenied();
    }
  }

  /** Appends a granted access-audit row using viewer-derived actor fields. */
  public insertGranted(
    input: IPrivateRecordGateInput,
    viewer: IAuthorizedViewer,
    opaqueRef: string,
    purpose: PrivateAccessPurpose,
  ): void {
    this.insertAccessRow(
      opaqueRef,
      viewer.principalId,
      viewer.role,
      purpose,
      'granted',
      null,
      input.occurredAt,
    );
  }

  /** Appends a denied access-audit row when identity fields are storable. */
  public insertDenied(
    input: IPrivateRecordGateInput,
    viewer: IAuthorizedViewer | null,
    opaqueRef: string,
    purpose: PrivateAccessPurpose,
    reason: PrivateAccessReasonCode,
  ): void {
    const principalId = viewer?.principalId ?? input.principalId;
    const role: PrivateRecordActorRole | null = viewer?.role ?? null;
    if (
      !isNonempty(opaqueRef) ||
      !isNonempty(principalId) ||
      !isNonempty(input.occurredAt)
    ) {
      return;
    }
    this.insertAccessRow(
      opaqueRef,
      principalId,
      role,
      purpose,
      'denied',
      reason,
      input.occurredAt,
    );
  }

  /**
   * Inserts one access-audit row. Used by retention (job principal, null
   * role) as well as gated human actions. Cannot store payload.
   */
  public insertAccessRow(
    opaqueRef: string,
    actorPrincipalId: string,
    actorRole: PrivateRecordActorRole | null,
    purpose: PrivateAccessPurpose,
    result: 'granted' | 'denied',
    reason: PrivateAccessReasonCode | null,
    occurredAt: string,
  ): void {
    this.db
      .prepare(INSERT_ACCESS_SQL)
      .run(
        opaqueRef,
        actorPrincipalId,
        actorRole,
        purpose,
        result,
        reason,
        occurredAt,
      );
  }
}
