/**
 * Delivery-epoch insert/row guards (authority-audit PR 7).
 *
 * Closed identity law lives here so the SQLite adapter stays a
 * persistence seam. generateOpaqueEpochId uses crypto randomness only;
 * it MUST NOT hash principal, session, stream, or generation.
 */

import { randomBytes } from 'node:crypto';

import type { IAuthorizedViewer } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

import { isAuthorizedViewer } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import {
  isSqliteUniqueConstraintError,
  sqliteConstraintMessage,
} from '@/services/persistence/sqliteConstraintErrors';

import {
  DELIVERY_EPOCH_ID_PATTERN,
  DELIVERY_EPOCH_MESSAGES,
  DELIVERY_EPOCH_STALE_MESSAGE,
  DeliveryEpochError,
  type DeliveryCursorValidation,
  type IDeliveryCursor,
  type IDeliveryEpochBaseline,
  type IDeliveryEpochRequest,
  type IDeliveryMapping,
} from './IDeliveryEpochStore';

export interface IDeliveryEpochRow {
  readonly delivery_epoch_id: string;
  readonly principal_id: string;
  readonly campaign_session_id: string;
  readonly participant_id: string;
  readonly membership_revision: number;
  readonly stream_type: string;
  readonly stream_id: string;
  readonly projector_version: number;
  readonly effective_generation: number;
  readonly created_at: string;
}

export interface IDeliveryMappingRow {
  readonly projected_event_identity: string;
  readonly delivery_sequence: number;
}

export interface IDeliveryEpochTuple {
  readonly principalId: string;
  readonly campaignSessionId: string;
  readonly participantId: string;
  readonly membershipRevision: number;
  readonly streamType: string;
  readonly streamId: string;
  readonly projectorVersion: number;
  readonly effectiveGeneration: number;
}

const MAX_SEQUENCE_ALLOC_ATTEMPTS = 8;
const MAX_EPOCH_ID_ATTEMPTS = 5;

/** True when a string has non-whitespace content. */
export function isNonempty(value: string): boolean {
  return value.trim().length > 0;
}

/** True when value is a 32-char lowercase hex opaque epoch id. */
export function isOpaqueEpochId(value: string): boolean {
  return DELIVERY_EPOCH_ID_PATTERN.test(value);
}

/**
 * True for SQLite UNIQUE failures on this schema. Delegates to the shared
 * realm-safe predicate: an `instanceof Error` gate lets a cross-realm
 * constraint error escape untyped, which would surface as a raw driver
 * error instead of the typed conflict callers handle.
 */
export function isUniqueViolation(error: unknown): boolean {
  return isSqliteUniqueConstraintError(error);
}

/**
 * True when the unique failure is the (epoch, identity) mapping key.
 * Distinguishes reuse-of-same-event from a sequence-slot collision.
 */
export function isIdentityUniqueViolation(error: unknown): boolean {
  return (
    isUniqueViolation(error) &&
    sqliteConstraintMessage(error).includes('projected_event_identity')
  );
}

/**
 * True when the unique failure is the (epoch, sequence) mapping key.
 * Callers retry allocation; they must not leave the colliding slot.
 */
export function isSequenceUniqueViolation(error: unknown): boolean {
  return (
    isUniqueViolation(error) &&
    sqliteConstraintMessage(error).includes('delivery_sequence')
  );
}

/**
 * Mints a 32-char lowercase hex id from 16 cryptographically random
 * bytes. Constraint: never derived from the epoch key or event digest.
 */
export function generateOpaqueEpochId(): string {
  return randomBytes(16).toString('hex');
}

/** Throws not-a-viewer when the brand check fails. */
export function assertAuthorizedViewer(viewer: unknown): IAuthorizedViewer {
  if (!isAuthorizedViewer(viewer)) {
    throw new DeliveryEpochError(
      'not-a-viewer',
      DELIVERY_EPOCH_MESSAGES.notAViewer,
    );
  }
  return viewer;
}

