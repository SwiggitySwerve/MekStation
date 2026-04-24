/**
 * Aerospace Battle Value Calculator
 *
 * Computes BV 2.0 for aerospace units (Aerospace Fighters, Conventional Fighters,
 * and Small Craft) per TechManual pp. 302-304.
 *
 * Defensive BV uses Structural Integrity (SI) in place of the mech gyro term.
 * Offensive BV combines an arc-weighted fire pool (primary arc 100%,
 * opposite arc 25%, side arcs 50%) with full-contribution Fuselage weapons.
 * Speed factor uses the average of Safe and Max Thrust rather than ground MP.
 *
 * @spec openspec/changes/add-aerospace-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-aerospace-battle-value/specs/aerospace-unit-system/spec.md
 */

import type {
  IAerospace,
  IConventionalFighter,
  ISmallCraft,
} from '../../../types/unit/AerospaceInterfaces';
import type { IAerospaceUnit } from '../../../types/unit/BaseUnitInterfaces';

import {
  AerospaceArc,
  AerospaceSubType,
} from '../../../types/unit/AerospaceInterfaces';
import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import {
  getArmorBVMultiplier,
  getPilotSkillModifier,
} from '../../../types/validation/BattleValue';
import { resolveEquipmentBV } from '../equipmentBVResolver';

// ============================================================================
// Input / Output Types
// ============================================================================

/**
 * Single piece of aerospace-mounted equipment for BV purposes.
 * Uses raw location strings so both ASF/CF (NOSE/LEFT_WING/RIGHT_WING/AFT/FUSELAGE)
 * and Small Craft (NOSE/LEFT_SIDE/RIGHT_SIDE/AFT/HULL) inputs can be normalized.
 */
export interface IAerospaceBVEquipment {
  /** Canonical equipment ID used to look up catalog BV/heat */
  readonly id: string;
  /** Firing arc / internal location */
  readonly location: AerospaceArc | string;
}

/**
 * Ammo entry used when computing ammo BV capped against matching weapon BV.
 */
export interface IAerospaceBVAmmo {
  readonly id: string;
  /** BV value from catalog */
  readonly bv: number;
  /** Normalized weapon type this ammo serves (e.g. 'lrm-20') */
  readonly weaponType: string;
}

/**
 * Minimal shape the aerospace BV calculator needs. This is intentionally
 * decoupled from the full Aerospace store/unit interface so it can be called
 * from construction code, the status bar, or parity harnesses with equal ease.
 */
export interface IAerospaceBVInput {
  readonly subType: AerospaceSubType;
  readonly tonnage: number;
  readonly structuralIntegrity: number;
  readonly safeThrust: number;
  readonly maxThrust: number;
  readonly armorType: string;
  readonly totalArmorPoints: number;
  readonly equipment: readonly IAerospaceBVEquipment[];
  readonly ammo?: readonly IAerospaceBVAmmo[];
  /** BV of defensive-only equipment (ECM, active probe, chaff pod, etc.) */
  readonly defensiveEquipmentBV?: number;
  /** BV of offensive-only non-weapon equipment (TAG, Targeting Computer, C3, etc.) */
  readonly offensiveEquipmentBV?: number;
  /** Explosive location penalty total (stacking gauss/ammo penalties) */
  readonly explosivePenalties?: number;
  /** Pilot gunnery skill (0-8, default 4 baseline) */
  readonly pilotGunnery?: number;
  /** Pilot piloting skill (0-8, default 5 baseline) */
  readonly pilotPiloting?: number;
}

/**
 * Per-arc weighted BV contribution breakdown.
 * `weight` is the fire-pool multiplier (1.0 / 0.5 / 0.25 / 1.0 for fuselage).
 */
export interface IAerospaceArcContribution {
  readonly arc: AerospaceArc;
  readonly rawBV: number;
  readonly weight: number;
  readonly weightedBV: number;
  readonly isPrimary: boolean;
}

