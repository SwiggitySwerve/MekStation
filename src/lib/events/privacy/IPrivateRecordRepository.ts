/**
 * Server-internal private-record contract (authority-audit PR 5, design D4).
 *
 * Separate storage class from action_audit: this module holds GM-private
 * payload, retention state, and a payload-free access log. Player-safe
 * rows may keep only the opaque ref. Live lookup/export/retention wiring
 * is owned by later PRs; nothing here is attached to a socket or command
 * path.
 *
 * Lookups, private export, erase, and redact MUST recheck through
 * authorizeHumanAction kind 'private-audit' and then require role gm.
 * No exported function returns payload without that gate pass.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import type { AuthorizedViewerResolver } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

export const PRIVATE_RECORD_KINDS = [
  'gm-reason',
  'gm-draft',
  'hidden-impact',
  'rejection-detail',
] as const;
export type PrivateRecordKind = (typeof PRIVATE_RECORD_KINDS)[number];

export const PRIVATE_PAYLOAD_STATES = [
  'present',
  'erased',
  'redacted',
] as const;
export type PrivatePayloadState = (typeof PRIVATE_PAYLOAD_STATES)[number];

export const PRIVATE_RETENTION_CLASSES = [
  'session',
  'campaign',
  'audit-hold',
] as const;
export type PrivateRetentionClass = (typeof PRIVATE_RETENTION_CLASSES)[number];

export const PRIVATE_RETENTION_POLICIES = ['keep', 'erase-on-expiry'] as const;
export type PrivateRetentionPolicy =
  (typeof PRIVATE_RETENTION_POLICIES)[number];

export const PRIVATE_ACCESS_PURPOSES = [
  'lookup',
  'export-attempt',
  'retention-action',
  'erasure',
  'redaction',
] as const;
export type PrivateAccessPurpose = (typeof PRIVATE_ACCESS_PURPOSES)[number];

export const PRIVATE_ACCESS_RESULTS = ['granted', 'denied'] as const;
export type PrivateAccessResult = (typeof PRIVATE_ACCESS_RESULTS)[number];

export const PRIVATE_ACCESS_REASON_CODES = [
  'invalid-request',
  'no-viewer',
  'scope-escalation',
  'wrong-session',
  'role-denied',
  'not-found',
  'already-terminal',
] as const;
export type PrivateAccessReasonCode =
  (typeof PRIVATE_ACCESS_REASON_CODES)[number];

export const PRIVATE_RECORD_ACTOR_ROLES = ['gm', 'player'] as const;
export type PrivateRecordActorRole =
  (typeof PRIVATE_RECORD_ACTOR_ROLES)[number];

export type PrivateRecordErrorCode =
  | 'access-denied'
  | 'already-terminal'
  | 'invalid-record';

/** Constant public refusal: identical for absent-record and wrong-scope. */
export const PRIVATE_RECORD_ACCESS_DENIED_CODE = 'access-denied' as const;
export const PRIVATE_RECORD_ACCESS_DENIED_MESSAGE =
  'Private record access refused';

const KIND_SET: ReadonlySet<string> = new Set(PRIVATE_RECORD_KINDS);
const STATE_SET: ReadonlySet<string> = new Set(PRIVATE_PAYLOAD_STATES);
const CLASS_SET: ReadonlySet<string> = new Set(PRIVATE_RETENTION_CLASSES);
const POLICY_SET: ReadonlySet<string> = new Set(PRIVATE_RETENTION_POLICIES);
const PURPOSE_SET: ReadonlySet<string> = new Set(PRIVATE_ACCESS_PURPOSES);
const REASON_SET: ReadonlySet<string> = new Set(PRIVATE_ACCESS_REASON_CODES);
const ROLE_SET: ReadonlySet<string> = new Set(PRIVATE_RECORD_ACTOR_ROLES);

