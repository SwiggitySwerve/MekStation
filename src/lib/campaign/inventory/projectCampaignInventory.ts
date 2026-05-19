/**
 * Campaign inventory projection
 *
 * Per `add-campaign-combat-loop` D5: `projectCampaignInventory` is a
 * pure function that reads the campaign's repair tickets, salvage
 * allocations, and roster pilot injury state and assembles the frozen
 * `ICampaignInventory` (design.md D4) the bay UI (CP2a) renders.
 *
 * The projection is derived and recomputed each day — it is never an
 * independently-mutated store. A campaign with no battles fought
 * produces an empty inventory with a zeroed summary.
 *
 * @spec openspec/changes/add-campaign-combat-loop/specs/campaign-combat-loop/spec.md
 * @module lib/campaign/inventory/projectCampaignInventory
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ICampaignInventory,
  IInventorySummary,
  IMedicalBayItem,
  IRepairBayItem,
  ISalvageBayItem,
} from '@/types/campaign/CampaignInventory';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type { ISalvageAllocation } from '@/types/campaign/Salvage';

import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';

// =============================================================================
// Projection Inputs
// =============================================================================

/**
 * Campaign extension fields the inventory projection reads. All
 * optional — a campaign with no battles fought has none of them, and
 * the projection yields an empty inventory.
 */
export interface IInventoryProjectionSources {
  /** Per-location repair tickets (from `repairQueueBuilderProcessor`). */
  readonly repairQueue?: readonly IRepairTicket[];
  /** Per-battle salvage allocations (from `salvageProcessor`). */
  readonly salvageAllocations?: Readonly<Record<string, ISalvageAllocation>>;
}

/** Campaign narrowed to the projection's read surface. */
export type ICampaignForInventory = ICampaign & IInventoryProjectionSources;

// =============================================================================
// Repair Bay Projection
// =============================================================================

/**
 * Map an `IRepairTicket` lifecycle status onto the frozen bay-item
 * status. `IRepairTicket` carries `cancelled` and `completed`; the
 * frozen schema (D4) uses `done` for completed and drops cancelled
 * tickets entirely (see `projectRepairBay`).
 */
function mapRepairStatus(
  status: IRepairTicket['status'],
): IRepairBayItem['status'] {
  switch (status) {
    case 'completed':
      return 'done';
    case 'in-progress':
      return 'in-progress';
    case 'parts-needed':
      return 'parts-needed';
    case 'queued':
    case 'cancelled':
    default:
      return 'queued';
  }
}

/**
 * Project the repair queue into frozen `IRepairBayItem`s. Cancelled
 * tickets are dropped — they are not active repair work.
 */
function projectRepairBay(
  tickets: readonly IRepairTicket[],
): readonly IRepairBayItem[] {
  return tickets
    .filter((ticket) => ticket.status !== 'cancelled')
    .map((ticket) => ({
      ticketId: ticket.ticketId,
      unitId: ticket.unitId,
      kind: ticket.kind,
      location: ticket.location ?? null,
      expectedHours: ticket.expectedHours,
      // `partsReady` is true when every required part has been matched.
      // A ticket with no parts (e.g. heat-recovery) is trivially ready.
      partsReady: ticket.partsRequired.every((part) => part.matched),
      status: mapRepairStatus(ticket.status),
    }));
}

// =============================================================================
// Salvage Bay Projection
// =============================================================================

/**
 * Map an `ISalvageCandidate` disposition onto the frozen two-value bay
 * disposition. Auction dispositions collapse onto their underlying
 * recipient.
 */
function mapSalvageDisposition(
  disposition: string,
): ISalvageBayItem['disposition'] {
  return disposition.includes('employer') ? 'employer' : 'mercenary';
}

/**
 * Map an `ISalvageCandidate` status onto the frozen bay status. The
 * engine's `awarded` / `auctioned` collapse onto `accepted`; `declined`
 * stays declined; everything else is `pending`.
 */
function mapSalvageStatus(status: string): ISalvageBayItem['status'] {
  switch (status) {
    case 'awarded':
    case 'auctioned':
      return 'accepted';
    case 'declined':
      return 'declined';
    case 'pending':
    default:
      return 'pending';
  }
}

/**
 * Project every salvage allocation into frozen `ISalvageBayItem`s.
 *
 * Only the mercenary award's candidates land in the bay — the bay
 * tracks what the player's unit recovered. The summary's
 * `salvageValueTotal` is the mercenary-share total (design.md D4).
 */
