/**
 * Viewer-safe projection contracts (authority-audit PR 6, design D2).
 *
 * Application services accept a branded viewer, authorize the requested
 * stream against that viewer's own session fields, project each fact
 * through a versioned audience projector, and return ONLY this output
 * shape. Raw journal rows and private-audit rows never appear here:
 * eventDigest, commitPosition, streamRevision, principal fields,
 * commandId, canonicalizerVersion, recordedAt, and
 * previousStreamEventDigest are server-only authority facts. Delivery
 * sequencing is PR 7's durable-epoch job, so `sequenceHint` is a local
 * ordinal for this response and is explicitly non-durable.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import type { ViewerRole } from '../authorization/AuthorizedViewer';

/**
 * JSON values a projector may emit. Restricting the payload to this
 * closed JSON set keeps non-JSON authority objects (functions, dates,
 * class instances) from riding out on a viewer response.
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/**
 * A history-read request. `afterRevision` and `limit` bound the
 * server-internal journal page; they are INPUT ONLY and must never be
 * copied onto output objects (raw positions are authority facts).
 */
export interface IViewerProjectionRequest {
  readonly streamType: string;
  readonly streamId: string;
  readonly afterRevision?: number;
  readonly limit?: number;
}

/**
 * Scope echoed to the caller so they can see which principal the
 * projection was built for. Campaign/match/ownership/revision stay off
 * this object; those are authorization inputs, not viewer facts.
 */
export interface IViewerProjectionScope {
  readonly principalId: string;
  readonly participantId: string;
  readonly role: ViewerRole;
}

/**
 * One visible fact. `sequenceHint` is 1..n over VISIBLE facts in THIS
 * response (gapless, hidden events uncountable). It is NOT a journal
 * revision, commit position, or durable delivery sequence.
 */
export interface IViewerSafeFact {
  readonly factType: string;
  readonly sequenceHint: number;
  readonly payload: JsonValue;
}

/**
 * The ONLY object this service returns on success. No cursor, epoch, or
 * raw journal field belongs here; PR 7 owns delivery identity.
 */
export interface IViewerSafeProjection {
  readonly projectorVersion: number;
  readonly streamType: string;
  readonly streamId: string;
  readonly viewerScope: IViewerProjectionScope;
  readonly facts: readonly IViewerSafeFact[];
}

export const VIEWER_SAFE_FACT_KEYS = [
  'factType',
  'sequenceHint',
  'payload',
] as const;

export const VIEWER_SAFE_PROJECTION_KEYS = [
  'projectorVersion',
  'streamType',
  'streamId',
  'viewerScope',
  'facts',
] as const;

/**
 * Request-path codes are the first four. Registry construction uses
 * `duplicate-projector` and `invalid-projector-registration` so a bad
 * catalog cannot be confused with a viewer refusal.
 */
export type ViewerProjectionErrorCode =
  | 'not-a-viewer'
  | 'wrong-session'
  | 'projection-failed'
  | 'unknown-projector'
  | 'duplicate-projector'
  | 'invalid-projector-registration';

/**
 * Constant, id-free messages. Wrong-session MUST stay byte-identical to
 * HumanActionAuthorizationGate's SAFE_REFUSAL (`Authorization refused`)
 * so a miss cannot become an existence oracle.
 */
export const VIEWER_PROJECTION_MESSAGES = {
  notAViewer: 'Viewer projection requires an authorized viewer',
  wrongSession: 'Authorization refused',
  projectionFailed: 'Viewer projection failed',
  unknownProjector: 'No projector is registered for the requested stream',
  duplicateProjector: 'A projector is already registered for this stream type',
  invalidRegistration: 'Projector registration is invalid',
} as const;

/**
 * Typed projection refusal. Messages stay constant; the instance never
 * carries a raw event, payload fragment, or delivery identity.
 */
export class ViewerProjectionError extends Error {
  public readonly name = 'ViewerProjectionError';
  /**
   * Builds a typed refusal. `message` must be one of the constant
   * id-free strings; callers must not interpolate event payloads.
   */
  public constructor(
    public readonly code: ViewerProjectionErrorCode,
    message: string,
  ) {
    super(message);
  }

  /**
   * Serializes only the closed refusal shape so JSON.stringify cannot
   * grow extra authority fields from subclassing or host Error extras.
   */
  public toJSON(): {
    readonly name: string;
    readonly code: ViewerProjectionErrorCode;
    readonly message: string;
  } {
    return { name: this.name, code: this.code, message: this.message };
  }
}

/**
 * True only for ViewerProjectionError instances. Structural `{code}`
 * clones are not this error, matching the gate's typed-error law.
 */
export function isViewerProjectionError(
  candidate: unknown,
): candidate is ViewerProjectionError {
  return candidate instanceof ViewerProjectionError;
}
