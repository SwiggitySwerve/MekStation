/**
 * Campaign Bay Actions
 *
 * The three small value-bearing mutations the post-battle bay UI (CP2a —
 * `add-campaign-bay-ui`) performs over existing campaign state:
 *
 *  1. `reorderRepairTicketPriority` — writes a `priority` ordinal onto the
 *     campaign's `repairQueue` tickets (design D3).
 *  2. `setSalvageItemStatus` — flips a salvage candidate's `status`
 *     (`pending → accepted | declined`) on the campaign's
 *     `salvageAllocations` mercenary award (design D5).
 *
 * Per design D6 every mutation routes through `useCampaignStore.updateCampaign`
 * (which writes the live `ICampaign`) and then marks the campaign dirty via
 * `useCampaignPersistenceStore.markDirty()` so the debounced auto-save (CP0)
 * picks it up. No bay surface writes to the server directly.
 *
 * These actions do NOT add business logic — the repair / salvage engines
 * compute ticket content and recovered value; this module only records the
 * player's work-order and accept/decline decisions.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 * @module stores/campaign/campaignBayActions
 */

import type { IInventoryProjectionSources } from '@/lib/campaign/inventory/projectCampaignInventory';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IPartsInventoryItem } from '@/types/campaign/PartsInventory';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type {
  ISalvageAllocation,
  ISalvageCandidate,
} from '@/types/campaign/Salvage';

import { projectCampaignInventory } from '@/lib/campaign/inventory/projectCampaignInventory';
import { addInventoryItem } from '@/lib/campaign/partsInventory';

import { getCampaignStoreForRoster } from './campaignStoreAccessor';
import { useCampaignPersistenceStore } from './useCampaignPersistenceStore';
import { useCampaignRosterStore } from './useCampaignRosterStore';
// Importing the campaign-store module registers the store accessor as a
// side effect (`registerCampaignStoreAccessor` runs at module load), so
// `getCampaignStoreForRoster()` resolves without this module calling the
// `useCampaignStore` accessor (which the React-hooks lint rule forbids
// outside a component).
import './useCampaignStore';

// =============================================================================
// Campaign Mutation Surface
// =============================================================================

/** Campaign narrowed to the repair-queue / salvage write surface. */
type ICampaignWithBays = ICampaign & IInventoryProjectionSources;

/**
 * Apply a campaign mutation through the live campaign store and mark the
 * campaign dirty so the persistence store's debounced auto-save fires
 * (design D6). Shared by every bay action.
 *
 * @param mutate - pure transform producing the next campaign extension fields
 */
function applyCampaignMutation(
  mutate: (campaign: ICampaignWithBays) => Partial<ICampaign>,
): void {
  const store = getCampaignStoreForRoster();
  if (!store) return;
  const campaign = store.getState().campaign as ICampaignWithBays | null;
  if (!campaign) return;

  const updates = mutate(campaign);
  // Merge the mutation onto the campaign so the inventory re-projection
  // below sees the new `repairQueue` / `salvageAllocations` state.
  const mutated = { ...campaign, ...updates } as ICampaignWithBays;

  // The frozen `ICampaignInventory` is a derived projection — it is
  // normally recomputed by the day-advancement `inventoryProjectionProcessor`.
  // A bay mutation between days must re-project so the bay surfaces and the
  // running salvage-value total reflect the change immediately rather than
  // waiting for the next day (design D5 — the total is a pure projection).
  const rosterPilots = useCampaignRosterStore.getState().pilots;
  const inventory = projectCampaignInventory(
    mutated,
    rosterPilots,
    new Date().toISOString(),
  );

  store.getState().updateCampaign({
    ...updates,
    campaignInventory: inventory,
  } as Partial<ICampaign>);
  // Route through the persistence store so the debounced auto-save picks
  // up the change (design D6). No direct server write.
  useCampaignPersistenceStore.getState().markDirty();
}

// =============================================================================
// Repair Bay — Priority Reorder
// =============================================================================

/**
 * Result of a priority-reorder request.
 */
export interface IReorderResult {
  /** True when the reorder was applied (campaign loaded, ticket found). */
  readonly applied: boolean;
}

/**
 * Reorder the repair queue by writing fresh `priority` ordinals.
 *
 * The caller supplies the desired ticket-id order (the post-drag order
 * of one unit's group, or the whole queue). Each id in `orderedTicketIds`
 * receives an ascending ordinal (0, 1, 2, …) on its `IRepairTicket`;
 * tickets not named keep their existing `priority`. Ticket content is
 * untouched — only work order changes (design D3).
 *
 * Marks the campaign dirty so the persistence store auto-saves
 * (design D6 — the reorder mutates the live `ICampaign`).
 *
 * @param orderedTicketIds - ticket ids in their new work order
 */
