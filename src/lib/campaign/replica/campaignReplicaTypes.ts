/**
 * Replica durable-store types (design D6, task 2.3).
 *
 * STRUCTURAL LAW: this folder records scoped delivery into local
 * `campaign-replica` journal streams only. It must never append to a
 * source `campaign` stream, never import a source-side campaign event
 * store, and never mutate a grant store. UI wiring is task 3.6;
 * transport is 3.3.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D6)
 */

import type { ApplyCampaignGrantDeliveryResult } from '@/lib/campaign/delivery/applyCampaignGrantDelivery';
import type { IDeliveryCursor } from '@/lib/campaign/delivery/campaignDeliveryTypes';
import type { ICampaignGrantDeliveryItem } from '@/lib/campaign/delivery/campaignDeliveryTypes';
import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';

/** Journal stream type for a consuming device's scoped replica log. */
export const CAMPAIGN_REPLICA_STREAM_TYPE = 'campaign-replica' as const;

/** Injected clock. Replica production sources never read the system clock. */
export type CampaignReplicaClock = () => string;

/** Runtime link to the source. Not durable; restart defaults to disconnected. */
export type CampaignReplicaConnectionStatus = 'connected' | 'disconnected';

/** Offline mutation refusal. Distinct from `failed` so UI can say offline. */
export const REPLICA_OFFLINE_REFUSAL_REASON = 'replica-offline' as const;

/** Connected-path validation failure; never used for a mere disconnect. */
export const REPLICA_INVALID_INTENT_REASON = 'invalid-intent' as const;

/**
 * Builds the per-grant replica stream id. The hash separator is literal
 * because grant ids are opaque hex and do not contain it.
 */
export function campaignReplicaStreamId(
  campaignId: string,
  grantId: string,
): string {
  if (campaignId.trim().length === 0) {
    throw new Error('Replica stream requires a non-empty campaignId');
  }
  if (grantId.trim().length === 0 || grantId.includes('#')) {
    throw new Error('Replica stream requires a non-empty grantId without #');
  }
  return `${campaignId}#${grantId}`;
}

/**
 * Durable journal payload for one received delivery item.
 *
 * deliveryEpochId lives here (on every row) so a restart can resume
 * from the last stored envelope without a second cursor table. The
 * field is inside the journal's canonical payload, so it is
 * digest-protected with the event. afterSequence is deliverySequence.
 */
export interface ICampaignReplicaEnvelope {
  readonly deliveryEpochId: string;
  readonly deliverySequence: number;
  readonly event: ICampaignGrantDeliveryItem['event'];
}

/** Folded replica projection plus the resume cursor derived from the log. */
export interface ICampaignReplicaReadResult {
  readonly state: ICampaignAuthoritativeState;
  readonly lastDeliverySequence: number;
  readonly lastCursor: IDeliveryCursor | null;
}

/** Caller-supplied mutation intent. This module never queues or sends it. */
export interface ICampaignReplicaMutationIntent {
  readonly campaignId: string;
  readonly grantId: string;
  readonly commandId: string;
  readonly type: string;
}

/**
 * Mutation decision. `refused` is offline; `failed` is a real error;
 * `forward` means the caller may send (task 3.5/3.6 owns the wire).
 */
export type CampaignReplicaMutationResult =
  | {
      readonly kind: 'refused';
      readonly reason: typeof REPLICA_OFFLINE_REFUSAL_REASON;
    }
  | {
      readonly kind: 'failed';
      readonly reason: typeof REPLICA_INVALID_INTENT_REASON;
    }
  | {
      readonly kind: 'forward';
      readonly intent: ICampaignReplicaMutationIntent;
    };

/** Fail-closed ingest faults reuse the task-3.3 apply vocabulary. */
export type CampaignReplicaIngestFault = Extract<
  ApplyCampaignGrantDeliveryResult,
  { kind: 'gap' | 'collision' | 'foreign-epoch' }
>;

export type CampaignReplicaIngestResult =
  | {
      readonly kind: 'applied';
      readonly appended: number;
      readonly lastCursor: IDeliveryCursor;
    }
  | {
      readonly kind: 'duplicate';
      readonly lastCursor: IDeliveryCursor | null;
    }
  | CampaignReplicaIngestFault;

/** Chain walk over a replica stream using the journal's digest fields. */
export type CampaignReplicaChainVerifyResult =
  | { readonly kind: 'valid'; readonly eventCount: number }
  | {
      readonly kind: 'invalid';
      readonly reason: 'digest-mismatch' | 'chain-break' | 'revision-gap';
      readonly eventId: string;
    };

export type { IDeliveryCursor };