/**
 * Rejects stream or projector fields that would violate identity CHECKs
 * so callers get typed invalid-request, not SQL.
 */
export function assertDeliveryEpochRequest(
  request: IDeliveryEpochRequest,
): void {
  if (!isNonempty(request.streamType) || !isNonempty(request.streamId)) {
    throw new DeliveryEpochError(
      'invalid-request',
      DELIVERY_EPOCH_MESSAGES.invalidRequest,
    );
  }
  if (
    !Number.isSafeInteger(request.projectorVersion) ||
    request.projectorVersion < 1
  ) {
    throw new DeliveryEpochError(
      'invalid-request',
      DELIVERY_EPOCH_MESSAGES.invalidRequest,
    );
  }
}

/**
 * Rejects a cursor whose afterSequence is not a usable exclusive bound.
 * Unknown or foreign epoch ids stay a stale-epoch RESULT, not a throw,
 * so existence cannot leak through error codes.
 */
export function assertDeliveryCursor(cursor: IDeliveryCursor): void {
  if (!isNonempty(cursor.deliveryEpochId)) {
    throw new DeliveryEpochError(
      'invalid-request',
      DELIVERY_EPOCH_MESSAGES.invalidRequest,
    );
  }
  if (!Number.isSafeInteger(cursor.afterSequence) || cursor.afterSequence < 0) {
    throw new DeliveryEpochError(
      'invalid-request',
      DELIVERY_EPOCH_MESSAGES.invalidRequest,
    );
  }
}

/** Throws invalid-request when a required identity string is blank. */
export function assertNonemptyIdentity(value: string): void {
  if (!isNonempty(value)) {
    throw new DeliveryEpochError(
      'invalid-request',
      DELIVERY_EPOCH_MESSAGES.invalidRequest,
    );
  }
}

/**
 * Builds the complete 8-tuple from the branded viewer, the request, and
 * the already-resolved effective generation. Callers never pass
 * principal, participant, session, or revision on the request.
 */
export function deriveEpochTuple(
  viewer: IAuthorizedViewer,
  request: IDeliveryEpochRequest,
  effectiveGeneration: number,
): IDeliveryEpochTuple {
  return {
    principalId: viewer.principalId,
    campaignSessionId: viewer.campaignSessionId,
    participantId: viewer.participantId,
    membershipRevision: viewer.membershipRevision,
    streamType: request.streamType,
    streamId: request.streamId,
    projectorVersion: request.projectorVersion,
    effectiveGeneration,
  };
}

/** True when every stored key column matches the derived tuple. */
export function epochRowMatchesTuple(
  row: IDeliveryEpochRow,
  tuple: IDeliveryEpochTuple,
): boolean {
  return (
    row.principal_id === tuple.principalId &&
    row.campaign_session_id === tuple.campaignSessionId &&
    row.participant_id === tuple.participantId &&
    row.membership_revision === tuple.membershipRevision &&
    row.stream_type === tuple.streamType &&
    row.stream_id === tuple.streamId &&
    row.projector_version === tuple.projectorVersion &&
    row.effective_generation === tuple.effectiveGeneration
  );
}

/** Uniform stale-epoch result for every mismatch class. */
export function staleEpochResult(
  baseline: IDeliveryEpochBaseline,
): DeliveryCursorValidation {
  return {
    kind: 'stale-epoch',
    message: DELIVERY_EPOCH_STALE_MESSAGE,
    newBaseline: {
      deliveryEpochId: baseline.deliveryEpochId,
      effectiveGeneration: baseline.effectiveGeneration,
    },
  };
}

/** Maps a stored mapping row onto the public pagination shape. */
export function hydrateMappingRow(row: IDeliveryMappingRow): IDeliveryMapping {
  return Object.freeze({
    projectedEventIdentity: row.projected_event_identity,
    deliverySequence: row.delivery_sequence,
  });
}

export { MAX_EPOCH_ID_ATTEMPTS, MAX_SEQUENCE_ALLOC_ATTEMPTS };
