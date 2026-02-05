/**
 * Battle Value 2.0 Calculation Utilities
 *
 * Implements TechManual BV 2.0 formulas for BattleMech evaluation.
 *
 * @spec openspec/specs/battle-value-system/spec.md
 */

import {
  getPilotSkillModifier,
  getArmorBVMultiplier,
  getStructureBVMultiplier,
  getGyroBVMultiplier,
} from '../../types/validation/BattleValue';
import { resolveEquipmentBV } from './equipmentBVResolver';

// ============================================================================
// SPEED FACTOR TABLE (from TechManual)
// ============================================================================

/**
 * Speed factor lookup by Target Movement Modifier (TMM)
 * TMM is based on movement capability
 */
export const SPEED_FACTORS: Record<number, number> = {
  0: 1.0,
  1: 1.1,
  2: 1.2,
  3: 1.3,
  4: 1.4,
  5: 1.5,
  6: 1.6,
  7: 1.7,
  8: 1.8,
  9: 1.9,
  10: 2.0,
};

/**
 * Calculate Target Movement Modifier from movement capability
 */
export function calculateTMM(runMP: number, jumpMP: number = 0): number {
  const bestMP = Math.max(runMP, jumpMP);

  if (bestMP <= 2) return 0;
  if (bestMP <= 4) return 1;
  if (bestMP <= 6) return 2;
  if (bestMP <= 9) return 3;
  if (bestMP <= 17) return 4;
  if (bestMP <= 24) return 5;
  return 6;
}

/**
 * Calculate speed factor from movement profile
 */
export function calculateSpeedFactor(
  walkMP: number,
  runMP: number,
  jumpMP: number = 0,
): number {
  const tmm = calculateTMM(runMP, jumpMP);
  const baseFactor = SPEED_FACTORS[tmm] ?? 1.0;

  // Jump bonus: add 0.1 per jump MP above walk MP (max +0.5)
  if (jumpMP > walkMP) {
    const jumpBonus = Math.min(0.5, (jumpMP - walkMP) * 0.1);
    return Math.min(2.24, baseFactor + jumpBonus);
  }

  return baseFactor;
}

// ============================================================================
// DEFENSIVE BV CALCULATION
// ============================================================================

export interface DefensiveBVConfig {
  totalArmorPoints: number;
  totalStructurePoints: number;
  tonnage: number;
  runMP: number;
  jumpMP: number;
  armorType?: string;
  structureType?: string;
  gyroType?: string;
  bar?: number;
  engineMultiplier?: number;
  defensiveEquipmentBV?: number;
  explosivePenalties?: number;
}

export interface DefensiveBVResult {
  armorBV: number;
  structureBV: number;
  gyroBV: number;
  defensiveFactor: number;
  totalDefensiveBV: number;
}

export function calculateDefensiveBV(
  config: DefensiveBVConfig,
): DefensiveBVResult {
  const armorMultiplier = getArmorBVMultiplier(config.armorType ?? 'standard');
  const structureMultiplier = getStructureBVMultiplier(
    config.structureType ?? 'standard',
  );
  const gyroMultiplier = getGyroBVMultiplier(config.gyroType ?? 'standard');

  const bar = config.bar ?? 10;
  const engineMultiplier = config.engineMultiplier ?? 1.0;
  const defensiveEquipmentBV = config.defensiveEquipmentBV ?? 0;
  const explosivePenalties = config.explosivePenalties ?? 0;

  const armorBV = config.totalArmorPoints * 2.5 * armorMultiplier * (bar / 10);
  const structureBV =
    config.totalStructurePoints * 1.5 * structureMultiplier * engineMultiplier;
  const gyroBV = config.tonnage * gyroMultiplier;

  const baseDef =
    armorBV + structureBV + gyroBV + defensiveEquipmentBV - explosivePenalties;

  const maxTMM = calculateTMM(config.runMP, config.jumpMP);
  const defensiveFactor = 1 + maxTMM / 10.0;

  const totalDefensiveBV = baseDef * defensiveFactor;

  return {
    armorBV,
    structureBV,
    gyroBV,
    defensiveFactor,
    totalDefensiveBV,
  };
}

// ============================================================================
// OFFENSIVE BV CALCULATION (MegaMek-accurate with Heat Tracking)
// ============================================================================

export interface OffensiveBVConfig {
  weapons: Array<{
    id: string;
    name: string;
    heat: number;
    bv: number;
    rear?: boolean;
  }>;
  ammo?: Array<{ id: string; bv: number }>;
  tonnage: number;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  heatDissipation: number;
}

export interface OffensiveBVResult {
  weaponBV: number;
  weightBonus: number;
  speedFactor: number;
  totalOffensiveBV: number;
}

export function calculateOffensiveSpeedFactor(
  runMP: number,
  jumpMP: number = 0,
  umuMP: number = 0,
): number {
  const mp = runMP + Math.round(Math.max(jumpMP, umuMP) / 2.0);
  const speedFactor =
    Math.round(Math.pow(1 + (mp - 5) / 10.0, 1.2) * 100.0) / 100.0;
  return speedFactor;
}