/**
 * Complete aerospace BV breakdown, surfaced on the unit and displayed in the
 * status bar / breakdown dialog.
 */
export interface IAerospaceBVBreakdown {
  readonly armorBV: number;
  readonly siBV: number;
  readonly defensiveEquipmentBV: number;
  readonly explosivePenalties: number;
  readonly defensiveFactor: number;
  readonly defensive: number;

  readonly arcContributions: readonly IAerospaceArcContribution[];
  readonly primaryArc: AerospaceArc | null;
  readonly weaponFirePoolBV: number;
  readonly fuselageWeaponBV: number;
  readonly ammoBV: number;
  readonly offensiveEquipmentBV: number;
  readonly avgThrust: number;
  readonly speedFactor: number;
  readonly offensive: number;

  readonly subTypeMultiplier: number;
  readonly pilotMultiplier: number;
  readonly final: number;
}

// ============================================================================
// Arc-Pool Fire Weighting
// ============================================================================

/**
 * Return the set of "main" (non-fuselage) arcs for the given sub-type.
 * ASF and Conventional Fighter use NOSE/LEFT_WING/RIGHT_WING/AFT.
 * Small Craft uses NOSE/LEFT_SIDE/RIGHT_SIDE/AFT.
 */
export function getMainArcsForSubType(
  subType: AerospaceSubType,
): readonly AerospaceArc[] {
  if (subType === AerospaceSubType.SMALL_CRAFT) {
    return [
      AerospaceArc.NOSE,
      AerospaceArc.LEFT_SIDE,
      AerospaceArc.RIGHT_SIDE,
      AerospaceArc.AFT,
    ];
  }
  return [
    AerospaceArc.NOSE,
    AerospaceArc.LEFT_WING,
    AerospaceArc.RIGHT_WING,
    AerospaceArc.AFT,
  ];
}

/**
 * Map a raw location string onto an `AerospaceArc` value.
 * Small Craft "Hull" falls through to FUSELAGE.
 * Unknown locations return null and are skipped by the calculator.
 */
export function normalizeArcLocation(
  location: AerospaceArc | string,
): AerospaceArc | null {
  if (
    location === AerospaceArc.NOSE ||
    location === AerospaceArc.LEFT_WING ||
    location === AerospaceArc.RIGHT_WING ||
    location === AerospaceArc.LEFT_SIDE ||
    location === AerospaceArc.RIGHT_SIDE ||
    location === AerospaceArc.AFT ||
    location === AerospaceArc.FUSELAGE
  ) {
    return location;
  }

  // Legacy / string-form locations seen in unit data
  switch (location) {
    case 'Nose':
      return AerospaceArc.NOSE;
    case 'Left Wing':
      return AerospaceArc.LEFT_WING;
    case 'Right Wing':
      return AerospaceArc.RIGHT_WING;
    case 'Left Side':
      return AerospaceArc.LEFT_SIDE;
    case 'Right Side':
      return AerospaceArc.RIGHT_SIDE;
    case 'Aft':
      return AerospaceArc.AFT;
    case 'Fuselage':
    case 'Hull':
    case 'Wings':
      return AerospaceArc.FUSELAGE;
    default:
      return null;
  }
}

/**
 * Return the "opposite arc" for a given primary arc.
 * Nose ↔ Aft; LeftWing/LeftSide ↔ RightWing/RightSide (by sub-type).
 */
function getOppositeArc(
  primary: AerospaceArc,
  subType: AerospaceSubType,
): AerospaceArc {
  switch (primary) {
    case AerospaceArc.NOSE:
      return AerospaceArc.AFT;
    case AerospaceArc.AFT:
      return AerospaceArc.NOSE;
    case AerospaceArc.LEFT_WING:
      return AerospaceArc.RIGHT_WING;
    case AerospaceArc.RIGHT_WING:
      return AerospaceArc.LEFT_WING;
    case AerospaceArc.LEFT_SIDE:
      return AerospaceArc.RIGHT_SIDE;
    case AerospaceArc.RIGHT_SIDE:
      return AerospaceArc.LEFT_SIDE;
    default:
      // Fuselage has no opposite; return aft as a neutral default — callers
      // that care about this never pass FUSELAGE as a primary candidate.
      return subType === AerospaceSubType.SMALL_CRAFT
        ? AerospaceArc.AFT
        : AerospaceArc.AFT;
  }
}

