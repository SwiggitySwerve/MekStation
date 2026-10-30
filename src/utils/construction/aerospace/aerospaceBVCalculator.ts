import type {
  IAerospaceArcContribution,
  IAerospaceBVBreakdown,
  IAerospaceBVEquipment,
  IAerospaceBVInput,
} from './aerospaceBVTypes';

import {
  AerospaceArc,
  AerospaceSubType,
} from '../../../types/unit/AerospaceInterfaces';
import {
  getArmorBVMultiplier,
  getPilotSkillModifier,
} from '../../../types/validation/BattleValue';
import { calculateOffensiveSpeedFactorForMP } from '../battleValueMovement';
import { calculateAerospaceArcContributions } from './aerospaceBVArcs';
import {
  calculateAerospaceAmmoBV,
  sumWeaponBV,
} from './aerospaceBVCalculations';

// ============================================================================
// BV Helpers
// ============================================================================

/**
 * Sum the resolved weapon BV for a list of mounted items.
 * Non-weapon equipment (heat sinks, crew gear) resolves to 0 and is silently
 * skipped — callers pass separate defensive/offensive equipment BV totals
 * through the dedicated input fields.
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
  const speedFactor = calculateOffensiveSpeedFactorForMP(avgThrust);
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