export function calculateOffensiveBVWithHeatTracking(
  config: OffensiveBVConfig,
): OffensiveBVResult {
  const weaponsWithRearPenalty = config.weapons.map((w) => ({
    ...w,
    bv: w.rear ? w.bv * 0.5 : w.bv,
  }));

  const sortedWeapons = [...weaponsWithRearPenalty].sort((a, b) => b.bv - a.bv);

  // MegaMek heat efficiency formula: 6 + heatCapacity - moveHeat
  // moveHeat = max(runningHeat, jumpHeat) where:
  //   runningHeat = 2 (standard for all running mechs)
  //   jumpHeat = max(3, jumpMP) for mechs with jump jets
  // See MekBVCalculator.heatEfficiency() lines 321-389
  const RUNNING_HEAT = 2;
  const jumpHeat = config.jumpMP > 0 ? Math.max(3, config.jumpMP) : 0;
  const moveHeat = Math.max(RUNNING_HEAT, jumpHeat);
  const heatEfficiency = 6 + config.heatDissipation - moveHeat;

  // MegaMek tracks heat with a flag: the weapon that pushes cumulative heat
  // past the threshold gets FULL BV; only subsequent weapons get halved.
  // See HeatTrackingBVCalculator.processWeapons() lines 78-128
  let heatExceeded = heatEfficiency <= 0;
  let heatSum = 0;
  let weaponBV = 0;

  for (const weapon of sortedWeapons) {
    heatSum += weapon.heat;
    let adjustedBV = weapon.bv;

    if (heatExceeded) {
      adjustedBV *= 0.5;
    }

    weaponBV += adjustedBV;

    if (heatSum >= heatEfficiency) {
      heatExceeded = true;
    }
  }

  let ammoBV = 0;
  if (config.ammo) {
    for (const ammo of config.ammo) {
      ammoBV += ammo.bv;
    }
  }

  const weightBonus = config.tonnage;
  const speedFactor = calculateOffensiveSpeedFactor(
    config.runMP,
    config.jumpMP,
  );
  const baseOffensive = weaponBV + ammoBV + weightBonus;
  // No intermediate rounding — accumulated as float, rounded once at final BV sum
  const totalOffensiveBV = baseOffensive * speedFactor;

  return {
    weaponBV,
    weightBonus,
    speedFactor,
    totalOffensiveBV,
  };
}

/**
 * @deprecated Use resolveEquipmentBV() from equipmentBVResolver.ts instead.
 * Retained as thin wrappers for backward compatibility during migration.
 */
export function getWeaponBV(weaponId: string): number {
  return resolveEquipmentBV(weaponId).battleValue;
}

/**
 * @deprecated Use resolveEquipmentBV() from equipmentBVResolver.ts instead.
 */
export function getWeaponHeat(weaponId: string): number {
  return resolveEquipmentBV(weaponId).heat;
}

/**
 * Calculate offensive Battle Value (legacy - without heat tracking)
 *
 * @deprecated Use calculateOffensiveBVWithHeatTracking for accurate BV calculation
 *
 * Formula:
 *   Offensive_BV = sum(weapon_BV × modifiers) + ammo_BV
 */
export function calculateOffensiveBV(
  weapons: Array<{ id: string; rear?: boolean }>,
  hasTargetingComputer: boolean = false,
): number {
  let total = 0;

  for (const weapon of weapons) {
    const weaponId = weapon.id.toLowerCase();
    let bv = resolveEquipmentBV(weapon.id).battleValue;

    if (weapon.rear) {
      bv = bv * 0.5;
    }

    if (
      hasTargetingComputer &&
      !weaponId.includes('lrm') &&
      !weaponId.includes('srm') &&
      !weaponId.includes('mrm')
    ) {
      bv = bv * 1.25;
    }

    total += bv;
  }

  return total;
}

// ============================================================================
// TOTAL BV CALCULATION
// ============================================================================

export interface BVCalculationConfig {
  totalArmorPoints: number;
  totalStructurePoints: number;
  tonnage: number;
  heatSinkCapacity: number;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  weapons: Array<{ id: string; rear?: boolean }>;
  hasTargetingComputer?: boolean;
  hasDefensiveEquipment?: boolean;
  armorType?: string;
  structureType?: string;
  gyroType?: string;
}

/**
 * BV breakdown for display
 */
export interface BVBreakdown {
  defensiveBV: number;
  offensiveBV: number;
  speedFactor: number;
  totalBV: number;
}

/**
 * Calculate total Battle Value for a BattleMech unit.
 *
 * Implements BV 2.0 calculation per TechManual and MegaMek:
 * - Defensive BV: armor + structure + gyro, modified by defensive speed factor
 * - Offensive BV: weapons (with heat tracking) + tonnage, modified by offensive speed factor
 * - Total BV: defensive + offensive (speed factors already applied)
 *
 * @param config - Unit configuration including armor, structure, weapons, and movement
 * @returns Total Battle Value (rounded to nearest integer)
 *
 * @see openspec/specs/battle-value-system/spec.md
 * @see MegaMek: megamek.common.BVCalculator
 */
