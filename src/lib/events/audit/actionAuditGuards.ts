/**
 * Action-audit insert/row guards (authority-audit PR 4).
 *
 * Closed-set and identity law live here so the SQLite adapter stays a
 * persistence seam. Safe reason codes are id-free; private free-text
 * belongs in PR 5 (design D4).
 */

import {
  ActionAuditError,
  isActionAuditActorRole,
  isActionAuditSafeReasonCode,
  type ActionAuditLifecycleState,
  type ActionAuditSafeReasonCode,
  type IActionAuditActor,
  type IActionAuditInsert,
  type IActionAuditRecord,
} from './IActionAuditRepository';

export interface IActionAuditRow {
  readonly command_id: string;
  readonly campaign_session_id: string;
  readonly match_id: string | null;
  readonly stream_type: string;
  readonly stream_id: string;
  readonly command_digest: string;
  readonly actor_principal_id: string;
  readonly actor_participant_id: string;
  readonly actor_role: string;
  readonly lifecycle_state: string;
  readonly safe_reason_code: string | null;
  readonly correlation_id: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly published_receipt_id: string | null;
  readonly committed_first_revision: number | null;
  readonly committed_last_revision: number | null;
  readonly committed_event_count: number | null;
}

const DIGEST = /^[0-9a-f]{64}$/;

/** True when a string has non-whitespace content. */
export function isNonempty(value: string): boolean {
  return value.trim().length > 0;
}

/** True for SQLite UNIQUE failures on this table's primary key. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error && /UNIQUE constraint failed/.test(error.message)
  );
}

/**
 * Rejects inserts that would violate identity, digest, range, or the
 * closed reason-code law so callers get typed invalid-record, not SQL.
 */
export function assertActionAuditInsert(input: IActionAuditInsert): void {
  assertNonempty(input.commandId);
  assertNonempty(input.campaignSessionId);
  assertNonempty(input.streamType);
  assertNonempty(input.streamId);
  assertNonempty(input.actor.principalId);
  assertNonempty(input.actor.participantId);
  assertNonempty(input.createdAt);
  if (input.matchId !== null) assertNonempty(input.matchId);
  if (input.correlationId !== null) assertNonempty(input.correlationId);
  if (!DIGEST.test(input.commandDigest)) {
    throw new ActionAuditError(
      'invalid-record',
      'Action-audit command digest must be 64 lowercase hex characters',
    );
  }
  if (!isActionAuditActorRole(input.actor.role)) {
    throw new ActionAuditError(
      'invalid-record',
      'Action-audit actor role must be a server-derived gm or player value',
    );
  }
  if (input.lifecycleState === 'accepted') {
    if (input.safeReasonCode !== null) {
      throw new ActionAuditError(
        'invalid-record',
        'Accepted action-audit records cannot carry a safe reason code',
      );
    }
    assertCommittedRange(
      input.committedFirstRevision,
      input.committedLastRevision,
      input.committedEventCount,
    );
    return;
  }
  if (
    input.committedFirstRevision !== null ||
    input.committedLastRevision !== null ||
    input.committedEventCount !== null
  ) {
    throw new ActionAuditError(
      'invalid-record',
      'Rejected, vetoed, and timed-out action-audit records cannot link a committed range',
    );
  }
  if (!reasonMatchesState(input.lifecycleState, input.safeReasonCode)) {
    throw new ActionAuditError(
      'invalid-record',
      'Safe reason code is not valid for this terminal lifecycle',
    );
  }
}

/**
 * True when the stored row is the same terminal identity as the retry
 * (session, stream, digest, actor, lifecycle, reason, correlation, range).
 */
