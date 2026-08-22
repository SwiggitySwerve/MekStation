/**
 * Private-record insert/row guards (authority-audit PR 5).
 *
 * Closed-set and opaque-ref law live here so the SQLite adapter stays a
 * persistence seam. generateOpaqueRef uses crypto randomness only; it
 * MUST NOT read payload or command identity. Hydrators that include
 * payload are intentionally not exported: payload leaves storage only
 * through gated repository methods.
 */

import { randomBytes } from 'node:crypto';

import { isSqliteUniqueConstraintError } from '@/services/persistence/sqliteConstraintErrors';

import {
  isPrivateAccessPurpose,
  isPrivateAccessReasonCode,
  isPrivatePayloadState,
  isPrivateRecordActorRole,
  isPrivateRecordKind,
  isPrivateRetentionClass,
  PrivateRecordError,
  PRIVATE_RECORD_ACCESS_DENIED_CODE,
  PRIVATE_RECORD_ACCESS_DENIED_MESSAGE,
  type IPrivateAccessAuditRecord,
  type IPrivateRecordCreate,
  type PrivateAccessPurpose,
  type PrivateAccessReasonCode,
  type PrivatePayloadState,
  type PrivateRecordActorRole,
  type PrivateRecordKind,
  type PrivateRetentionClass,
} from './IPrivateRecordRepository';

export interface IPrivateRecordRow {
  readonly opaque_ref: string;
  readonly campaign_session_id: string;
  readonly command_id: string | null;
  readonly record_kind: string;
  readonly payload: string | null;
  readonly payload_state: string;
  readonly retention_class: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface IPrivateAccessAuditRow {
  readonly id: number;
  readonly opaque_ref: string;
  readonly actor_principal_id: string;
  readonly actor_role: string | null;
  readonly purpose: string;
  readonly result: string;
  readonly safe_reason_code: string | null;
  readonly occurred_at: string;
}

/** 32 to 64 lowercase hex chars; production mints 32. */
export const OPAQUE_REF_PATTERN = /^[0-9a-f]{32,64}$/;

/** True when a string has non-whitespace content. */
export function isNonempty(value: string): boolean {
  return value.trim().length > 0;
}

/** True for SQLite UNIQUE failures on this table's primary key. */
export function isUniqueViolation(error: unknown): boolean {
  return isSqliteUniqueConstraintError(error);
}

/**
 * Mints a 32-char lowercase hex ref from 16 cryptographically random
 * bytes. Constraint: never derived from payload, command id, or a hash.
 */
export function generateOpaqueRef(): string {
  return randomBytes(16).toString('hex');
}

/** Throws the single public denial used for absent-record and wrong-scope. */
export function throwAccessDenied(): never {
  throw new PrivateRecordError(
    PRIVATE_RECORD_ACCESS_DENIED_CODE,
    PRIVATE_RECORD_ACCESS_DENIED_MESSAGE,
  );
}

/**
 * Rejects creates that would violate identity, kind, class, or nonempty
 * payload so callers get typed invalid-record, not SQL.
 */
export function assertPrivateRecordCreate(input: IPrivateRecordCreate): void {
  assertNonempty(input.campaignSessionId);
  assertNonempty(input.createdAt);
  assertNonempty(input.payload);
  if (input.commandId !== null) assertNonempty(input.commandId);
  if (!isPrivateRecordKind(input.recordKind)) {
    throw new PrivateRecordError(
      'invalid-record',
      'Private record kind is not a closed value',
    );
  }
  if (!isPrivateRetentionClass(input.retentionClass)) {
    throw new PrivateRecordError(
      'invalid-record',
      'Private record retention class is not a closed value',
    );
  }
}

/** True when the stored opaque ref matches the required randomness shape. */
export function isOpaqueRef(value: string): boolean {
  return OPAQUE_REF_PATTERN.test(value);
}

/** Parses a stored kind; unknown values are corrupt storage. */
export function parseStoredKind(value: string): PrivateRecordKind {
  if (!isPrivateRecordKind(value)) {
    throw new PrivateRecordError(
      'invalid-record',
      'Stored private-record kind is not a known value',
    );
  }
  return value;
}

/** Parses a stored payload_state; unknown values are corrupt storage. */
export function parseStoredPayloadState(value: string): PrivatePayloadState {
  if (!isPrivatePayloadState(value)) {
    throw new PrivateRecordError(
      'invalid-record',
      'Stored private-record payload state is not a known value',
    );
  }
  return value;
}

/** Parses a stored retention class; unknown values are corrupt storage. */
export function parseStoredRetentionClass(
  value: string,
): PrivateRetentionClass {
  if (!isPrivateRetentionClass(value)) {
    throw new PrivateRecordError(
      'invalid-record',
      'Stored private-record retention class is not a known value',
    );
  }
  return value;
}

/** Hydrates a payload-free access-audit row. */
export function hydrateAccessAuditRow(
  row: IPrivateAccessAuditRow,
): IPrivateAccessAuditRecord {
  return Object.freeze({
    id: row.id,
    opaqueRef: row.opaque_ref,
    actorPrincipalId: row.actor_principal_id,
    actorRole: parseActorRole(row.actor_role),
    purpose: parsePurpose(row.purpose),
    result:
      row.result === 'granted' ? 'granted' : parseDeniedResult(row.result),
    safeReasonCode: parseReason(row.safe_reason_code),
    occurredAt: row.occurred_at,
  });
}

/** Throws invalid-record when a required identity string is blank. */
function assertNonempty(value: string): void {
  if (!isNonempty(value)) {
    throw new PrivateRecordError(
      'invalid-record',
      'Private-record identity fields must be nonempty',
    );
  }
}

/** Parses a stored actor role; unknown values are corrupt storage. */
function parseActorRole(value: string | null): PrivateRecordActorRole | null {
  if (value === null) return null;
  if (!isPrivateRecordActorRole(value)) {
    throw new PrivateRecordError(
      'invalid-record',
      'Stored private-access actor role is not a known role',
    );
  }
  return value;
}

/** Parses a stored purpose; unknown values are corrupt storage. */
function parsePurpose(value: string): PrivateAccessPurpose {
  if (!isPrivateAccessPurpose(value)) {
    throw new PrivateRecordError(
      'invalid-record',
      'Stored private-access purpose is not a known value',
    );
  }
  return value;
}

/** Parses the denied result literal; anything else is corrupt storage. */
function parseDeniedResult(value: string): 'denied' {
  if (value !== 'denied') {
    throw new PrivateRecordError(
      'invalid-record',
      'Stored private-access result is not a known value',
    );
  }
  return 'denied';
}

/** Parses a stored reason; unknown values are corrupt storage. */
function parseReason(value: string | null): PrivateAccessReasonCode | null {
  if (value === null) return null;
  if (!isPrivateAccessReasonCode(value)) {
    throw new PrivateRecordError(
      'invalid-record',
      'Stored private-access reason is not a known safe code',
    );
  }
  return value;
}