// ============================================================================
// BV Helpers
// ============================================================================

/**
 * Sum the resolved weapon BV for a list of mounted items.
 * Non-weapon equipment (heat sinks, crew gear) resolves to 0 and is silently
 * skipped — callers pass separate defensive/offensive equipment BV totals
 * through the dedicated input fields.
 */
function sumWeaponBV(items: readonly IAerospaceBVEquipment[]): number {
  let total = 0;
  for (const item of items) {
    const resolved = resolveEquipmentBV(item.id);
    if (resolved.resolved) {
      total += resolved.battleValue;
    }
  }
  return total;
}

/**
 * Cap ammo BV against matching weapon BV, per TechManual.
 * The aerospace calculator reuses the same bucket-by-weapon-type approach
 * as the mech offensive calculator — weapons in ALL arcs count toward the
 * cap, since ammo serves any launcher regardless of firing arc.
 */
function calculateAerospaceAmmoBV(
  equipment: readonly IAerospaceBVEquipment[],
  ammo: readonly IAerospaceBVAmmo[],
): number {
  if (ammo.length === 0) return 0;

  // Bucket weapon BV by normalized equipment id so ammo entries can match.
  const weaponBVByType: Record<string, number> = {};
  for (const item of equipment) {
    const resolved = resolveEquipmentBV(item.id);
    if (!resolved.resolved) continue;
    const key = item.id.toLowerCase();
    weaponBVByType[key] = (weaponBVByType[key] ?? 0) + resolved.battleValue;
  }

  // Bucket ammo BV by weapon type.
  const ammoBVByType: Record<string, number> = {};
  for (const entry of ammo) {
    const key = entry.weaponType.toLowerCase();
    ammoBVByType[key] = (ammoBVByType[key] ?? 0) + entry.bv;
  }

  // Cap each bucket at the matching weapon BV total.
  let total = 0;
  for (const key of Object.keys(ammoBVByType)) {
    const weaponBV = weaponBVByType[key] ?? 0;
    if (weaponBV === 0) continue;
    total += Math.min(ammoBVByType[key], weaponBV);
  }
  return total;
}

// ============================================================================
// Defensive BV
// ============================================================================

/**
 * Compute the aerospace defensive BV components.
 *
 * armorBV = totalArmor × 2.5 × armorMultiplier
 * siBV = SI × 0.5 × tonnage
 * defensiveFactor = 1 + maxThrust / 10
 * defensive = (armorBV × smallCraftBonus + siBV + defEquipBV − explosive) × defensiveFactor
 *
 * Small Craft apply a 1.2× armor bonus inside the defensive block to reflect
 * their heavy armor tonnage allotment.
 *
 * @spec battle-value-system spec: Aerospace Defensive BV
 */
export function calculateAerospaceDefensiveBV(input: IAerospaceBVInput): {
  armorBV: number;
  siBV: number;
  defensiveEquipmentBV: number;
  explosivePenalties: number;
  defensiveFactor: number;
  defensive: number;
} {
  const armorMultiplier = getArmorBVMultiplier(input.armorType);
  const smallCraftArmorBonus =
    input.subType === AerospaceSubType.SMALL_CRAFT ? 1.2 : 1.0;
  const armorBV =
    input.totalArmorPoints * 2.5 * armorMultiplier * smallCraftArmorBonus;

  const siBV = input.structuralIntegrity * 0.5 * input.tonnage;

  const defensiveEquipmentBV = input.defensiveEquipmentBV ?? 0;
  const explosivePenalties = input.explosivePenalties ?? 0;

  const defensiveFactor = 1 + input.maxThrust / 10;
  const defensive =
    (armorBV + siBV + defensiveEquipmentBV - explosivePenalties) *
    defensiveFactor;

  return {
    armorBV,
    siBV,
    defensiveEquipmentBV,
    explosivePenalties,
    defensiveFactor,
    defensive,
  };
}

