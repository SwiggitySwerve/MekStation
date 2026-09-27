/**
 * Idempotent ingest planner for replica delivery pages.
 *
 * Walks the incoming page against stored envelopes and returns either
 * the new contiguous items to append or a task-3.3 typed fault. A fault
 * discards any tentatively accepted items from this page so ingest is
 * fail-closed: a gap or collision never writes a prefix of the page.
 * Re-ingesting an already-stored identity is a no-op (duplicate).
 *
 * Time is not read here; the helper is pure.
 */

import type { IDeliveryCursor } from '@/lib/campaign/delivery/campaignDeliveryTypes';
import type { ICampaignGrantDeliveryItem } from '@/lib/campaign/delivery/campaignDeliveryTypes';

import {
  applyCampaignGrantDelivery,
  type ICampaignGrantReplicaApplyState,
} from '@/lib/campaign/delivery/applyCampaignGrantDelivery';

import type { CampaignReplicaIngestFault } from './campaignReplicaTypes';

import {
  canonicalReplicaDeliveryIdentity,
  type ICampaignReplicaDurable,
} from './campaignReplicaEnvelope';

export type CampaignReplicaIngestPlan =
  | {
      readonly kind: 'append';
      readonly pending: readonly ICampaignGrantDeliveryItem[];
      readonly lastCursor: IDeliveryCursor;
    }
  | {
      readonly kind: 'duplicate';
      readonly lastCursor: IDeliveryCursor | null;
    }
  | CampaignReplicaIngestFault;

/**
 * Cursor a replica should present after a fail-closed identity error.
 * afterSequence is the last contiguous stored sequence (0 if none).
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
 * Plans ingest of one delivered page against the folded stored stream
 * (`stored`, not mutated). pending items are the only rows the store may
 * append; the caller must not write on any other kind.
 */
export function planCampaignReplicaIngest(
  stored: ICampaignReplicaDurable,
  deliveryEpochId: string,
  items: readonly ICampaignGrantDeliveryItem[],
): CampaignReplicaIngestPlan {
  // Identities this page adds, checked before the stored ones.
  const added = new Map<number, string>();
  const durable = stored.state;
  let working = durable;
  const pending: ICampaignGrantDeliveryItem[] = [];

  for (const item of items) {
    const identity = canonicalReplicaDeliveryIdentity(item.event);
    const storedIdentity =
      added.get(item.deliverySequence) ??
      stored.identities.get(item.deliverySequence);
    if (storedIdentity !== undefined) {
      if (storedIdentity !== identity) {
        return {
          kind: 'collision',
          reason: 'delivery-collision',
          lastVerifiedCursor: lastVerifiedCursor(durable, deliveryEpochId),
          state: durable,
        };
      }
      continue;
    }

    const result = applyCampaignGrantDelivery(working, {
      deliveryEpochId,
      item,
    });
    if (result.kind === 'duplicate') {
      continue;
    }
    if (result.kind !== 'applied') {
      return {
        ...result,
        lastVerifiedCursor: lastVerifiedCursor(durable, deliveryEpochId),
        state: durable,
      };
    }
    working = result.state;
    pending.push(item);
    added.set(item.deliverySequence, identity);
  }

  if (pending.length === 0) {
    return {
      kind: 'duplicate',
      lastCursor:
        working.deliveryEpochId === null
          ? null
          : {
              deliveryEpochId: working.deliveryEpochId,
              afterSequence: working.lastAppliedSequence,
            },
    };
  }

  return {
    kind: 'append',
    pending,
    lastCursor: {
      deliveryEpochId,
      afterSequence: working.lastAppliedSequence,
    },
  };
}