export function calculateTotalBV(config: BVCalculationConfig): number {
  const defensiveResult = calculateDefensiveBV({
    totalArmorPoints: config.totalArmorPoints,
    totalStructurePoints: config.totalStructurePoints,
    tonnage: config.tonnage,
    runMP: config.runMP,
    jumpMP: config.jumpMP,
    armorType: config.armorType,
    structureType: config.structureType,
    gyroType: config.gyroType,
  });

  const weaponsWithBV = config.weapons.map((w) => {
    const resolved = resolveEquipmentBV(w.id);
    let bv = resolved.battleValue;

    if (w.rear) {
      bv = bv * 0.5;
    }

    const weaponId = w.id.toLowerCase();
    if (
      config.hasTargetingComputer &&
      !weaponId.includes('lrm') &&
      !weaponId.includes('srm') &&
      !weaponId.includes('mrm')
    ) {
      bv = bv * 1.25;
    }

    return {
      id: w.id,
      name: weaponId,
      heat: resolved.heat,
      bv,
    };
  });

  const offensiveResult = calculateOffensiveBVWithHeatTracking({
    weapons: weaponsWithBV,
    tonnage: config.tonnage,
    walkMP: config.walkMP,
    runMP: config.runMP,
    jumpMP: config.jumpMP,
    heatDissipation: config.heatSinkCapacity,
  });

  return Math.round(
    defensiveResult.totalDefensiveBV + offensiveResult.totalOffensiveBV,
  );
}

/**
 * Get detailed Battle Value breakdown for display and analysis.
 *
 * Returns component-level BV values:
 * - Defensive BV (with defensive speed factor applied)
 * - Offensive BV (with offensive speed factor applied)
 * - Total BV (sum of defensive + offensive)
 *
 * @param config - Unit configuration
 * @returns Breakdown of BV components
 *
 * @see openspec/specs/battle-value-system/spec.md
 */
export function getBVBreakdown(config: BVCalculationConfig): BVBreakdown {
  const defensiveResult = calculateDefensiveBV({
    totalArmorPoints: config.totalArmorPoints,
    totalStructurePoints: config.totalStructurePoints,
    tonnage: config.tonnage,
    runMP: config.runMP,
    jumpMP: config.jumpMP,
    armorType: config.armorType,
    structureType: config.structureType,
    gyroType: config.gyroType,
  });

  const weaponsWithBV = config.weapons.map((w) => {
    const resolved = resolveEquipmentBV(w.id);
    let bv = resolved.battleValue;

    if (w.rear) {
      bv = bv * 0.5;
    }

    const weaponId = w.id.toLowerCase();
    if (
      config.hasTargetingComputer &&
      !weaponId.includes('lrm') &&
      !weaponId.includes('srm') &&
      !weaponId.includes('mrm')
    ) {
      bv = bv * 1.25;
    }

    return {
      id: w.id,
      name: weaponId,
      heat: resolved.heat,
      bv,
    };
  });

  const offensiveResult = calculateOffensiveBVWithHeatTracking({
    weapons: weaponsWithBV,
    tonnage: config.tonnage,
    walkMP: config.walkMP,
    runMP: config.runMP,
    jumpMP: config.jumpMP,
    heatDissipation: config.heatSinkCapacity,
  });

  return {
    defensiveBV: defensiveResult.totalDefensiveBV,
    offensiveBV: offensiveResult.totalOffensiveBV,
    speedFactor: offensiveResult.speedFactor,
    totalBV: Math.round(
      defensiveResult.totalDefensiveBV + offensiveResult.totalOffensiveBV,
    ),
  };
}

// ============================================================================
// PILOT SKILL ADJUSTMENT
// ============================================================================

/**
 * Calculate skill-adjusted Battle Value for a unit.
 *
 * Applies pilot skill modifiers to base Battle Value. A 4/5 pilot is baseline (1.0x).
 * Better pilots (lower skills) increase BV, worse pilots (higher skills) decrease it.
 *
 * @param baseBV - Base Battle Value of the unit
 * @param gunnery - Pilot gunnery skill (0-8, lower is better)
 * @param piloting - Pilot piloting skill (0-8, lower is better)
 * @returns Adjusted Battle Value rounded to nearest integer
 *
 * @example
 * calculateAdjustedBV(1000, 4, 5) // Returns 1000 (baseline)
 * calculateAdjustedBV(1000, 3, 4) // Returns 1200 (elite)
 * calculateAdjustedBV(1000, 5, 6) // Returns 900 (green)
 */
export function calculateAdjustedBV(
  baseBV: number,
  gunnery: number,
  piloting: number,
): number {
  const modifier = getPilotSkillModifier(gunnery, piloting);
  return Math.round(baseBV * modifier);
}
