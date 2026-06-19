/**
 * Auto-Logistics Scanner
 *
 * Scans units for needed parts and auto-queues acquisition requests.
 *
 * @stub This is a stub implementation. Full functionality requires Plan 3 (Repair System)
 * to provide parts inventory and unit maintenance state.
 *
 * Deferred(plan-3-parts-scanning): wire to repair-system parts inventory once Plan 3 lands.
 * Unblocking dependencies (must exist before this stub becomes a real implementation):
 *   1. `IRepairJob.requiredParts: IPartId[]` — exposed by the repair store/service.
 *   2. `IPartsInventory` snapshot reachable from `ICampaign` (per-warehouse counts).
 *   3. `IPartCatalog.stockTargetPercent` — target stocking ratio per part type.
 * When those land, replace the stub body with: walk `campaign.forces` → collect open
 * repair jobs → diff `requiredParts` against `IPartsInventory` → emit
 * `IAcquisitionRequest` for the gap, deduped against `campaign.shoppingList`.
 */

import type { IAcquisitionRequest } from '@/types/campaign/acquisition/acquisitionTypes';
import type { ICampaign } from '@/types/campaign/Campaign';

/**
 * Scans units for needed parts and generates acquisition requests.
 *
 * @stub This is a stub implementation. Full functionality requires Plan 3 (Repair System)
 * to provide parts inventory and unit maintenance state.
 *
 * Deferred(plan-3-parts-scanning): see file-level comment for the unblock checklist.
 * Returns `[]` until the repair-system inventory + parts catalog are wired up.
 *
 * @param campaign - Campaign to scan
 * @param options - Auto-logistics options (stock target, etc.)
 * @returns Array of acquisition requests (empty until Plan 3)
 */
export function scanForNeededParts(
  campaign: ICampaign,
  options?: {
    stockTargetPercent?: number;
    skipQueuedParts?: boolean;
  },
): IAcquisitionRequest[] {
  // Stub: Return empty array until Plan 3 provides parts data

  void campaign;

  void options;
  return [];
}