// ============================================================================
// Offensive BV (Arc Fire Pool)
// ============================================================================

/**
 * Compute the per-arc fire pool and the weighted contribution for each.
 * The highest-BV main arc becomes the primary (100%). Opposite arc contributes
 * 25%, the two side arcs each contribute 50%. Fuselage weapons always
 * contribute at 100%.
 *
 * @spec battle-value-system spec: Aerospace Offensive BV Arc Fire Pool
 */
export function calculateAerospaceArcContributions(input: IAerospaceBVInput): {
  contributions: IAerospaceArcContribution[];
  primaryArc: AerospaceArc | null;
  weaponFirePoolBV: number;
  fuselageWeaponBV: number;
} {
  const mainArcs = getMainArcsForSubType(input.subType);

  // Compute raw BV per main arc.
  const rawByArc = new Map<AerospaceArc, number>();
  for (const arc of mainArcs) {
    rawByArc.set(arc, 0);
  }
  let fuselageWeaponBV = 0;

  for (const item of input.equipment) {
    const arc = normalizeArcLocation(item.location);
    if (arc === null) continue;
    const resolved = resolveEquipmentBV(item.id);
    if (!resolved.resolved || resolved.battleValue === 0) continue;

    if (arc === AerospaceArc.FUSELAGE) {
      fuselageWeaponBV += resolved.battleValue;
      continue;
    }
    if (rawByArc.has(arc)) {
      rawByArc.set(arc, (rawByArc.get(arc) ?? 0) + resolved.battleValue);
    }
  }

  // Identify the primary arc (highest BV). Ties break to Nose → LW/LS → RW/RS → Aft.
  let primaryArc: AerospaceArc | null = null;
  let primaryBV = -1;
  for (const arc of mainArcs) {
    const bv = rawByArc.get(arc) ?? 0;
    if (bv > primaryBV) {
      primaryBV = bv;
      primaryArc = arc;
    }
  }
  // If every arc is zero, there is no meaningful primary arc.
  if (primaryBV <= 0) {
    primaryArc = null;
  }

  // Assign weights.
  const oppositeArc = primaryArc
    ? getOppositeArc(primaryArc, input.subType)
    : null;

  const contributions: IAerospaceArcContribution[] = [];
  let weaponFirePoolBV = 0;
  for (const arc of mainArcs) {
    const rawBV = rawByArc.get(arc) ?? 0;
    let weight: number;
    if (primaryArc === null) {
      weight = 0;
    } else if (arc === primaryArc) {
      weight = 1.0;
    } else if (arc === oppositeArc) {
      weight = 0.25;
    } else {
      weight = 0.5;
    }
    const weightedBV = rawBV * weight;
    weaponFirePoolBV += weightedBV;
    contributions.push({
      arc,
      rawBV,
      weight,
      weightedBV,
      isPrimary: arc === primaryArc,
    });
  }

  return {
    contributions,
    primaryArc,
    weaponFirePoolBV,
    fuselageWeaponBV,
  };
}

/**
 * Compute the aerospace speed factor.
 * avgThrust = (safeThrust + maxThrust) / 2
 * sf = round(pow(1 + (avgThrust − 5) / 10, 1.2) × 100) / 100
 *
 * @spec battle-value-system spec: Aerospace Speed Factor
 */
