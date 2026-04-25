/**
 * Aerospace Bomb Bay Construction (Small Craft)
 *
 * ASF and Conventional Fighters carry external bomb loads using a single
 * `hasBombBay` flag and `bombCapacity` (tons). Small Craft, however, can
 * mount multiple internal bomb bays, each with its own capacity and
 * (optionally) door count for simultaneous launches.
 *
 * Per BattleTech rules (Strategic Operations / TacOps), each bomb bay on a
 * small craft consumes 1 ton per bomb of capacity plus 1 ton of fixed
 * structure per bay. The aggregate bomb-bay tonnage is bounded by the
 * unit weight budget; in practice a small craft cannot dedicate more
 * than half its tonnage to bomb bays.
 *
 * Cap rule:
 *   maxBombBayTons = floor(unitTonnage / 2)
 *
 * Per-bay rule:
 *   bayTons = capacityBombs + 1   // 1 ton structure + 1 ton per bomb
 *   bayTons >= 1                  // empty bay still costs 1 ton
 *
 * This module is small-craft only. ASF/CF retain their existing single
 * `bombCapacity` field; this construction-time helper does not modify
 * that path.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 * Requirement: Equipment Mounting per Arc
 */

import { AerospaceSubType } from "../../../types/unit/AerospaceInterfaces";
import type { AerospaceValidationError } from "./validationRules";

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * A single small-craft bomb bay. `capacityBombs` is the maximum number of
 * 1-ton bombs the bay can hold; `bayTons` is computed from capacity plus
 * 1 ton of bay structure.
 */
export interface IBombBay {
  /** Stable identifier for this bay (UI key) */
  readonly id: string;
  /** Maximum bombs (each = 1 ton). Must be >= 0. */
  readonly capacityBombs: number;
}

/** Cost overhead for the bay structure itself, in tons. */
export const BAY_STRUCTURE_TONS = 1;

/** Half-of-tonnage cap on aggregate bomb-bay weight. */
export const BOMB_BAY_TONNAGE_FRACTION = 0.5;

// ============================================================================
// Calculation
// ============================================================================

/**
 * Tonnage cost of a single bay = capacityBombs + structure overhead.
 * A 0-capacity bay is illegal; callers should use validateBombBays to check.
 */
export function bayTons(bay: IBombBay): number {
  return Math.max(0, bay.capacityBombs) + BAY_STRUCTURE_TONS;
}

/** Sum bay tonnage across the supplied bays. */
export function totalBombBayTons(bays: ReadonlyArray<IBombBay>): number {
  return bays.reduce((sum, bay) => sum + bayTons(bay), 0);
}

/** Sum bomb capacity (in 1-ton bombs) across all bays. */
export function totalBombCapacity(bays: ReadonlyArray<IBombBay>): number {
  return bays.reduce((sum, bay) => sum + Math.max(0, bay.capacityBombs), 0);
}

/**
 * Maximum tons a small craft may dedicate to bomb bays.
 * Returns 0 for non-small-craft sub-types.
 */
export function maxBombBayTons(
  tonnage: number,
  subType: AerospaceSubType,
): number {
  if (subType !== AerospaceSubType.SMALL_CRAFT) return 0;
  return Math.floor(tonnage * BOMB_BAY_TONNAGE_FRACTION);
}

// ============================================================================
// Validation (VAL-AERO-BOMB-BAY)
// ============================================================================

/**
 * VAL-AERO-BOMB-BAY: bomb bays are legal only on small craft, each bay
 * must have a non-negative capacity, and aggregate bay tonnage must not
 * exceed floor(tonnage / 2).
 */
export function validateBombBays(
  bays: ReadonlyArray<IBombBay>,
  tonnage: number,
  subType: AerospaceSubType,
): AerospaceValidationError[] {
  const errors: AerospaceValidationError[] = [];

  // Sub-type gate: only small craft may declare configurable bays here.
  if (subType !== AerospaceSubType.SMALL_CRAFT) {
    if (bays.length > 0) {
      errors.push({
        ruleId: "VAL-AERO-BOMB-BAY",
        message: `Bomb bays are only configurable on small craft; ${subType} must use the single bombCapacity field`,
      });
    }
    return errors;
  }

  // Per-bay capacity sanity check.
  for (const bay of bays) {
    if (!Number.isInteger(bay.capacityBombs) || bay.capacityBombs < 0) {
      errors.push({
        ruleId: "VAL-AERO-BOMB-BAY",
        message: `Bomb bay "${bay.id}" capacity must be a non-negative integer; got ${bay.capacityBombs}`,
      });
    }
  }

  // Aggregate tonnage cap.
  const totalTons = totalBombBayTons(bays);
  const cap = maxBombBayTons(tonnage, subType);
  if (totalTons > cap) {
    errors.push({
      ruleId: "VAL-AERO-BOMB-BAY",
      message: `Bomb bay tonnage ${totalTons}t exceeds cap ${cap}t for ${tonnage}t ${subType}`,
    });
  }

  return errors;
}
