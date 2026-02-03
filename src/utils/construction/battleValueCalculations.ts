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
  if (bestMP <= 12) return 4;
  if (bestMP <= 17) return 5;
  if (bestMP <= 24) return 6;
  return 7;
}

/**
 * Calculate speed factor from movement profile
 */
export function calculateSpeedFactor(walkMP: number, runMP: number, jumpMP: number = 0): number {
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

export function calculateDefensiveBV(config: DefensiveBVConfig): DefensiveBVResult {
  const armorMultiplier = getArmorBVMultiplier(config.armorType ?? 'standard');
  const structureMultiplier = getStructureBVMultiplier(config.structureType ?? 'standard');
  const gyroMultiplier = getGyroBVMultiplier(config.gyroType ?? 'standard');
  
  const bar = config.bar ?? 10;
  const engineMultiplier = config.engineMultiplier ?? 1.0;
  const defensiveEquipmentBV = config.defensiveEquipmentBV ?? 0;
  const explosivePenalties = config.explosivePenalties ?? 0;
  
  const armorBV = config.totalArmorPoints * 2.5 * armorMultiplier * (bar / 10);
  const structureBV = config.totalStructurePoints * 1.5 * structureMultiplier * engineMultiplier;
  const gyroBV = config.tonnage * gyroMultiplier;
  
  const baseDef = armorBV + structureBV + gyroBV + defensiveEquipmentBV - explosivePenalties;
  
  const maxTMM = calculateTMM(config.runMP, config.jumpMP);
  const defensiveFactor = 1 + (maxTMM / 10.0);
  
  const totalDefensiveBV = Math.round(baseDef * defensiveFactor);
  
  return {
    armorBV,
    structureBV,
    gyroBV,
    defensiveFactor,
    totalDefensiveBV,
  };
}

// ============================================================================
// OFFENSIVE BV CALCULATION
// ============================================================================

/**
 * Weapon BV values (simplified subset)
 * Real implementation would use equipment database
 */
export const WEAPON_BV: Record<string, number> = {
  // Energy weapons
  'small-laser': 9,
  'medium-laser': 46,
  'large-laser': 123,
  'er-small-laser': 17,
  'er-medium-laser': 62,
  'er-large-laser': 163,
  'ppc': 176,
  'er-ppc': 229,
  'small-pulse-laser': 12,
  'medium-pulse-laser': 48,
  'large-pulse-laser': 119,
  
  // Ballistic weapons
  'machine-gun': 5,
  'ac-2': 37,
  'ac-5': 70,
  'ac-10': 123,
  'ac-20': 178,
  'lb-2-x-ac': 42,
  'lb-5-x-ac': 83,
  'lb-10-x-ac': 148,
  'lb-20-x-ac': 237,
  'ultra-ac-2': 56,
  'ultra-ac-5': 112,
  'ultra-ac-10': 210,
  'ultra-ac-20': 281,
  'gauss-rifle': 320,
  'light-gauss-rifle': 159,
  'heavy-gauss-rifle': 346,
  
  // Missile weapons
  'srm-2': 21,
  'srm-4': 39,
  'srm-6': 59,
  'lrm-5': 45,
  'lrm-10': 90,
  'lrm-15': 136,
  'lrm-20': 181,
  'streak-srm-2': 30,
  'streak-srm-4': 59,
  'streak-srm-6': 89,
  'mrm-10': 56,
  'mrm-20': 112,
  'mrm-30': 168,
  'mrm-40': 224,
};

/**
 * Calculate offensive Battle Value
 * 
 * Formula:
 *   Offensive_BV = sum(weapon_BV × modifiers) + ammo_BV
 */
export function calculateOffensiveBV(
  weapons: Array<{ id: string; rear?: boolean }>,
  hasTargetingComputer: boolean = false
): number {
  let total = 0;
  
  for (const weapon of weapons) {
    const weaponId = weapon.id.toLowerCase();
    let bv = WEAPON_BV[weaponId] ?? 0;
    
    // Rear-mounted weapons get reduced BV
    if (weapon.rear) {
      bv = Math.round(bv * 0.5);
    }
    
    // Targeting computer bonus for direct-fire weapons
    if (hasTargetingComputer && !weaponId.includes('lrm') && !weaponId.includes('srm') && !weaponId.includes('mrm')) {
      bv = Math.round(bv * 1.25);
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
  
  const offensiveBV = calculateOffensiveBV(
    config.weapons,
    config.hasTargetingComputer
  );
  
  const speedFactor = calculateSpeedFactor(
    config.walkMP,
    config.runMP,
    config.jumpMP
  );
  
  return Math.round((defensiveResult.totalDefensiveBV + offensiveBV) * speedFactor);
}

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
   
   const offensiveBV = calculateOffensiveBV(
     config.weapons,
     config.hasTargetingComputer
   );
   
   const speedFactor = calculateSpeedFactor(
     config.walkMP,
     config.runMP,
     config.jumpMP
   );
   
   return {
     defensiveBV: defensiveResult.totalDefensiveBV,
     offensiveBV,
     speedFactor,
     totalBV: Math.round((defensiveResult.totalDefensiveBV + offensiveBV) * speedFactor),
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
export function calculateAdjustedBV(baseBV: number, gunnery: number, piloting: number): number {
  const modifier = getPilotSkillModifier(gunnery, piloting);
  return Math.round(baseBV * modifier);
}