export function calculateAerospaceSpeedFactor(
  safeThrust: number,
  maxThrust: number,
): { avgThrust: number; speedFactor: number } {
  const avgThrust = (safeThrust + maxThrust) / 2;
  const raw = Math.pow(1 + (avgThrust - 5) / 10, 1.2);
  const speedFactor = Math.round(raw * 100) / 100;
  return { avgThrust, speedFactor };
}

/**
 * Compute the aerospace offensive BV components.
 * offensive = (weaponFirePool + fuselageWeaponBV + ammoBV + offensiveEquipmentBV) × speedFactor
 *
 * @spec battle-value-system spec: Aerospace Offensive BV Arc Fire Pool, Aerospace Speed Factor
 */
export function calculateAerospaceOffensiveBV(input: IAerospaceBVInput): {
  arcContributions: IAerospaceArcContribution[];
  primaryArc: AerospaceArc | null;
  weaponFirePoolBV: number;
  fuselageWeaponBV: number;
  ammoBV: number;
  offensiveEquipmentBV: number;
  avgThrust: number;
  speedFactor: number;
  offensive: number;
} {
  const { contributions, primaryArc, weaponFirePoolBV, fuselageWeaponBV } =
    calculateAerospaceArcContributions(input);

  const ammoBV = input.ammo
    ? calculateAerospaceAmmoBV(input.equipment, input.ammo)
    : 0;
  const offensiveEquipmentBV = input.offensiveEquipmentBV ?? 0;

  const { avgThrust, speedFactor } = calculateAerospaceSpeedFactor(
    input.safeThrust,
    input.maxThrust,
  );

  const baseOffensive =
    weaponFirePoolBV + fuselageWeaponBV + ammoBV + offensiveEquipmentBV;
  const offensive = baseOffensive * speedFactor;

  return {
    arcContributions: contributions,
    primaryArc,
    weaponFirePoolBV,
    fuselageWeaponBV,
    ammoBV,
    offensiveEquipmentBV,
    avgThrust,
    speedFactor,
    offensive,
  };
}

// ============================================================================
// Sub-type Multiplier & Pilot Multiplier
// ============================================================================

/**
 * Sub-type final-BV multiplier applied after summing defensive + offensive.
 *  - Conventional Fighter: 0.8 (fragile airframe)
 *  - Aerospace Fighter:    1.0 (baseline)
 *  - Small Craft:          1.0 (armor bonus is applied inside defensive block)
 *
 * @spec battle-value-system spec: Aerospace BV Dispatch / Conventional fighter multiplier
 */
export function getAerospaceSubTypeMultiplier(
  subType: AerospaceSubType,
): number {
  if (subType === AerospaceSubType.CONVENTIONAL_FIGHTER) return 0.8;
  return 1.0;
}

// ============================================================================
// Public Entry Point
// ============================================================================

/**
 * Compute the complete aerospace BV breakdown for a unit.
 *
 * Dispatch order:
 *  1. Defensive BV (armor + SI + def equip − explosive) × defensiveFactor
 *  2. Offensive BV ((arc pool + fuselage + ammo + off equip) × speedFactor)
 *  3. Sub-type multiplier (Conventional Fighter 0.8, otherwise 1.0)
 *  4. Pilot skill multiplier (shared 9×9 gunnery×piloting table)
 *  5. Round final BV to nearest integer
 *
 * Pilot skill defaults to 4/5 (baseline 1.0) when no skill is supplied.
 *
 * @spec battle-value-system spec: Aerospace BV Dispatch
 * @spec aerospace-unit-system spec: Aerospace BV Breakdown on Unit State
 */
