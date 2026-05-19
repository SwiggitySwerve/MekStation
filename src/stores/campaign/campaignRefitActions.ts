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
  createRefitOrder,
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
export function commitRefitOrder(
  params: ICommitRefitParams,
): ICommitRefitResult {
  const store = getCampaignStoreForRoster();
  if (!store) {
    return { applied: false, reason: 'No campaign loaded' };
  }
  const campaign = store.getState().campaign as ICampaign | null;
  if (!campaign) {
    return { applied: false, reason: 'No campaign loaded' };
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
  store.getState().updateCampaign({ refitOrders: nextOrders });
  useCampaignPersistenceStore.getState().markDirty();

  return {
    applied: true,
    order: finalOrder,
    validationErrors: advance.advanced ? undefined : advance.errors,
  };
}
