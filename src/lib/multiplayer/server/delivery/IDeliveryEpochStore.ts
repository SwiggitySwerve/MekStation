/**
 * Server-internal durable viewer delivery-epoch contract (authority-audit
 * PR 7, design D2).
 *
 * The store keys one opaque epoch per complete 8-tuple derived from the
 * current branded viewer plus the requested stream and projector version
 * plus the server-owned effective generation. A cursor is an opaque
 * epoch id plus afterSequence. Sequence assignment is visible-projection
 * only and reuses one mapping per projectedEventIdentity.
 *
 * projectedEventIdentity is the stored event's eventDigest (content
 * digest), never streamRevision or commitPosition. Digest stays stable
 * when a branch or replay reconstructs the same bytes at a new
 * positional revision; a positional identity would mint a new sequence
 * for identical content. The pairing of digest to a viewer-safe fact
 * lives in the projection layer so this module never imports journal
 * row types.
 *
 * Live socket and route wiring is owned by PR 8. This module never
 * imports the private-record storage class.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import type { IAuthorizedViewer } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

export const DELIVERY_EPOCH_ID_PATTERN = /^[0-9a-f]{32}$/;

/**
 * Constant stale-epoch text. Unknown ids, foreign tuples, moved
 * revision/version/generation, and missing rows all use this exact
 * string so the response cannot become an existence oracle.
 */
export const DELIVERY_EPOCH_STALE_MESSAGE =
  'Delivery cursor does not match the current authorized epoch';

export type DeliveryEpochErrorCode = 'not-a-viewer' | 'invalid-request';

export class DeliveryEpochError extends Error {
  public readonly name = 'DeliveryEpochError';
  /**
   * Typed store refusal. Messages stay constant and id-free so a
   * thrown error cannot name a foreign epoch or principal.
   */
  public constructor(
    public readonly code: DeliveryEpochErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** True only for DeliveryEpochError instances, not structural copies. */
export function isDeliveryEpochError(
  candidate: unknown,
): candidate is DeliveryEpochError {
  return candidate instanceof DeliveryEpochError;
}

export const DELIVERY_EPOCH_MESSAGES = {
  notAViewer: 'Delivery epoch requires an authorized viewer',
  invalidRequest: 'Delivery epoch request is invalid',
} as const;

/**
 * Stream plus projector version. Principal, participant, session, and
 * membershipRevision MUST come from the branded viewer, never here.
 */
export interface IDeliveryEpochRequest {
  readonly streamType: string;
  readonly streamId: string;
  readonly projectorVersion: number;
}

/** Viewer cursor: opaque epoch handle plus exclusive lower bound. */
export interface IDeliveryCursor {
  readonly deliveryEpochId: string;
  readonly afterSequence: number;
}

export interface IDeliveryEpochBaseline {
  readonly deliveryEpochId: string;
  readonly effectiveGeneration: number;
}

/**
 * Two-tier cursor verdict. `stale-epoch` is the ONLY mismatch class:
 * unknown, foreign, and moved keys share this shape and message.
 */
export type DeliveryCursorValidation =
  | { readonly kind: 'valid' }
  | {
      readonly kind: 'stale-epoch';
      readonly message: typeof DELIVERY_EPOCH_STALE_MESSAGE;
      readonly newBaseline: IDeliveryEpochBaseline;
    };

export interface IDeliverySequenceAssignment {
  readonly projectedEventIdentity: string;
  readonly deliverySequence: number;
  readonly reused: boolean;
}

/**
 * Pagination row. Identity is the durable digest; raw journal positions
 * never appear on this object.
 */
export interface IDeliveryMapping {
  readonly projectedEventIdentity: string;
  readonly deliverySequence: number;
}

export type DeliveryEpochClock = () => string;

/**
 * Durable delivery-epoch store. Implementations MUST brand-check every
 * viewer argument, MUST derive the 8-tuple from the viewer plus request
 * plus current generation, and MUST assign sequences in one transaction
 * with no reserved gaps on rollback.
 */
export interface IDeliveryEpochStore {
  resolveEpoch(
    viewer: IAuthorizedViewer,
    request: IDeliveryEpochRequest,
  ): IDeliveryEpochBaseline;
  validateCursor(
    viewer: IAuthorizedViewer,
    request: IDeliveryEpochRequest,
    cursor: IDeliveryCursor,
  ): DeliveryCursorValidation;
  assignSequences(
    deliveryEpochId: string,
    projectedEventIdentities: readonly string[],
  ): readonly IDeliverySequenceAssignment[];
  readMappings(
    deliveryEpochId: string,
    afterSequence: number,
    limit: number,
  ): readonly IDeliveryMapping[];
  bumpGeneration(
    campaignSessionId: string,
    streamType: string,
    streamId: string,
  ): number;
}