export function sameTerminalIdentity(
  existing: IActionAuditRecord,
  input: IActionAuditInsert,
): boolean {
  return (
    existing.commandId === input.commandId &&
    existing.commandDigest === input.commandDigest &&
    existing.campaignSessionId === input.campaignSessionId &&
    existing.matchId === input.matchId &&
    existing.streamType === input.streamType &&
    existing.streamId === input.streamId &&
    existing.actor.principalId === input.actor.principalId &&
    existing.actor.participantId === input.actor.participantId &&
    existing.actor.role === input.actor.role &&
    existing.lifecycleState === input.lifecycleState &&
    existing.safeReasonCode === input.safeReasonCode &&
    existing.correlationId === input.correlationId &&
    existing.committedFirstRevision === input.committedFirstRevision &&
    existing.committedLastRevision === input.committedLastRevision &&
    existing.committedEventCount === input.committedEventCount
  );
}

/** Hydrates a row; throws if stored actor/reason/lifecycle are not closed. */
export function hydrateActionAuditRow(
  row: IActionAuditRow,
): IActionAuditRecord {
  const actor: IActionAuditActor = Object.freeze({
    principalId: row.actor_principal_id,
    participantId: row.actor_participant_id,
    role: parseActorRole(row.actor_role),
  });
  return Object.freeze({
    campaignSessionId: row.campaign_session_id,
    matchId: row.match_id,
    streamType: row.stream_type,
    streamId: row.stream_id,
    commandId: row.command_id,
    commandDigest: row.command_digest,
    actor,
    lifecycleState: parseLifecycle(row.lifecycle_state),
    safeReasonCode: parseSafeReason(row.safe_reason_code),
    correlationId: row.correlation_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedReceiptId: row.published_receipt_id,
    committedFirstRevision: row.committed_first_revision,
    committedLastRevision: row.committed_last_revision,
    committedEventCount: row.committed_event_count,
  });
}

/** Throws invalid-record when a required identity string is blank. */
function assertNonempty(value: string): void {
  if (!isNonempty(value)) {
    throw new ActionAuditError(
      'invalid-record',
      'Action-audit identity fields must be nonempty',
    );
  }
}

/**
 * Throws invalid-record unless the committed range is a positive integer
 * span matching journal batch law (last = first + count - 1).
 */
function assertCommittedRange(
  first: number,
  last: number,
  count: number,
): void {
  if (
    !Number.isSafeInteger(first) ||
    !Number.isSafeInteger(last) ||
    !Number.isSafeInteger(count) ||
    first < 1 ||
    last < 1 ||
    count < 1 ||
    last !== first + count - 1
  ) {
    throw new ActionAuditError(
      'invalid-record',
      'Accepted action-audit records must link a positive committed revision range',
    );
  }
}

/** Parses a stored lifecycle; unknown values are corrupt storage. */
function parseLifecycle(value: string): ActionAuditLifecycleState {
  if (
    value === 'accepted' ||
    value === 'rejected' ||
    value === 'vetoed' ||
    value === 'timed-out' ||
    value === 'published'
  ) {
    return value;
  }
  throw new ActionAuditError(
    'invalid-record',
    'Stored action-audit lifecycle is not a known state',
  );
}

/** Parses a stored actor role; unknown values are corrupt storage. */
function parseActorRole(value: string): IActionAuditActor['role'] {
  if (!isActionAuditActorRole(value)) {
    throw new ActionAuditError(
      'invalid-record',
      'Stored action-audit actor role is not a known role',
    );
  }
  return value;
}

/** Parses a stored safe reason; unknown values are corrupt storage. */
function parseSafeReason(
  value: string | null,
): ActionAuditSafeReasonCode | null {
  if (value === null) return null;
  if (!isActionAuditSafeReasonCode(value)) {
    throw new ActionAuditError(
      'invalid-record',
      'Stored action-audit reason is not a known safe code',
    );
  }
  return value;
}

/** True when the closed reason code is legal for the failure lifecycle. */
function reasonMatchesState(
  state: 'rejected' | 'vetoed' | 'timed-out',
  reason: string,
): boolean {
  if (state === 'vetoed') return reason === 'policy-veto';
  if (state === 'timed-out') return reason === 'deadline-expired';
  return (
    reason === 'invalid-request' ||
    reason === 'no-viewer' ||
    reason === 'scope-escalation' ||
    reason === 'wrong-session' ||
    reason === 'command-rejected'
  );
}
