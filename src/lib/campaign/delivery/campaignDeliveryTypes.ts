/**
 * Per-grant campaign delivery types (design D4, task 3.2).
 *
 * The privacy-owned delivery epoch is the sequence authority. This
 * module never mints a campaign-specific allocator or raw-journal
 * cursor. Wire items carry only the per-grant deliverySequence plus
 * the projected campaign event; journal positions, global revision,
 * commitPosition, and eventDigest stay off this surface so withheld
 * activity cannot be counted or timed.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D4)
 */

import type {
  IDeliveryCursor,
  IDeliveryEpochBaseline,
} from '@/lib/multiplayer/server/delivery/IDeliveryEpochStore';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { DELIVERY_EPOCH_STALE_MESSAGE } from '@/lib/multiplayer/server/delivery/IDeliveryEpochStore';

/**
 * Projector version bound into the delivery-epoch 8-tuple. Bump only
 * when the projection function itself changes; never take this from
 * a client field.
 */
export const CAMPAIGN_GRANT_PROJECTOR_VERSION = 1 as const;

/** Injected clock. Delivery modules never read the system clock. */
export type CampaignGrantClock = () => string;

/**
 * Campaign event as delivered to one grant: the durable envelope minus
 * the source stream sequence. That sequence is a global journal
 * position; leaving it on the wire would let a consumer count gaps
 * from withheld events. Ordering authority is deliverySequence.
 */
export type ICampaignGrantProjectedEvent = {
  readonly [K in keyof ICampaignEvent as K extends 'sequence'
    ? never
    : K]: ICampaignEvent[K];
};

/**
 * One delivered item. This is the entire wire-visible row: sequence
 * assigned inside the grant's delivery epoch, plus the projected
 * event. No identity, reuse flag, or journal field belongs here.
 */
export interface ICampaignGrantDeliveryItem {
  readonly deliverySequence: number;
  readonly event: ICampaignGrantProjectedEvent;
}

export const CAMPAIGN_GRANT_DELIVERY_REFUSED_REASON =
  'no-active-membership' as const;

/**
 * Grant is not an active membership. Distinct from an empty page: the
 * resolver never minted a viewer and the scope filter did not run.
 */
export interface IProjectCampaignStreamRefused {
  readonly kind: 'refused';
  readonly reason: typeof CAMPAIGN_GRANT_DELIVERY_REFUSED_REASON;
}

/**
 * Successful page of in-scope events. items may be empty when the
 * grant is active but no stamped scope matches; that is still a page,
 * not a membership refusal.
 */
export interface IProjectCampaignStreamPage {
  readonly kind: 'page';
  readonly deliveryEpochId: string;
  readonly effectiveGeneration: number;
  readonly items: readonly ICampaignGrantDeliveryItem[];
  readonly baseline: IDeliveryEpochBaseline;
}

/**
 * Cursor named a foreign or moved epoch. Mirrors projectWithCursor:
 * the caller receives a fresh baseline and no items; no sequence
 * assignment runs.
 */
export interface IProjectCampaignStreamStaleEpoch {
  readonly kind: 'stale-epoch';
  readonly message: typeof DELIVERY_EPOCH_STALE_MESSAGE;
  readonly newBaseline: IDeliveryEpochBaseline;
}

export type ProjectCampaignStreamResult =
  | IProjectCampaignStreamPage
  | IProjectCampaignStreamStaleEpoch
  | IProjectCampaignStreamRefused;

export type { IDeliveryCursor, IDeliveryEpochBaseline };
export { DELIVERY_EPOCH_STALE_MESSAGE };