export function reorderRepairTicketPriority(
  orderedTicketIds: readonly string[],
): IReorderResult {
  let applied = false;

  applyCampaignMutation((campaign) => {
    const queue = campaign.repairQueue ?? [];
    // Map ticket id → its new ordinal. Tickets absent from the request
    // keep whatever priority they already carried.
    const ordinalById = new Map<string, number>();
    orderedTicketIds.forEach((ticketId, index) => {
      ordinalById.set(ticketId, index);
    });

    const nextQueue: IRepairTicket[] = queue.map((ticket) => {
      const ordinal = ordinalById.get(ticket.ticketId);
      if (ordinal === undefined) return ticket;
      applied = true;
      return { ...ticket, priority: ordinal };
    });

    return { repairQueue: nextQueue } as Partial<ICampaign>;
  });

  return { applied };
}

// =============================================================================
// Salvage Bay — Accept / Decline
// =============================================================================

/**
 * The frozen-schema status a salvage item can be moved to by the UI.
 * (`pending` is the engine's initial state; the player only sets the
 * two terminal decisions.)
 */
export type SalvageDecision = 'accepted' | 'declined';

/**
 * Result of a salvage accept/decline request.
 */
export interface ISalvageDecisionResult {
  /** True when the decision was applied (campaign loaded, candidate found). */
  readonly applied: boolean;
}

/**
 * Map the bay UI's `accepted | declined` decision onto the engine's
 * `ISalvageCandidate.status` vocabulary. The engine uses `awarded` for an
 * accepted candidate (`projectCampaignInventory.mapSalvageStatus` collapses
 * `awarded` → `accepted` on the way back out); `declined` is shared.
 */
function decisionToCandidateStatus(
  decision: SalvageDecision,
): 'awarded' | 'declined' {
  return decision === 'accepted' ? 'awarded' : 'declined';
}

function salvageInventoryItem(
  candidate: ISalvageCandidate,
): IPartsInventoryItem {
  const partId = candidate.partId ?? candidate.unitId;
  return {
    inventoryId: `salvage-${candidate.destroyedFromBattle}-${partId}`,
    partId,
    partName: candidate.designation,
    quantity: 1,
    source: 'salvage',
    acquiredAt: new Date().toISOString(),
    unitId: candidate.unitId,
    location: candidate.location,
  };
}

function addUnitToRootForce(
  campaign: ICampaign,
  unitId: string,
): ICampaign['forces'] {
  const rootForce = campaign.forces.get(campaign.rootForceId);
  if (!rootForce || rootForce.unitIds.includes(unitId)) {
    return campaign.forces;
  }

  const nextForces = new Map(campaign.forces);
  nextForces.set(rootForce.id, {
    ...rootForce,
    unitIds: [...rootForce.unitIds, unitId],
    updatedAt: new Date().toISOString(),
  });
  return nextForces;
}

/**
 * Record the player's accept/decline decision on a salvage candidate.
 *
 * Finds the candidate by `partId` (falling back to its `unitId`, matching
 * the projection's `partId ?? unitId` rule) inside every allocation's
 * mercenary award and flips its `status`. The salvage *computation*
 * (recovered value, disposition) is untouched — this only records the
 * player's decision on already-computed candidates (design D5).
 *
 * Marks the campaign dirty so the persistence store auto-saves (design D6).
 *
 * @param partId - the salvage item id (`ISalvageBayItem.partId`)
 * @param decision - `accepted` or `declined`
 */
export function setSalvageItemStatus(
  partId: string,
  decision: SalvageDecision,
): ISalvageDecisionResult {
  let applied = false;
  const nextStatus = decisionToCandidateStatus(decision);

  applyCampaignMutation((campaign) => {
    const allocations = campaign.salvageAllocations ?? {};
    const nextAllocations: Record<string, ISalvageAllocation> = {};
    let nextPartsInventory = campaign.partsInventory ?? [];
    let nextForces = campaign.forces;

    for (const [battleId, allocation] of Object.entries(allocations)) {
      const nextCandidates = allocation.mercenaryAward.candidates.map(
        (candidate) => {
          // `projectCampaignInventory` derives the bay item's `partId`
          // as `candidate.partId ?? candidate.unitId` — match the same
          // rule so the UI's id resolves back to the right candidate.
          const candidateId = candidate.partId ?? candidate.unitId;
          if (candidateId !== partId) return candidate;
          applied = true;
          if (nextStatus === 'awarded') {
            if (candidate.source === 'part') {
              nextPartsInventory = addInventoryItem(
                nextPartsInventory,
                salvageInventoryItem(candidate),
              );
            } else {
              nextForces = addUnitToRootForce(
                { ...campaign, forces: nextForces },
                candidate.unitId,
              );
            }
          }
          return { ...candidate, status: nextStatus };
        },
      );

      nextAllocations[battleId] = {
        ...allocation,
        mercenaryAward: {
          ...allocation.mercenaryAward,
          candidates: nextCandidates,
        },
      };
    }

    return {
      salvageAllocations: nextAllocations,
      forces: nextForces,
      partsInventory: nextPartsInventory,
    } as Partial<ICampaign>;
  });

  return { applied };
}