export function calculateAerospaceBV(
  input: IAerospaceBVInput,
): IAerospaceBVBreakdown {
  const defensive = calculateAerospaceDefensiveBV(input);
  const offensive = calculateAerospaceOffensiveBV(input);

  const subTypeMultiplier = getAerospaceSubTypeMultiplier(input.subType);
  const pilotMultiplier = getAerospacePilotMultiplier(
    input.pilotGunnery,
    input.pilotPiloting,
  );

  const subTypeAdjusted =
    (defensive.defensive + offensive.offensive) * subTypeMultiplier;
  const final = Math.round(subTypeAdjusted * pilotMultiplier);

  return {
    armorBV: defensive.armorBV,
    siBV: defensive.siBV,
    defensiveEquipmentBV: defensive.defensiveEquipmentBV,
    explosivePenalties: defensive.explosivePenalties,
    defensiveFactor: defensive.defensiveFactor,
    defensive: defensive.defensive,

    arcContributions: offensive.arcContributions,
    primaryArc: offensive.primaryArc,
    weaponFirePoolBV: offensive.weaponFirePoolBV,
    fuselageWeaponBV: offensive.fuselageWeaponBV,
    ammoBV: offensive.ammoBV,
    offensiveEquipmentBV: offensive.offensiveEquipmentBV,
    avgThrust: offensive.avgThrust,
    speedFactor: offensive.speedFactor,
    offensive: offensive.offensive,

    subTypeMultiplier,
    pilotMultiplier,
    final,
  };
}

// ============================================================================
// Pilot Multiplier (thin wrapper around shared table)
// ============================================================================

/**
 * Resolve pilot gunnery/piloting into the shared 9×9 BV multiplier table.
 * Defaults to 4/5 (baseline) when skills are undefined.
 */
export function getAerospacePilotMultiplier(
  gunnery: number | undefined,
  piloting: number | undefined,
): number {
  const g = gunnery ?? 4;
  const p = piloting ?? 5;
  return getPilotSkillModifier(g, p);
}

/**
 * Sum weapon BV across every mounted item regardless of arc.
 * Exposed for parity harnesses that need a flat "total weapon BV" value.
 */
export function sumAerospaceWeaponBV(
  items: readonly IAerospaceBVEquipment[],
): number {
  return sumWeaponBV(items);
}

// ============================================================================
// Unit → BV Adapter (used by `calculateBattleValueForUnit` dispatch)
// ============================================================================

/**
 * Concrete aerospace shapes accepted by {@link calculateAerospaceBVFromUnit}.
 *
 * The dispatcher calls this with an `IAerospace`, `IConventionalFighter`, or
 * `ISmallCraft` — all of which extend `IAerospaceUnit`. We accept the broader
 * `IAerospaceUnit` shape too, so harnesses or test fixtures that build a
 * minimal aerospace-shaped value can call this directly.
 */
export type AerospaceBVDispatchInput =
  | IAerospace
  | IConventionalFighter
  | ISmallCraft
  | IAerospaceUnit;

/**
 * Resolve a numeric or string `armorType` field into the lookup key used by
 * `getArmorBVMultiplier`. `IAerospaceUnit.armorType` is typed as `number`
 * (legacy code-table format) but the BV calculator wants the canonical string
 * key (`"standard"`, `"reactive"`, etc.). Unknown numeric codes fall back to
 * `"standard"` (multiplier 1.0) — the same behavior `getArmorBVMultiplier`
 * provides for unknown strings.
 */
function resolveAerospaceArmorTypeKey(
  armorType: string | number | undefined,
): string {
  if (typeof armorType === 'string' && armorType.length > 0) return armorType;
  // Numeric armor codes do not have a stable mapping in this module yet —
  // treat them as standard armor for BV purposes. Concrete callers (like
  // the AerospaceStatusBar) pass a string key directly.
  return 'standard';
}

/**
 * Map a unit's `unitType` discriminant to the calculator's `AerospaceSubType`.
 * Defaults to ASF (the most common aerospace shape) when the discriminant is
 * absent or unrecognised — the calculator treats ASF as the baseline
 * (1.0 sub-type multiplier, no armor bonus), so this fallback is a safe
 * no-adjustment path rather than an error.
 */
