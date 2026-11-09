/**
 * Campaign Refit Actions — commit a refit order from the mech bay
 *
 * The refit launch flow (CP3 — `add-campaign-refit-and-prestige`, design
 * D6) commits a refit order: `commitRefitOrder` creates a `proposed`
 * `IRefitOrder` for an owned unit and, on construction-validation pass,
 * advances it to `in-progress` (design D4). The order is appended to
 * `campaign.refitOrders` and the campaign is marked dirty so the
 * persistence store auto-saves.
 *
 * Mirrors `campaignCommandActions` — campaign mutation through the live
 * store, dirty-mark for the debounced auto-save, graceful failure.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module stores/campaign/campaignRefitActions
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRefitOrder } from '@/types/campaign/Refit';
import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import {
  advanceRefitOrder,
  cancelRefitOrder,
  createRefitOrder,
  getOpenRefitOrders,
} from '@/lib/campaign/refit/refitPipeline';

import { getCampaignStoreForRoster } from './campaignStoreAccessor';
import { useCampaignPersistenceStore } from './useCampaignPersistenceStore';
// Importing the campaign-store module registers the store accessor as a
// side effect (same pattern as campaignCommandActions).
import './useCampaignStore';

// =============================================================================
// Result Type
// =============================================================================

/**
 * Result of committing a refit order.
 */
export interface ICommitRefitResult {
  /** True when a refit order was created and appended to the campaign. */
  readonly applied: boolean;
  /** Human-readable failure reason when `applied` is false. */
  readonly reason?: string;
  /** The created refit order (whatever status it settled at). */
  readonly order?: IRefitOrder;
  /** Construction-validation errors when the order stayed `proposed`. */
  readonly validationErrors?: readonly string[];
}

// =============================================================================
// Commit
// =============================================================================

/**
 * Parameters for committing a refit order.
 */
export interface ICommitRefitParams {
  /** Bind editor actions to the campaign they were opened for. */
  readonly campaignId?: string;
  /** The owned campaign unit being refit. */
  readonly unitId: string;
  /** The unit's current configuration. */
  readonly currentConfiguration: MechBuildConfig;
  /** The desired target configuration. */
  readonly targetConfiguration: MechBuildConfig;
}

/**
 * Commit a refit order for an owned campaign unit.
 *
 * Creates a `proposed` `IRefitOrder` (with a fixed cost / hours estimate),
 * then attempts to advance it to `in-progress` — which is gated on the
 * target configuration passing construction validation (design D4). On a
 * validation failure the order is still persisted, in `proposed` status,
 * carrying the validation errors so the player can correct the target.
 *
 * @param params - the refit parameters
 * @returns the commit result
 */
export async function commitRefitOrder(
  params: ICommitRefitParams,
): Promise<ICommitRefitResult> {
  const store = getCampaignStoreForRoster();
  if (!store) {
    return { applied: false, reason: 'No campaign loaded' };
  }
  const campaign = store.getState().campaign as ICampaign | null;
  if (!campaign) {
    return { applied: false, reason: 'No campaign loaded' };
  }
  if (params.campaignId && campaign.id !== params.campaignId) {
    return {
      applied: false,
      reason: 'The editor belongs to another campaign.',
    };
  }
  if (campaign.coopSession?.mode === 'guest') {
    return { applied: false, reason: 'Only the host can create refit orders.' };
  }
  if (
    ![...campaign.forces.values()].some((force) =>
      force.unitIds.includes(params.unitId),
    )
  ) {
    return {
      applied: false,
      reason: 'This unit does not belong to the campaign.',
    };
  }
  if (
    getOpenRefitOrders(campaign.refitOrders ?? []).some(
      (order) => order.unitId === params.unitId,
    )
  ) {
    return {
      applied: false,
      reason: 'This unit already has an open refit order.',
    };
  }

  // Build the proposed order with a fixed estimate.
  const proposed = createRefitOrder({
    id: `refit-${params.unitId}-${Date.now()}`,
    unitId: params.unitId,
    currentConfiguration: params.currentConfiguration,
    targetConfiguration: params.targetConfiguration,
    createdAt: campaign.currentDate.toISOString(),
  });

  // Gate the proposed → in-progress advance on construction validation.
  const advance = advanceRefitOrder(proposed);
  const finalOrder = advance.order;

  const nextOrders: readonly IRefitOrder[] = [
    ...(campaign.refitOrders ?? []),
    finalOrder,
  ];
  await store.getState().updateCampaign({ refitOrders: nextOrders });
  const current = store.getState().campaign;
  if (
    current?.id !== campaign.id ||
    !current.refitOrders?.some(
      (order) =>
        order.id === finalOrder.id && order.status === finalOrder.status,
    )
  ) {
    return { applied: false, reason: 'Refit order was not saved.' };
  }
  useCampaignPersistenceStore.getState().markDirty();

  return {
    applied: true,
    order: finalOrder,
    validationErrors: advance.advanced ? undefined : advance.errors,
  };
}

/** Cancel one order, retaining terminal history and the original configuration. */
export async function cancelCampaignRefitOrder(
  campaignId: string,
  orderId: string,
): Promise<ICommitRefitResult> {
  const store = getCampaignStoreForRoster();
  const campaign = store?.getState().campaign;
  if (!store || !campaign || campaign.id !== campaignId) {
    return { applied: false, reason: 'The campaign is no longer loaded.' };
  }
  if (campaign.coopSession?.mode === 'guest') {
    return { applied: false, reason: 'Only the host can cancel refit orders.' };
  }
  const orders = campaign.refitOrders ?? [];
  const order = orders.find((candidate) => candidate.id === orderId);
  if (!order)
    return { applied: false, reason: 'The refit order was not found.' };
  const cancelled = cancelRefitOrder(order);
  if (cancelled === order) {
    return {
      applied: false,
      reason: 'This refit order is already closed.',
      order,
    };
  }
  await store.getState().updateCampaign({
    refitOrders: orders.map((candidate) =>
      candidate === order ? cancelled : candidate,
    ),
  });
  const current = store.getState().campaign;
  if (
    current?.id !== campaignId ||
    current.refitOrders?.find((candidate) => candidate.id === orderId)
      ?.status !== 'cancelled'
  ) {
    return { applied: false, reason: 'Refit cancellation was not saved.' };
  }
  useCampaignPersistenceStore.getState().markDirty();
  return { applied: true, order: cancelled };
}