function projectSalvageBay(
  allocations: Readonly<Record<string, ISalvageAllocation>>,
): readonly ISalvageBayItem[] {
  const items: ISalvageBayItem[] = [];
  for (const allocation of Object.values(allocations)) {
    for (const candidate of allocation.mercenaryAward.candidates) {
      items.push({
        // `partId` is set for part-source candidates; fall back to the
        // unit id for whole-unit candidates so the field is always
        // populated.
        partId: candidate.partId ?? candidate.unitId,
        sourceUnitId: candidate.unitId,
        designation: candidate.designation,
        recoveredValue: candidate.recoveredValue,
        disposition: mapSalvageDisposition(candidate.disposition),
        status: mapSalvageStatus(candidate.status),
      });
    }
  }
  return items;
}

// =============================================================================
// Medical Bay Projection
// =============================================================================

/**
 * Map a roster entry's `CampaignPilotStatus` onto the frozen injury
 * level. `Active` pilots are not injured and never enter the bay.
 */
function mapInjuryLevel(
  status: CampaignPilotStatus,
): IMedicalBayItem['injuryLevel'] {
  switch (status) {
    case CampaignPilotStatus.Wounded:
      // A wounded pilot's severity scales with wound count at the
      // caller; the base mapping treats Wounded as `light`/`serious`
      // via the wound count refinement in `projectMedicalBay`.
      return 'light';
    case CampaignPilotStatus.Critical:
      return 'critical';
    case CampaignPilotStatus.MIA:
      // MIA pilots are unavailable but not dead — surface as serious.
      return 'serious';
    case CampaignPilotStatus.KIA:
      return 'kia';
    case CampaignPilotStatus.Active:
    default:
      return 'none';
  }
}

/**
 * Project the campaign-roster pilot injury state into frozen
 * `IMedicalBayItem`s.
 *
 * Only non-`Active` pilots enter the medical bay. A wounded pilot with
 * 3+ wounds is escalated from `light` to `serious`. `daysToRecover`
 * comes from the roster entry's `recoveryTime`.
 *
 * @param rosterPilots - roster entries from `useCampaignRosterStore`
 */
export function projectMedicalBay(
  rosterPilots: readonly ICampaignRosterEntry[],
): readonly IMedicalBayItem[] {
  const items: IMedicalBayItem[] = [];
  for (const entry of rosterPilots) {
    if (entry.status === CampaignPilotStatus.Active) continue;

    let injuryLevel = mapInjuryLevel(entry.status);
    // Escalate a heavily-wounded pilot from light to serious.
    if (injuryLevel === 'light' && entry.wounds >= 3) {
      injuryLevel = 'serious';
    }

    // Lifecycle status: KIA pilots are discharged; a pilot with no
    // recovery time left is ready to return; otherwise recovering.
    const status: IMedicalBayItem['status'] =
      entry.status === CampaignPilotStatus.KIA
        ? 'discharged'
        : entry.recoveryTime <= 0
          ? 'ready'
          : 'recovering';

    items.push({
      pilotId: entry.pilotId,
      pilotName: entry.pilotName,
      injuryLevel,
      daysToRecover: Math.max(0, entry.recoveryTime),
      status,
    });
  }
  return items;
}

// =============================================================================
// Summary
// =============================================================================

/**
 * Build the roll-up summary from the three projected bays.
 */
function buildSummary(
  repairBay: readonly IRepairBayItem[],
  salvageBay: readonly ISalvageBayItem[],
  medicalBay: readonly IMedicalBayItem[],
): IInventorySummary {
  return {
    repairTicketCount: repairBay.length,
    totalRepairHours: repairBay.reduce(
      (sum, item) => sum + item.expectedHours,
      0,
    ),
    salvageValueTotal: salvageBay.reduce(
      (sum, item) => sum + item.recoveredValue,
      0,
    ),
    pilotsInMedical: medicalBay.length,
  };
}

// =============================================================================
// Projection Entry Point
// =============================================================================

/**
 * Project an `ICampaignInventory` from a campaign's post-battle state.
 *
 * Pure: reads `campaign.repairQueue`, `campaign.salvageAllocations`,
 * and the supplied roster pilot list, returning the frozen aggregate.
 * An empty campaign yields empty bays and a zeroed summary.
 *
 * @param campaign - the campaign to project (post-battle state)
 * @param rosterPilots - roster entries from `useCampaignRosterStore`
 * @param generatedAt - ISO timestamp (caller-supplied for determinism)
 */
export function projectCampaignInventory(
  campaign: ICampaign,
  rosterPilots: readonly ICampaignRosterEntry[],
  generatedAt: string,
): ICampaignInventory {
  const extended = campaign as ICampaignForInventory;

  const repairBay = projectRepairBay(extended.repairQueue ?? []);
  const salvageBay = projectSalvageBay(extended.salvageAllocations ?? {});
  const medicalBay = projectMedicalBay(rosterPilots);

  return {
    campaignId: campaign.id,
    generatedAt,
    repairBay,
    salvageBay,
    medicalBay,
    summary: buildSummary(repairBay, salvageBay, medicalBay),
  };
}