function unitTypeToAerospaceSubType(
  unitType: UnitType | string | undefined,
): AerospaceSubType {
  switch (unitType) {
    case UnitType.CONVENTIONAL_FIGHTER:
      return AerospaceSubType.CONVENTIONAL_FIGHTER;
    case UnitType.SMALL_CRAFT:
      return AerospaceSubType.SMALL_CRAFT;
    case UnitType.AEROSPACE:
    default:
      return AerospaceSubType.AEROSPACE_FIGHTER;
  }
}

/**
 * Build a calculator-ready {@link IAerospaceBVInput} from an aerospace unit.
 *
 * This is the unit-shaped entry point — it strips ASF/CF/SC equipment lists
 * down to the `{ id, location }` rows the calculator needs and forwards the
 * tonnage / SI / thrust fields verbatim. Optional skill overrides flow
 * through `pilotGunnery` / `pilotPiloting` so dispatchers can apply pilot
 * adjustments without rebuilding the whole input.
 */
export function buildAerospaceBVInputFromUnit(
  unit: AerospaceBVDispatchInput,
  options: { gunnery?: number; piloting?: number } = {},
): IAerospaceBVInput {
  // The concrete subtypes (`IAerospace` / `IConventionalFighter` /
  // `ISmallCraft`) carry an `equipment` array of `{equipmentId, location}`
  // rows. The bare `IAerospaceUnit` shape does not — we read the field via
  // a `unknown` cast and default to `[]` so a minimal harness fixture can
  // still flow through this adapter without crashing.
  const rawEquipment =
    (unit as { readonly equipment?: ReadonlyArray<unknown> }).equipment ?? [];
  const equipment: IAerospaceBVEquipment[] = [];
  for (const raw of rawEquipment) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as {
      readonly equipmentId?: string;
      readonly id?: string;
      readonly location?: string;
    };
    const id = item.equipmentId ?? item.id;
    const location = item.location;
    if (typeof id !== 'string' || typeof location !== 'string') continue;
    equipment.push({ id, location });
  }

  return {
    subType: unitTypeToAerospaceSubType(unit.unitType),
    tonnage: unit.tonnage,
    structuralIntegrity: unit.structuralIntegrity,
    safeThrust: unit.movement.safeThrust,
    maxThrust: unit.movement.maxThrust,
    armorType: resolveAerospaceArmorTypeKey(
      (unit as { readonly armorType?: string | number }).armorType,
    ),
    totalArmorPoints: unit.totalArmorPoints,
    equipment,
    pilotGunnery: options.gunnery,
    pilotPiloting: options.piloting,
  };
}

/**
 * Compute the aerospace BV breakdown for an `IAerospaceUnit`-shaped value.
 *
 * Used by {@link calculateBattleValueForUnit} for the aerospace dispatch arm.
 * Equivalent to `calculateAerospaceBV(buildAerospaceBVInputFromUnit(unit))` —
 * exposed as a dedicated helper so callers don't need to import the input
 * builder separately.
 *
 * @spec openspec/changes/add-aerospace-battle-value/specs/battle-value-system/spec.md
 *       — Requirement: Aerospace BV Dispatch
 */
export function calculateAerospaceBVFromUnit(
  unit: AerospaceBVDispatchInput,
  options: { gunnery?: number; piloting?: number } = {},
): IAerospaceBVBreakdown {
  return calculateAerospaceBV(buildAerospaceBVInputFromUnit(unit, options));
}

/**
 * Type guard: does the value's `unitType` mark it as an aerospace unit?
 * Returns true for AEROSPACE, CONVENTIONAL_FIGHTER, or SMALL_CRAFT.
 */
export function isAerospaceUnitType(
  unit: { readonly unitType?: UnitType | string } | null | undefined,
): boolean {
  if (!unit) return false;
  const t = unit.unitType;
  return (
    t === UnitType.AEROSPACE ||
    t === UnitType.CONVENTIONAL_FIGHTER ||
    t === UnitType.SMALL_CRAFT
  );
}
