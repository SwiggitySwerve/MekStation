/**
 * Room-code guest hydration helpers (task 3.5).
 *
 * A campaign-scope grant never receives a stored CampaignSnapshotPublished
 * through the projector (task 3.4 skip), so snapshot-plus-tail of a
 * co-op host log that only has genesis would start empty and drop the
 * funds/roster the guest dashboard needs. These helpers seed the guest
 * snapshot from the host-log genesis state, then fold the projector's
 * in-scope incrementals. Replica rows reserve sequence 1 for that
 * hydration snapshot so lastCursor maps back onto the grant channel
 * without re-sending history.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/tasks.md (3.5)
 */

import type { ICampaignGrantDeliveryItem } from '@/lib/campaign/delivery/campaignDeliveryTypes';
import type { IDeliveryCursor } from '@/lib/campaign/delivery/campaignDeliveryTypes';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { campaignGrantItemToReplayEvent } from '@/lib/campaign/delivery/foldCampaignGrantDelivery';
import { applyCampaignEvent } from '@/lib/campaign/sync/applyCampaignEvent';
import { freezeCampaignEvent } from '@/lib/campaign/sync/campaignEventScope';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

/**
 * Replica sequence 1 is the composed hydration snapshot. Projector
 * deliverySequence N is stored as N + this offset so live items stay
 * contiguous after the snapshot row.
 */
export const ROOM_CODE_GUEST_REPLICA_SEQUENCE_OFFSET = 1;

export interface IRoomCodeGuestHydration {
  readonly state: ICampaignAuthoritativeState;
  readonly replicaItems: readonly ICampaignGrantDeliveryItem[];
  readonly projectorHead: number;
}

/**
 * First stored CampaignSnapshotPublished in the host log, which is the
 * co-op open() genesis. Later snapshots are ignored so a migration
 * full-state row cannot sneak into a restricted guest.
 */
export function genesisStateFromHostLog(
  hostEvents: readonly ICampaignEvent[],
): ICampaignAuthoritativeState | null {
  for (const event of hostEvents) {
    if (event.type === 'CampaignSnapshotPublished') {
      return event.payload.state;
    }
  }
  return null;
}

/**
 * Highest projector deliverySequence in a page, or 0 when the grant
 * has no in-scope incrementals yet.
 */
export function projectorHeadFromItems(
  items: readonly ICampaignGrantDeliveryItem[],
): number {
  const last = items[items.length - 1];
  return last === undefined ? 0 : last.deliverySequence;
}

/**
 * Seeds from genesis (shared ledger at open) then folds projector
 * items. Out-of-scope events never appear in `projectedItems`, so GM
 * incrementals committed after open cannot enter this state.
 */
export function composeRoomCodeGuestState(
  campaignId: string,
  hostEvents: readonly ICampaignEvent[],
  projectedItems: readonly ICampaignGrantDeliveryItem[],
): ICampaignAuthoritativeState {
  const genesis = genesisStateFromHostLog(hostEvents);
  let state = genesis ?? createEmptyCampaignState(campaignId);
  for (const item of projectedItems) {
    state = applyCampaignEvent(state, campaignGrantItemToReplayEvent(item));
  }
  return state;
}

/**
 * Maps a replica cursor (offset sequences) back to the grant-channel
 * cursor the projector understands. Sequence 1 is the hydration
 * snapshot, so projector afterSequence is replica afterSequence - 1.
 */
export function grantCursorFromReplicaCursor(
  replicaCursor: IDeliveryCursor,
): IDeliveryCursor {
  const projectorAfter = replicaCursor.afterSequence - 1;
  return {
    deliveryEpochId: replicaCursor.deliveryEpochId,
    afterSequence: projectorAfter < 0 ? 0 : projectorAfter,
  };
}

/**
 * Shifts projector items by the hydration offset so they append after
 * replica sequence 1.
 */
export function offsetProjectorItemsForReplica(
  items: readonly ICampaignGrantDeliveryItem[],
): readonly ICampaignGrantDeliveryItem[] {
  // Spread rather than rebuild: writing `{deliverySequence, event}` as a
  // fresh literal widens `event.type` to the whole CampaignEventType
  // union and unpairs it from its narrowed payload, so the result no
  // longer satisfies the discriminated item type.
  return items.map(function (item) {
    return {
      ...item,
      deliverySequence:
        item.deliverySequence + ROOM_CODE_GUEST_REPLICA_SEQUENCE_OFFSET,
    };
  });
}

/**
 * Builds the replica backfill page: hydration snapshot at sequence 1
 * plus offset incrementals. The snapshot already includes those
 * incrementals; re-folding them is idempotent for absolute payloads.
 */
export function buildRoomCodeGuestHydration(
  campaignId: string,
  hostEvents: readonly ICampaignEvent[],
  projectedItems: readonly ICampaignGrantDeliveryItem[],
  deliveryEpochId: string,
  ts: string,
  authorPlayerId: string,
): IRoomCodeGuestHydration {
  const state = composeRoomCodeGuestState(
    campaignId,
    hostEvents,
    projectedItems,
  );
  const snapshotItem: ICampaignGrantDeliveryItem = {
    deliverySequence: ROOM_CODE_GUEST_REPLICA_SEQUENCE_OFFSET,
    event: {
      type: 'CampaignSnapshotPublished',
      campaignId,
      ts,
      authorPlayerId,
      scope: 'campaign',
      payload: { state },
    },
  };
  return {
    state,
    replicaItems: [
      snapshotItem,
      ...offsetProjectorItemsForReplica(projectedItems),
    ],
    projectorHead: projectorHeadFromItems(projectedItems),
  };
}

/**
 * Client CampaignSnapshotPublished. sequence is -1 so the existing
 * guest frame handler treats it as a baseline. matchId/revision keep
 * parseCampaignCoopSnapshot satisfied without changing the client.
 */
export function roomCodeGuestClientSnapshotEvent(args: {
  readonly campaignId: string;
  readonly matchId: string;
  readonly state: ICampaignAuthoritativeState;
  readonly ts: string;
  readonly authorPlayerId: string;
  readonly revision: number;
}): ICampaignEvent<'CampaignSnapshotPublished'> {
  return freezeCampaignEvent({
    type: 'CampaignSnapshotPublished',
    sequence: -1,
    campaignId: args.campaignId,
    ts: args.ts,
    authorPlayerId: args.authorPlayerId,
    scope: 'campaign',
    payload: {
      state: args.state,
      matchId: args.matchId,
      revision: args.revision < 0 ? 0 : args.revision,
    },
  });
}
