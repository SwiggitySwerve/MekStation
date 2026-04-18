/**
 * Repair Queue Builder — derives IRepairTicket entries from post-battle state
 *
 * Pure functions. No side effects, no IO. Given a unit's current
 * combat state and its max (full-health) state, emit one ticket per
 * damaged location, destroyed component, and depleted ammo bin. The
 * processor wraps these and persists them on the campaign.
 *
 * Hour estimates come from a simple table that mirrors MekHQ's defaults:
 * - 0.1 hours per armor point (fast patch work)
 * - 0.5 hours per structure point (welding internal struts)
 * - 4 hours per component swap (mount + calibrate)
 * - 0.5 hours per ammo bin restock
 * - 0 hours for heat recovery (passive cooldown)
 *
 * @module lib/campaign/repair/repairQueueBuilder
 */

import type {
  IRepairPartRequirement,
  IRepairTicket,
  RepairTicketKind,
} from "@/types/campaign/RepairTicket";
import type {
  IUnitCombatState,
  IUnitMaxState,
} from "@/types/campaign/UnitCombatState";

// =============================================================================
// Hour Estimates
// =============================================================================

const HOURS_PER_ARMOR_POINT = 0.1;
const HOURS_PER_STRUCTURE_POINT = 0.5;
const HOURS_PER_COMPONENT_SWAP = 4;
const HOURS_PER_AMMO_RESTOCK = 0.5;
const HOURS_PER_HEAT_RECOVERY = 0;

/**
 * Estimate the tech-hours required for a single repair ticket.
 *
 * For armor/structure, `points` is the number of points to restore.
 * For component, `points` is the count of components (typically 1).
 * For ammo, `points` is unused (flat 0.5h per restock).
 * For heat-recovery, returns 0 (passive cooldown, not real work).
 */
export function estimateRepairHours(
  kind: RepairTicketKind,
  points: number,
): number {
  switch (kind) {
    case "armor":
      return Math.max(0, points) * HOURS_PER_ARMOR_POINT;
    case "structure":
      return Math.max(0, points) * HOURS_PER_STRUCTURE_POINT;
    case "component":
      return Math.max(1, points) * HOURS_PER_COMPONENT_SWAP;
    case "ammo":
      return HOURS_PER_AMMO_RESTOCK;
    case "heat-recovery":
      return HOURS_PER_HEAT_RECOVERY;
    default:
      return 0;
  }
}

// =============================================================================
// Salvage Pool (minimal shape — Sub-Branch 3a owns the real type)
// =============================================================================

/**
 * Minimal salvage pool shape for parts matching.
 *
 * Sub-Branch 3a (salvage rules engine) owns the canonical type. We
 * declare only what we need so the builder is self-contained.
 */
export interface ISalvagePool {
  readonly availableParts: ReadonlyArray<{
    readonly partId: string;
    readonly quantity: number;
    readonly inventoryId: string;
  }>;
}

// =============================================================================
// Ticket ID Generation
// =============================================================================

/**
 * Build a deterministic ticket ID so re-runs of the same outcome
 * produce the same ticket IDs (idempotency hook for the processor).
 */
function buildTicketId(
  matchId: string | null,
  unitId: string,
  kind: RepairTicketKind,
  discriminator: string,
): string {
  const match = matchId ?? "manual";
  return `ticket-${match}-${unitId}-${kind}-${discriminator}`;
}

// =============================================================================
// Per-Unit Ticket Generation
// =============================================================================

/**
 * Inputs for per-unit ticket generation.
 */
export interface IBuildTicketsInput {
  /** Current combat state (post-battle) */
  readonly state: IUnitCombatState;
  /** Max/full-health reference state */
  readonly maxState: IUnitMaxState;
  /** Originating match ID (null if synthetic / manual) */
  readonly matchId: string | null;
  /** Creation timestamp (ISO 8601) — caller-supplied for testability */
  readonly createdAt: string;
}

/**
 * Build all repair tickets for one unit, by diffing current vs max state.
 *
 * Produces, in order:
 *   1. One armor ticket per location with armor loss
 *   2. One structure ticket per location with structure loss
 *      (also covers fully destroyed locations)
 *   3. One component ticket per destroyed component
 *   4. One ammo ticket per bin where current < max
 *
 * If the unit is intact, returns an empty array.
 */
