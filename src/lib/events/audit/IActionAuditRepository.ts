/**
 * Server-internal action-audit contract (authority-audit PR 4, design D3).
 *
 * Stays inside the trusted boundary (design D2): no IAuthorizedViewer,
 * no viewer projection, no transport shape. Actor/authority fields on a
 * record are SERVER-derived values the caller already resolved. Live
 * intent/command wiring is owned by later PRs.
 *
 * Private free-text reasons are PR 5 (design D4). This module only
 * admits the closed id-free safe_reason_code set.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/audit-timeline/spec.md
 */

export const ACTION_AUDIT_ACTOR_ROLES = ['gm', 'player'] as const;
export type ActionAuditActorRole = (typeof ACTION_AUDIT_ACTOR_ROLES)[number];

export const ACTION_AUDIT_INSERT_STATES = [
  'accepted',
  'rejected',
  'vetoed',
  'timed-out',
] as const;
export type ActionAuditInsertState =
  (typeof ACTION_AUDIT_INSERT_STATES)[number];

export const ACTION_AUDIT_LIFECYCLE_STATES = [
  ...ACTION_AUDIT_INSERT_STATES,
  'published',
] as const;
export type ActionAuditLifecycleState =
  (typeof ACTION_AUDIT_LIFECYCLE_STATES)[number];

/**
 * Closed id-free reason codes. Keep in lockstep with the v11 SQL CHECK.
 * Rejected codes match PR 3 gate refusals plus a generic command reject.
 */
export const ACTION_AUDIT_SAFE_REASON_CODES = [
  'invalid-request',
  'no-viewer',
  'scope-escalation',
  'wrong-session',
  'command-rejected',
  'policy-veto',
  'deadline-expired',
] as const;
export type ActionAuditSafeReasonCode =
  (typeof ACTION_AUDIT_SAFE_REASON_CODES)[number];

const SAFE_REASON_SET: ReadonlySet<string> = new Set(
  ACTION_AUDIT_SAFE_REASON_CODES,
);
const ACTOR_ROLE_SET: ReadonlySet<string> = new Set(ACTION_AUDIT_ACTOR_ROLES);

export type ActionAuditErrorCode =
  | 'identity-conflict'
  | 'invalid-record'
  | 'not-accepted'
  | 'not-found'
  | 'receipt-conflict';

export class ActionAuditError extends Error {
  public readonly name = 'ActionAuditError';
  public constructor(
    public readonly code: ActionAuditErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** True only for ActionAuditError instances, not structural copies. */
export function isActionAuditError(
  candidate: unknown,
): candidate is ActionAuditError {
  return candidate instanceof ActionAuditError;
}

/** True when value is one of the closed safe reason codes. */
export function isActionAuditSafeReasonCode(
  value: unknown,
): value is ActionAuditSafeReasonCode {
  return typeof value === 'string' && SAFE_REASON_SET.has(value);
}

/** True when value is a server-derived gm/player actor role. */
export function isActionAuditActorRole(
  value: unknown,
): value is ActionAuditActorRole {
  return typeof value === 'string' && ACTOR_ROLE_SET.has(value);
}

export interface IActionAuditActor {
  readonly principalId: string;
  readonly participantId: string;
  readonly role: ActionAuditActorRole;
}

interface IActionAuditInsertBase {
  readonly campaignSessionId: string;
  readonly matchId: string | null;
  readonly streamType: string;
  readonly streamId: string;
  readonly commandId: string;
  readonly commandDigest: string;
  readonly actor: IActionAuditActor;
  readonly correlationId: string | null;
  readonly createdAt: string;
}

export interface IAcceptedActionAuditInsert extends IActionAuditInsertBase {
  readonly lifecycleState: 'accepted';
  readonly safeReasonCode: null;
  readonly committedFirstRevision: number;
  readonly committedLastRevision: number;
  readonly committedEventCount: number;
}

export interface IFailedActionAuditInsert extends IActionAuditInsertBase {
  readonly lifecycleState: 'rejected' | 'vetoed' | 'timed-out';
  readonly safeReasonCode: ActionAuditSafeReasonCode;
  readonly committedFirstRevision: null;
  readonly committedLastRevision: null;
  readonly committedEventCount: null;
}

export type IActionAuditInsert =
  | IAcceptedActionAuditInsert
  | IFailedActionAuditInsert;

export interface IActionAuditRecord {
  readonly campaignSessionId: string;
  readonly matchId: string | null;
  readonly streamType: string;
  readonly streamId: string;
  readonly commandId: string;
  readonly commandDigest: string;
  readonly actor: IActionAuditActor;
  readonly lifecycleState: ActionAuditLifecycleState;
  readonly safeReasonCode: ActionAuditSafeReasonCode | null;
  readonly correlationId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly publishedReceiptId: string | null;
  readonly committedFirstRevision: number | null;
  readonly committedLastRevision: number | null;
  readonly committedEventCount: number | null;
}

export type ActionAuditWriteResult =
  | { readonly kind: 'created'; readonly record: IActionAuditRecord }
  | { readonly kind: 'existing'; readonly record: IActionAuditRecord };

/**
 * Append-once action-audit store. Implementations MUST NOT touch
 * gameplay journal, outbox, projection, or delivery-sequence tables.
 */
export interface IActionAuditRepository {
  recordLifecycle(input: IActionAuditInsert): ActionAuditWriteResult;
  linkPublishedReceipt(
    commandId: string,
    publishedReceiptId: string,
    stampedAt: string,
  ): ActionAuditWriteResult;
  readByCommandId(commandId: string): IActionAuditRecord | null;
  readBySession(campaignSessionId: string): readonly IActionAuditRecord[];
}
