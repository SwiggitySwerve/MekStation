/**
 * Replica envelope parse and stored-stream reconstruction.
 *
 * Fail closed on a payload that is not a replica envelope so a corrupt
 * row cannot be folded into UI state. Time is not read here.
 */

import type { ICampaignGrantDeliveryItem } from '@/lib/campaign/delivery/campaignDeliveryTypes';

import {
  applyCampaignGrantDelivery,
  emptyCampaignGrantReplicaState,
  type ICampaignGrantReplicaApplyState,
} from '@/lib/campaign/delivery/applyCampaignGrantDelivery';
import { canonicalizeJsonV1 } from '@/lib/events/journal/EventJournalCanonicalizer';
import { DELIVERY_EPOCH_ID_PATTERN } from '@/lib/multiplayer/server/delivery/IDeliveryEpochStore';
import {
  CAMPAIGN_EVENT_TYPES,
  isCampaignEventScope,
} from '@/types/campaign/CampaignSync';

import type { ICampaignReplicaEnvelope } from './campaignReplicaTypes';

const CAMPAIGN_EVENT_TYPE_SET: ReadonlySet<string> = new Set(
  CAMPAIGN_EVENT_TYPES,
);

/**
 * True when value is a non-null object record (not an array).
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * True when the projected event has the wire shape (no source sequence).
 * Rejects a `sequence` key so a journal position cannot sneak into the
 * replica payload and later leak through a fold.
 */
function isProjectedDeliveryEvent(
  value: unknown,
): value is ICampaignGrantDeliveryItem['event'] {
  if (!isRecord(value)) return false;
  if ('sequence' in value) return false;
  if (typeof value['campaignId'] !== 'string') return false;
  if (typeof value['ts'] !== 'string') return false;
  if (typeof value['authorPlayerId'] !== 'string') return false;
  if (typeof value['type'] !== 'string') return false;
  if (!CAMPAIGN_EVENT_TYPE_SET.has(value['type'])) return false;
  if (!isCampaignEventScope(value['scope'])) return false;
  if (!isRecord(value['payload'])) return false;
  return true;
}

/**
 * Parses one journal payload as a replica envelope. Throws when the
 * row is not a replica envelope so callers never fold garbage.
 */
export function parseCampaignReplicaEnvelope(
  payload: unknown,
): ICampaignReplicaEnvelope {
  if (!isRecord(payload)) {
    throw new Error('Replica envelope payload must be an object');
  }
  const deliveryEpochId = payload['deliveryEpochId'];
  const deliverySequence = payload['deliverySequence'];
  if (
    typeof deliveryEpochId !== 'string' ||
    !DELIVERY_EPOCH_ID_PATTERN.test(deliveryEpochId)
  ) {
    throw new Error('Replica envelope deliveryEpochId is invalid');
  }
  if (
    typeof deliverySequence !== 'number' ||
    !Number.isSafeInteger(deliverySequence) ||
    deliverySequence < 1
  ) {
    throw new Error('Replica envelope deliverySequence is invalid');
  }
  if (!isProjectedDeliveryEvent(payload['event'])) {
    throw new Error('Replica envelope event is not a projected delivery event');
  }
  return {
    deliveryEpochId,
    deliverySequence,
    event: payload['event'],
  };
}

/**
 * Converts a stored envelope back into the wire delivery item the
 * ingest planner and the fold both consume.
 */
export function replicaEnvelopeToDeliveryItem(
  envelope: ICampaignReplicaEnvelope,
): ICampaignGrantDeliveryItem {
  return {
    deliverySequence: envelope.deliverySequence,
    event: envelope.event,
  };
}

/**
 * Rebuilds the task-3.3 apply state from durable envelopes. The stored
 * stream must itself apply cleanly; a gap or collision in stored rows
 * is corruption, not a live ingest fault.
 */
export function applyStateFromReplicaEnvelopes(
  envelopes: readonly ICampaignReplicaEnvelope[],
): ICampaignGrantReplicaApplyState {
  let state = emptyCampaignGrantReplicaState();
  for (const envelope of envelopes) {
    const result = applyCampaignGrantDelivery(state, {
      deliveryEpochId: envelope.deliveryEpochId,
      item: replicaEnvelopeToDeliveryItem(envelope),
    });
    if (result.kind !== 'applied') {
      throw new Error(
        `Stored replica stream is not a contiguous apply chain (${result.kind})`,
      );
    }
    state = result.state;
  }
  return state;
}

/**
 * Identity of a delivered event after journal canonicalization.
 * Payload key order changes when the journal stores the envelope, so
 * ingest must compare canonical bytes rather than JSON.stringify order.
 */
export function canonicalReplicaDeliveryIdentity(
  event: ICampaignGrantDeliveryItem['event'],
): string {
  return canonicalizeJsonV1({
    authorPlayerId: event.authorPlayerId,
    campaignId: event.campaignId,
    payload: event.payload,
    scope: event.scope,
    ts: event.ts,
    type: event.type,
  });
}

/**
 * Identity map keyed by deliverySequence so ingest can detect a
 * historical collision the head-only apply helper would miss.
 */
export function replicaIdentityBySequence(
  envelopes: readonly ICampaignReplicaEnvelope[],
): ReadonlyMap<number, string> {
  const map = new Map<number, string>();
  for (const envelope of envelopes) {
    map.set(
      envelope.deliverySequence,
      canonicalReplicaDeliveryIdentity(envelope.event),
    );
  }
  return map;
}
