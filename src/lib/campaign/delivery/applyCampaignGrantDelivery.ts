/**
 * Replica-side idempotent apply for grant delivery items (design D7).
 *
 * Apply-once by per-grant deliverySequence. Re-delivery of an already
 * applied sequence is a no-op. A gap or a collision (same sequence,
 * different event identity) fails closed and names a re-request from
 * the last verified cursor. None of those three paths mutates replica
 * state. Time is not read here; the helper is pure.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D7)
 */

import type { IDeliveryCursor } from '@/lib/multiplayer/server/delivery/IDeliveryEpochStore';

import type {
  ICampaignGrantDeliveryItem,
  ICampaignGrantProjectedEvent,
} from './campaignDeliveryTypes';

/** Replica cursor plus the identity of the last applied item. */
export interface ICampaignGrantReplicaApplyState {
  readonly deliveryEpochId: string | null;
  readonly lastAppliedSequence: number;
  readonly lastAppliedIdentity: string | null;
  readonly applied: readonly ICampaignGrantDeliveryItem[];
}

export interface IApplyCampaignGrantDeliveryInput {
  readonly deliveryEpochId: string;
  readonly item: ICampaignGrantDeliveryItem;
}

export type ApplyCampaignGrantDeliveryResult =
  | {
      readonly kind: 'applied';
      readonly state: ICampaignGrantReplicaApplyState;
    }
  | {
      readonly kind: 'duplicate';
      readonly state: ICampaignGrantReplicaApplyState;
    }
  | {
      readonly kind: 'gap';
      readonly reason: 'delivery-gap';
      readonly lastVerifiedCursor: IDeliveryCursor;
      readonly state: ICampaignGrantReplicaApplyState;
    }
  | {
      readonly kind: 'collision';
      readonly reason: 'delivery-collision';
      readonly lastVerifiedCursor: IDeliveryCursor;
      readonly state: ICampaignGrantReplicaApplyState;
    }
  | {
      readonly kind: 'foreign-epoch';
      readonly reason: 'delivery-foreign-epoch';
      readonly lastVerifiedCursor: IDeliveryCursor;
      readonly state: ICampaignGrantReplicaApplyState;
    };

/**
 * Empty replica apply state. lastAppliedSequence 0 means nothing has
 * been applied; the next accepted item must be deliverySequence 1.
 */
export function emptyCampaignGrantReplicaState(): ICampaignGrantReplicaApplyState {
  return {
    deliveryEpochId: null,
    lastAppliedSequence: 0,
    lastAppliedIdentity: null,
    applied: Object.freeze([]),
  };
}

/**
 * Canonical identity of a delivered event. Keys are lexicographic so
 * JSON.stringify is stable. Journal fields are not part of this
 * object because they never appear on the wire item.
 */
export function campaignGrantDeliveryIdentity(
  event: ICampaignGrantProjectedEvent,
): string {
  return JSON.stringify({
    authorPlayerId: event.authorPlayerId,
    campaignId: event.campaignId,
    payload: event.payload,
    scope: event.scope,
    ts: event.ts,
    type: event.type,
  });
}

/**
 * Cursor a replica should present after a fail-closed identity error.
 * afterSequence is the last contiguous applied sequence (0 if none).
 */
function lastVerifiedCursor(
  state: ICampaignGrantReplicaApplyState,
  incomingEpochId: string,
): IDeliveryCursor {
  return {
    deliveryEpochId: state.deliveryEpochId ?? incomingEpochId,
    afterSequence: state.lastAppliedSequence,
  };
}

/**
 * Applies one delivered item with exactly-once semantics. The incoming
 * state object is never mutated; fail-closed results return it as-is.
 */
export function applyCampaignGrantDelivery(
  state: ICampaignGrantReplicaApplyState,
  input: IApplyCampaignGrantDeliveryInput,
): ApplyCampaignGrantDeliveryResult {
  const sequence = input.item.deliverySequence;
  const identity = campaignGrantDeliveryIdentity(input.item.event);

  if (
    state.deliveryEpochId !== null &&
    state.deliveryEpochId !== input.deliveryEpochId
  ) {
    return {
      kind: 'foreign-epoch',
      reason: 'delivery-foreign-epoch',
      lastVerifiedCursor: lastVerifiedCursor(state, input.deliveryEpochId),
      state,
    };
  }

  if (sequence < state.lastAppliedSequence) {
    return { kind: 'duplicate', state };
  }

  if (sequence === state.lastAppliedSequence && state.lastAppliedSequence > 0) {
    if (identity === state.lastAppliedIdentity) {
      return { kind: 'duplicate', state };
    }
    return {
      kind: 'collision',
      reason: 'delivery-collision',
      lastVerifiedCursor: lastVerifiedCursor(state, input.deliveryEpochId),
      state,
    };
  }

  if (sequence !== state.lastAppliedSequence + 1) {
    return {
      kind: 'gap',
      reason: 'delivery-gap',
      lastVerifiedCursor: lastVerifiedCursor(state, input.deliveryEpochId),
      state,
    };
  }

  const nextApplied = Object.freeze([...state.applied, input.item]);
  return {
    kind: 'applied',
    state: {
      deliveryEpochId: input.deliveryEpochId,
      lastAppliedSequence: sequence,
      lastAppliedIdentity: identity,
      applied: nextApplied,
    },
  };
}
