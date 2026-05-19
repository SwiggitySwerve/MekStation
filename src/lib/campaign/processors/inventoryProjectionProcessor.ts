/**
 * Inventory Projection Processor
 *
 * Per `add-campaign-combat-loop` D5: a `CLEANUP`-phase day processor
 * that runs `projectCampaignInventory` after the battle-effects
 * processor block (`postBattleProcessor` → `salvageProcessor` →
 * `repairQueueBuilderProcessor`) has drained, and attaches the frozen
 * `ICampaignInventory` to the campaign snapshot.
 *
 * Phase: `DayPhase.CLEANUP` (900) — strictly after the battle-effects
 * block (`MISSIONS - 50/-25/-10`), so the projection always reflects
 * post-battle state. The day pipeline's phase ordering guarantees it.
 *
 * The projection is derived: it is recomputed every day and never an
 * independently-mutated store. A campaign with no battles produces an
 * empty `ICampaignInventory` with a zeroed summary.
 *
 * @spec openspec/changes/add-campaign-combat-loop/specs/campaign-combat-loop/spec.md
 * @module lib/campaign/processors/inventoryProjectionProcessor
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignInventory } from '@/types/campaign/CampaignInventory';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';

import { projectCampaignInventory } from '@/lib/campaign/inventory/projectCampaignInventory';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';

import {
  DayPhase,
  getDayPipeline,
  type IDayProcessor,
  type IDayProcessorResult,
} from '../dayPipeline';

// =============================================================================
// Campaign Extension
// =============================================================================

/**
 * Campaign field written by the inventory projection processor. Optional
 * so existing `ICampaign` consumers are unaffected.
 */
export interface IInventoryCampaignExtensions {
  /**
   * The frozen post-battle inventory aggregate (design.md D4). Derived
   * and recomputed each day; CP2a (`add-campaign-bay-ui`) renders it.
   */
  readonly campaignInventory?: ICampaignInventory;
}

/** Campaign narrowed to the projection processor's write surface. */
export type ICampaignWithInventory = ICampaign & IInventoryCampaignExtensions;

// =============================================================================
// Pure Apply Helper
// =============================================================================

/**
 * Attach a freshly-projected `ICampaignInventory` to a campaign.
 *
 * Pure given the roster-pilot list — exposed separately from the day
 * processor so tests can exercise the projection-and-attach step
 * without standing up the roster store.
 *
 * @param campaign - the post-battle campaign
 * @param rosterPilots - roster entries from `useCampaignRosterStore`
 * @param generatedAt - ISO timestamp (caller-supplied for determinism)
 */
export function attachCampaignInventory(
  campaign: ICampaign,
  rosterPilots: readonly ICampaignRosterEntry[],
  generatedAt: string,
): ICampaignWithInventory {
  const inventory = projectCampaignInventory(
    campaign,
    rosterPilots,
    generatedAt,
  );
  return {
    ...campaign,
    campaignInventory: inventory,
  };
}

// =============================================================================
// Day Processor
// =============================================================================

/**
 * Inventory projection day processor.
 *
 * Runs in `DayPhase.CLEANUP` — strictly after the battle-effects block
 * — and attaches the projected `ICampaignInventory` to the campaign
 * snapshot. Reads roster pilot injury state from `useCampaignRosterStore`
 * (the canonical personnel source, mirroring `postBattleProcessor`).
 */
export const inventoryProjectionProcessor: IDayProcessor = {
  id: 'inventory-projection',
  phase: DayPhase.CLEANUP,
  displayName: 'Post-Battle Inventory Projection',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    const rosterPilots = useCampaignRosterStore.getState().pilots;
    const updated = attachCampaignInventory(
      campaign,
      rosterPilots,
      date.toISOString(),
    );
    return { events: [], campaign: updated };
  },
};

/**
 * Register the inventory projection processor with the day pipeline.
 * Used by `processorRegistration.ts`.
 */
export function registerInventoryProjectionProcessor(): void {
  getDayPipeline().register(inventoryProjectionProcessor);
}