export class PrivateRecordError extends Error {
  public readonly name = 'PrivateRecordError';
  public constructor(
    public readonly code: PrivateRecordErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** True only for PrivateRecordError instances, not structural copies. */
export function isPrivateRecordError(
  candidate: unknown,
): candidate is PrivateRecordError {
  return candidate instanceof PrivateRecordError;
}

/** True when value is a closed private-record kind. */
export function isPrivateRecordKind(
  value: unknown,
): value is PrivateRecordKind {
  return typeof value === 'string' && KIND_SET.has(value);
}

/** True when value is a closed payload_state. */
export function isPrivatePayloadState(
  value: unknown,
): value is PrivatePayloadState {
  return typeof value === 'string' && STATE_SET.has(value);
}

/** True when value is a closed retention class. */
export function isPrivateRetentionClass(
  value: unknown,
): value is PrivateRetentionClass {
  return typeof value === 'string' && CLASS_SET.has(value);
}

/** True when value is a closed retention policy. */
export function isPrivateRetentionPolicy(
  value: unknown,
): value is PrivateRetentionPolicy {
  return typeof value === 'string' && POLICY_SET.has(value);
}

/** True when value is a closed access-audit purpose. */
export function isPrivateAccessPurpose(
  value: unknown,
): value is PrivateAccessPurpose {
  return typeof value === 'string' && PURPOSE_SET.has(value);
}

/** True when value is a closed id-free access reason. */
export function isPrivateAccessReasonCode(
  value: unknown,
): value is PrivateAccessReasonCode {
  return typeof value === 'string' && REASON_SET.has(value);
}

/** True when value is a server-derived gm/player role. */
export function isPrivateRecordActorRole(
  value: unknown,
): value is PrivateRecordActorRole {
  return typeof value === 'string' && ROLE_SET.has(value);
}

/**
 * Gate inputs shared by lookup, private export, erase, and redact.
 * `matchId` is authorizeHumanAction's session key (resolver
 * campaignSessionId), never a client-claimed target.
 */
export interface IPrivateRecordGateInput {
  readonly resolver: AuthorizedViewerResolver;
  readonly principalId: string;
  readonly matchId: string;
  readonly streamId?: string;
  readonly occurredAt: string;
}

export interface IPrivateRecordCreate {
  readonly campaignSessionId: string;
  readonly commandId: string | null;
  readonly recordKind: PrivateRecordKind;
  readonly payload: string;
  readonly retentionClass: PrivateRetentionClass;
  readonly createdAt: string;
}

interface IPrivateRecordIdentity {
  readonly opaqueRef: string;
  readonly campaignSessionId: string;
  readonly commandId: string | null;
  readonly recordKind: PrivateRecordKind;
  readonly retentionClass: PrivateRetentionClass;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Present or redacted view: payload is the live private body. */
export interface IPrivateRecordOpenView extends IPrivateRecordIdentity {
  readonly payloadState: 'present' | 'redacted';
  readonly payload: string;
}

/** Erased view: no payload key; payload_state is the unavailable marker. */
export interface IPrivateRecordErasedView extends IPrivateRecordIdentity {
  readonly payloadState: 'erased';
}

export type IPrivateRecordView =
  | IPrivateRecordOpenView
  | IPrivateRecordErasedView;

/** Default export shape: safe fact plus unavailable-detail marker. */
export interface IPrivateRecordExportView {
  readonly opaqueRef: string;
  readonly payloadState: PrivatePayloadState;
  readonly recordKind: PrivateRecordKind;
}

/** Explicit includePrivate export; payload may be null after erasure. */
export interface IPrivateRecordPrivateExportView extends IPrivateRecordExportView {
  readonly payload: string | null;
}

export interface IPrivateAccessAuditRecord {
  readonly id: number;
  readonly opaqueRef: string;
  readonly actorPrincipalId: string;
  readonly actorRole: PrivateRecordActorRole | null;
  readonly purpose: PrivateAccessPurpose;
  readonly result: PrivateAccessResult;
  readonly safeReasonCode: PrivateAccessReasonCode | null;
  readonly occurredAt: string;
}

export interface IPrivateRecordLookupInput extends IPrivateRecordGateInput {
  readonly opaqueRef: string;
}

export interface IPrivateRecordEraseInput extends IPrivateRecordGateInput {
  readonly opaqueRef: string;
}

export interface IPrivateRecordRedactInput extends IPrivateRecordGateInput {
  readonly opaqueRef: string;
  readonly replacement: string;
}

export type IPrivateRecordExportInput =
  | { readonly opaqueRef: string; readonly includePrivate?: false }
  | (IPrivateRecordGateInput & {
      readonly opaqueRef: string;
      readonly includePrivate: true;
    });

export interface IPrivateRetentionConfig {
  readonly retentionClass: PrivateRetentionClass;
  readonly policy: PrivateRetentionPolicy;
  readonly configuredAt: string;
}

/**
 * Retention sweep input. Caller injects cutoff and clock; the repository
 * never reads Date.now. actorPrincipalId is the server job identity
 * recorded on retention-action rows (not a human viewer).
 */
export interface IPrivateRetentionRun {
  readonly cutoffAt: string;
  readonly occurredAt: string;
  readonly actorPrincipalId: string;
}

/**
 * Private-record store. Implementations MUST NOT touch action_audit or
 * journal tables, MUST NOT return payload from an ungated path, and MUST
 * NOT hash payload into the opaque ref.
 */
export interface IPrivateRecordRepository {
  createPrivateRecord(input: IPrivateRecordCreate): IPrivateRecordOpenView;
  lookupPrivate(input: IPrivateRecordLookupInput): Promise<IPrivateRecordView>;
  exportView(
    input: IPrivateRecordExportInput,
  ): Promise<IPrivateRecordExportView | IPrivateRecordPrivateExportView | null>;
  erase(input: IPrivateRecordEraseInput): Promise<IPrivateRecordErasedView>;
  redact(input: IPrivateRecordRedactInput): Promise<IPrivateRecordOpenView>;
  listAccessAudit(opaqueRef: string): readonly IPrivateAccessAuditRecord[];
  configureRetention(input: IPrivateRetentionConfig): void;
  runRetention(input: IPrivateRetentionRun): readonly string[];
}
