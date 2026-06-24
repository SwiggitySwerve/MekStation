/**
 * Campaign Bay Selectors
 *
 * Typed read selectors over the frozen `ICampaignInventory` projection
 * (CP1 — `add-campaign-combat-loop`) consumed by the post-battle bay UI
 * (CP2a — `add-campaign-bay-ui`).
 *
 * The inventory is attached to the campaign as `campaign.campaignInventory`
 * by the `inventoryProjectionProcessor` (a `CLEANUP`-phase day processor).
 * A campaign with no battles fought has no inventory yet — every selector
 * degrades gracefully to an empty projection so the bay surfaces render an
 * empty state rather than crashing.
 *
 * These are PURE functions of an `ICampaign` — no store subscription, no
 * mutation. Bay pages call them against `getCampaign()`.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 * @module stores/campaign/campaignBaySelectors
 */

import type { IInventoryCampaignExtensions } from '@/lib/campaign/processors/inventoryProjectionProcessor';
import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ICampaignInventory,
  IInventorySummary,
  IMedicalBayItem,
  IRepairBayItem,
  ISalvageBayItem,
} from '@/types/campaign/CampaignInventory';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';

import { projectCampaignInventory } from '@/lib/campaign/inventory/projectCampaignInventory';

// =============================================================================
// Empty Projection Constants
// =============================================================================

/**
 * The zeroed summary returned when a campaign has no inventory. Frozen so
 * every battle-free campaign shares one stable reference (selector-safe).
 */
const EMPTY_SUMMARY: IInventorySummary = Object.freeze({
  repairTicketCount: 0,
  totalRepairHours: 0,
  salvageValueTotal: 0,
  pilotsInMedical: 0,
});

/** Frozen empty bay array — shared so selectors return a stable reference. */
const EMPTY_REPAIR_BAY: readonly IRepairBayItem[] = Object.freeze([]);
const EMPTY_SALVAGE_BAY: readonly ISalvageBayItem[] = Object.freeze([]);
const EMPTY_MEDICAL_BAY: readonly IMedicalBayItem[] = Object.freeze([]);

// =============================================================================
// Inventory Access
// =============================================================================

/**
 * Read the frozen `ICampaignInventory` off a campaign, or `null` when the
 * campaign has not yet projected one (no battles fought).
 *
 * @param campaign - the live campaign, or `null` when none is loaded
 */
export function selectCampaignInventory(
  campaign: ICampaign | null,
): ICampaignInventory | null {
  if (!campaign) return null;
  const extended = campaign as ICampaign & IInventoryCampaignExtensions;
  return extended.campaignInventory ?? null;
}

function projectInventoryForDisplay(
  campaign: ICampaign | null,
  rosterPilots: readonly ICampaignRosterEntry[] = [],
): ICampaignInventory | null {
  if (!campaign) return null;
  return (
    selectCampaignInventory(campaign) ??
    projectCampaignInventory(
      campaign,
      rosterPilots,
      campaign.currentDate.toISOString(),
    )
  );
}

// =============================================================================
// Bay Selectors
// =============================================================================

/**
 * Project the repair-bay line items. Returns an empty array for a
 * battle-free campaign.
 */
export function selectRepairBay(
  campaign: ICampaign | null,
): readonly IRepairBayItem[] {
  return projectInventoryForDisplay(campaign)?.repairBay ?? EMPTY_REPAIR_BAY;
}

/**
 * Project the salvage-bay line items. Returns an empty array for a
 * battle-free campaign.
 */
export function selectSalvageBay(
  campaign: ICampaign | null,
): readonly ISalvageBayItem[] {
  return projectInventoryForDisplay(campaign)?.salvageBay ?? EMPTY_SALVAGE_BAY;
}

/**
 * Project the medical-bay line items. Returns an empty array for a
 * campaign with no injured pilots.
 */
export function selectMedicalBay(
  campaign: ICampaign | null,
  rosterPilots: readonly ICampaignRosterEntry[] = [],
): readonly IMedicalBayItem[] {
  return (
    projectInventoryForDisplay(campaign, rosterPilots)?.medicalBay ??
    EMPTY_MEDICAL_BAY
  );
}

/**
 * Project the roll-up inventory summary. Returns a zeroed summary for a
 * battle-free campaign.
 */
export function selectInventorySummary(
  campaign: ICampaign | null,
  rosterPilots: readonly ICampaignRosterEntry[] = [],
): IInventorySummary {
  return (
    projectInventoryForDisplay(campaign, rosterPilots)?.summary ?? EMPTY_SUMMARY
  );
}

// =============================================================================
// Derived Bay Helpers
// =============================================================================

/**
 * Count the repair-bay tickets targeting a given unit. Used by the Mech
 * Bay grid to show a per-unit ticket count without re-grouping the whole
 * queue at every row.
 *
 * @param campaign - the live campaign
 * @param unitId - the roster unit id
 */
export function selectRepairTicketCountForUnit(
  campaign: ICampaign | null,
  unitId: string,
): number {
  return selectRepairBay(campaign).filter((item) => item.unitId === unitId)
    .length;
}

/**
 * Group repair-bay items by `unitId` for the Repair Bay's per-unit
 * ticket grouping. The returned map preserves the queue's encounter
 * order within each group.
 *
 * @param items - repair-bay line items (typically `selectRepairBay(...)`)
 */
export function groupRepairBayByUnit(
  items: readonly IRepairBayItem[],
): ReadonlyMap<string, readonly IRepairBayItem[]> {
  const grouped = new Map<string, IRepairBayItem[]>();
  for (const item of items) {
    const bucket = grouped.get(item.unitId);
    if (bucket) {
      bucket.push(item);
    } else {
      grouped.set(item.unitId, [item]);
    }
  }
  return grouped;
}

/**
 * Sum the recovered value of every salvage item the player has accepted.
 *
 * This is the running mercenary-share value total (design D5): a PURE
 * projection over item `status` — only `accepted` items contribute, so
 * toggling one item's status recomputes the total without any
 * incremental accumulator that could double-count (design Risk note).
 *
 * @param items - salvage-bay line items (typically `selectSalvageBay(...)`)
 */
export function computeAcceptedSalvageValue(
  items: readonly ISalvageBayItem[],
): number {
  return items
    .filter((item) => item.status === 'accepted')
    .reduce((sum, item) => sum + item.recoveredValue, 0);
}
