/**
 * Fold and hydrate helpers for per-grant campaign snapshots (task 3.4).
 *
 * Replay of a grant is applyCampaignEvent over the items
 * projectCampaignStreamForGrant already filtered and numbered. A
 * scoped snapshot is that fold cut at a deliverySequence; hydration
 * replaces state via CampaignSnapshotPublished then folds the tail.
 * These helpers are shared by the builder and the equivalence harness
 * so the proof cannot silently use a second reducer.
 */

import { applyCampaignEvent } from '@/lib/campaign/sync/applyCampaignEvent';
import {
  createEmptyCampaignState,
  type ICampaignAuthoritativeState,
  type ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import type {
  ICampaignGrantDeliveryItem,
  ICampaignGrantProjectedEvent,
} from './campaignDeliveryTypes';
import type { IScopedCampaignSnapshot } from './campaignGrantSnapshotTypes';

/**
 * Reattaches the per-grant deliverySequence so applyCampaignEvent can
 * consume a projected item. The number is the grant cursor, not a
 * journal position.
 */
export function campaignGrantItemToReplayEvent(
  item: ICampaignGrantDeliveryItem,
): ICampaignEvent {
  return { ...item.event, sequence: item.deliverySequence };
}

/**
 * Folds projected items from empty authoritative state. Prefix and
 * full-stream replay both use this so a snapshot cut cannot invent a
 * second fold.
 */
export function foldCampaignGrantDeliveryItems(
  campaignId: string,
  items: readonly ICampaignGrantDeliveryItem[],
): ICampaignAuthoritativeState {
  let state = createEmptyCampaignState(campaignId);
  for (const item of items) {
    state = applyCampaignEvent(state, campaignGrantItemToReplayEvent(item));
  }
  return state;
}

/**
 * Builds the CampaignSnapshotPublished event applyCampaignEvent uses to
 * replace state wholesale. sequence is -1 so this frame cannot be
 * mistaken for a journal row. The event is ephemeral: it is not stored
 * on IScopedCampaignSnapshot, so a leak scan of the snapshot record
 * never sees a `sequence` key.
 */
export function scopedSnapshotHydrationEvent(
  snapshot: IScopedCampaignSnapshot,
): ICampaignEvent<'CampaignSnapshotPublished'> {
  return {
    sequence: -1,
    campaignId: snapshot.campaignId,
    ts: snapshot.ts,
    authorPlayerId: snapshot.authorPlayerId,
    type: 'CampaignSnapshotPublished',
    scope: snapshot.snapshotScope,
    payload: { state: snapshot.state },
  };
}

/**
 * Hydrates a replica: replace from the scoped snapshot, then fold the
 * tail after asOfDeliverySequence. This is path (b) of the equivalence
 * proof.
 */
export function hydrateCampaignGrantFromSnapshot(
  snapshot: IScopedCampaignSnapshot,
  tail: readonly ICampaignGrantDeliveryItem[],
): ICampaignAuthoritativeState {
  let state = applyCampaignEvent(
    createEmptyCampaignState(snapshot.campaignId),
    scopedSnapshotHydrationEvent(snapshot),
  );
  for (const item of tail) {
    state = applyCampaignEvent(state, campaignGrantItemToReplayEvent(item));
  }
  return state;
}

/**
 * Canonical JSON for deep equality. Object keys are sorted so field
 * insertion order from state spreads cannot make two equal ledgers
 * compare unequal.
 */
export function canonicalizeCampaignJson(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

/**
 * True when two JSON-safe values are structurally equal after key sort.
 */
export function campaignJsonEquals(left: unknown, right: unknown): boolean {
  return canonicalizeCampaignJson(left) === canonicalizeCampaignJson(right);
}

/** Recursively sorts object keys; arrays keep event order. */
function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(record).sort();
  for (const key of keys) {
    sorted[key] = sortJsonValue(record[key]);
  }
  return sorted;
}

/**
 * Projected CampaignSnapshotPublished for the wire frame. Payload is
 * only `{ state }`: no revision, no matchId, no journal field.
 */
export function scopedSnapshotWireEvent(
  snapshot: IScopedCampaignSnapshot,
): ICampaignGrantProjectedEvent<'CampaignSnapshotPublished'> {
  return {
    type: 'CampaignSnapshotPublished',
    campaignId: snapshot.campaignId,
    ts: snapshot.ts,
    authorPlayerId: snapshot.authorPlayerId,
    scope: snapshot.snapshotScope,
    payload: { state: snapshot.state },
  };
}