export function buildTicketsFromUnitState(
  input: IBuildTicketsInput,
): IRepairTicket[] {
  const { state, maxState, matchId, createdAt } = input;
  const tickets: IRepairTicket[] = [];

  // 1. Armor tickets — diff current vs max per location
  for (const [location, maxArmor] of Object.entries(
    maxState.maxArmorPerLocation,
  )) {
    const currentArmor = state.currentArmorPerLocation[location] ?? maxArmor;
    const lost = maxArmor - currentArmor;
    if (lost > 0) {
      tickets.push({
        ticketId: buildTicketId(matchId, state.unitId, "armor", location),
        unitId: state.unitId,
        kind: "armor",
        location,
        pointsToRestore: lost,
        expectedHours: estimateRepairHours("armor", lost),
        partsRequired: [
          {
            partId: "standard-armor-pt",
            quantity: lost,
            matched: false,
          },
        ],
        source: "combat",
        matchId,
        createdAt,
        status: "queued",
      });
    }
  }

  // 2. Structure tickets — diff current vs max per location
  // (Includes fully destroyed locations — destroyed loc has structure = 0)
  for (const [location, maxStructure] of Object.entries(
    maxState.maxStructurePerLocation,
  )) {
    const currentStructure =
      state.currentStructurePerLocation[location] ?? maxStructure;
    const lost = maxStructure - currentStructure;
    if (lost > 0) {
      tickets.push({
        ticketId: buildTicketId(matchId, state.unitId, "structure", location),
        unitId: state.unitId,
        kind: "structure",
        location,
        pointsToRestore: lost,
        expectedHours: estimateRepairHours("structure", lost),
        partsRequired: [
          {
            partId: `internal-structure-${location.toLowerCase()}`,
            quantity: lost,
            matched: false,
          },
        ],
        source: "combat",
        matchId,
        createdAt,
        status: "queued",
      });
    }
  }

  // 3. Component tickets — one per destroyed component
  for (const component of state.destroyedComponents) {
    const discriminator = `${component.location}-${component.name}-${component.slot ?? 0}`;
    tickets.push({
      ticketId: buildTicketId(
        matchId,
        state.unitId,
        "component",
        discriminator,
      ),
      unitId: state.unitId,
      kind: "component",
      location: component.location,
      componentName: component.name,
      expectedHours: estimateRepairHours("component", 1),
      partsRequired: [
        {
          partId: component.name,
          quantity: 1,
          matched: false,
        },
      ],
      source: "combat",
      matchId,
      createdAt,
      status: "parts-needed",
    });
  }

  // 4. Ammo tickets — one per depleted bin
  for (const [binId, maxAmmo] of Object.entries(maxState.maxAmmoPerBin)) {
    const currentAmmo = state.ammoRemaining[binId] ?? maxAmmo;
    const missing = maxAmmo - currentAmmo;
    if (missing > 0) {
      tickets.push({
        ticketId: buildTicketId(matchId, state.unitId, "ammo", binId),
        unitId: state.unitId,
        kind: "ammo",
        ammoBinId: binId,
        pointsToRestore: missing,
        expectedHours: estimateRepairHours("ammo", missing),
        partsRequired: [
          {
            partId: `ammo-${binId}`,
            quantity: missing,
            matched: false,
          },
        ],
        source: "combat",
        matchId,
        createdAt,
        status: "queued",
      });
    }
  }

  return tickets;
}

// =============================================================================
// Parts Matching
// =============================================================================

/**
 * Try to match a single ticket's part requirements against a salvage pool.
 *
 * Returns a new ticket with `partsRequired[i].matched` set where the
 * salvage pool has enough quantity. Does NOT mutate the input ticket
 * or the pool; ticket immutability is preserved.
 *
 * If no salvage pool is provided (e.g., Sub-Branch 3a hasn't shipped
 * yet), returns the ticket unchanged.
 */
export function matchPartsAgainstSalvage(
  ticket: IRepairTicket,
  salvagePool: ISalvagePool | undefined,
): IRepairTicket {
  if (!salvagePool || salvagePool.availableParts.length === 0) {
    return ticket;
  }

  const matchedParts: IRepairPartRequirement[] = ticket.partsRequired.map(
    (req) => {
      if (req.matched) return req;
      const candidate = salvagePool.availableParts.find(
        (p) => p.partId === req.partId && p.quantity >= req.quantity,
      );
      if (!candidate) return req;
      return {
        ...req,
        matched: true,
        matchedFromInventoryId: candidate.inventoryId,
      };
    },
  );

  // If at least one previously-unmatched part is now matched and all
  // requirements are now satisfied, advance status from parts-needed
  // to queued. Otherwise leave the status untouched.
  const allMatched = matchedParts.every((p) => p.matched);
  const nextStatus =
    ticket.status === "parts-needed" && allMatched ? "queued" : ticket.status;

  return {
    ...ticket,
    partsRequired: matchedParts,
    status: nextStatus,
  };
}
