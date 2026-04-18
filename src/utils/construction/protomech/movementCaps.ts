/**
 * ProtoMech Movement Caps and Engine Formulas
 *
 * Per-weight-class MP caps and the fusion engine weight formula.
 * Run MP is always walkMP + 1 (before booster). Myomer Booster adds +1 to
 * the base walk MP (effective MP = walkMP + 1) and costs 1 ton.
 *
 * @spec openspec/changes/add-protomech-construction/specs/protomech-unit-system/spec.md
 * @spec openspec/changes/add-protomech-construction/tasks.md §4, §7, §8
 */

import {
  ProtoChassis,
  ProtoWeightClass,
} from "@/types/unit/ProtoMechInterfaces";

// =============================================================================
// MP cap table
// =============================================================================

/** Walk and jump MP caps per weight class */
export interface IProtoMPCaps {
  walkMax: number;
  jumpMax: number;
}

/**
 * Maximum walk and jump MP by weight class.
 * Ultraheavy has jump 0 — jump jets are forbidden on that chassis.
 */
const MP_CAPS_BY_WEIGHT_CLASS: Record<ProtoWeightClass, IProtoMPCaps> = {
  [ProtoWeightClass.LIGHT]: { walkMax: 8, jumpMax: 8 },
  [ProtoWeightClass.MEDIUM]: { walkMax: 6, jumpMax: 6 },
  [ProtoWeightClass.HEAVY]: { walkMax: 4, jumpMax: 4 },
  [ProtoWeightClass.ULTRAHEAVY]: { walkMax: 3, jumpMax: 0 },
};

/**
 * Return the MP caps for a given weight class.
 */
export function getProtoMPCaps(weightClass: ProtoWeightClass): IProtoMPCaps {
  return MP_CAPS_BY_WEIGHT_CLASS[weightClass];
}

// =============================================================================
// Effective MP computation
// =============================================================================

/**
 * Return the effective walk MP after applying optional Myomer Booster (+1).
 *
 * The booster is only legal on Light and Medium ProtoMechs (task §8.1).
 * This function applies the bonus unconditionally; legality is enforced by
 * VAL-PROTO-CHASSIS in validation.ts.
 */
export function effectiveWalkMP(
  baseWalkMP: number,
  myomerBooster: boolean,
): number {
  return myomerBooster ? baseWalkMP + 1 : baseWalkMP;
}

/**
 * Run MP = walk MP + 1 (after booster bonus is applied to walk).
 */
export function computeRunMP(effectiveWalk: number): number {
  return effectiveWalk + 1;
}

/**
 * Jump MP for a Glider chassis: base jump MP + 2 from Glider Wings.
 * For all other chassis types the jump MP passes through unchanged.
 */
export function effectiveJumpMP(
  baseJumpMP: number,
  chassisType: ProtoChassis,
): number {
  if (chassisType === ProtoChassis.GLIDER) {
    return baseJumpMP + 2;
  }
  return baseJumpMP;
}

// =============================================================================
// Engine formulas
// =============================================================================

/** Engine weight factor for ProtoMech fusion engines (tons per rating point) */
export const PROTO_ENGINE_WEIGHT_FACTOR = 0.025;

/**
 * Engine rating = tonnage × walkMP (base, before booster).
 * The booster adds MP but does not change the engine rating.
 */
export function computeProtoEngineRating(
  tonnage: number,
  walkMP: number,
): number {
  return tonnage * walkMP;
}

/**
 * Engine weight in tons = engineRating × 0.025, rounded up to nearest 0.5t.
 */
export function computeProtoEngineWeight(engineRating: number): number {
  const raw = engineRating * PROTO_ENGINE_WEIGHT_FACTOR;
  // Round up to nearest half-ton
  return Math.ceil(raw * 2) / 2;
}

// =============================================================================
// Myomer Booster legality
// =============================================================================

/**
 * Return true when a Myomer Booster is legal for the given weight class.
 * Only Light and Medium ProtoMechs may mount the booster (task §8.1).
 */
export function isMyomerBoosterLegal(weightClass: ProtoWeightClass): boolean {
  return (
    weightClass === ProtoWeightClass.LIGHT ||
    weightClass === ProtoWeightClass.MEDIUM
  );
}
