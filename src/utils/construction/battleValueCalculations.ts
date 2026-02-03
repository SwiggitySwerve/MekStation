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
  if (bestMP <= 17) return 4;
  if (bestMP <= 24) return 5;
  return 6;
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
// OFFENSIVE BV CALCULATION (MegaMek-accurate with Heat Tracking)
// ============================================================================

export interface OffensiveBVConfig {
  weapons: Array<{ id: string; name: string; heat: number; bv: number; rear?: boolean }>;
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

export function calculateOffensiveSpeedFactor(runMP: number, jumpMP: number = 0, umuMP: number = 0): number {
  const mp = runMP + Math.round(Math.max(jumpMP, umuMP) / 2.0);
  const speedFactor = Math.round(Math.pow(1 + ((mp - 5) / 10.0), 1.2) * 100.0) / 100.0;
  return speedFactor;
}

export function calculateOffensiveBVWithHeatTracking(config: OffensiveBVConfig): OffensiveBVResult {
  const weaponsWithRearPenalty = config.weapons.map(w => ({
    ...w,
    bv: w.rear ? Math.round(w.bv * 0.5) : w.bv,
  }));
  
  const sortedWeapons = [...weaponsWithRearPenalty].sort((a, b) => b.bv - a.bv);
  
  const RUNNING_HEAT = 2;
  let cumulativeHeat = RUNNING_HEAT;
  let weaponBV = 0;
  
  for (const weapon of sortedWeapons) {
    cumulativeHeat += weapon.heat;
    let adjustedBV = weapon.bv;
    
    if (cumulativeHeat > config.heatDissipation) {
      adjustedBV *= 0.5;
    }
    
    weaponBV += adjustedBV;
  }
  
  let ammoBV = 0;
  if (config.ammo) {
    for (const ammo of config.ammo) {
      ammoBV += ammo.bv;
    }
  }
  
  const weightBonus = config.tonnage;
  const speedFactor = calculateOffensiveSpeedFactor(config.runMP, config.jumpMP);
  const baseOffensive = weaponBV + ammoBV + weightBonus;
  const totalOffensiveBV = Math.round(baseOffensive * speedFactor);
  
  return {
    weaponBV,
    weightBonus,
    speedFactor,
    totalOffensiveBV,
  };
}

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

export const WEAPON_HEAT: Record<string, number> = {
  // Energy weapons
  'small-laser': 1,
  'medium-laser': 3,
  'large-laser': 8,
  'er-small-laser': 2,
  'er-medium-laser': 5,
  'er-large-laser': 12,
  'ppc': 10,
  'er-ppc': 15,
  'small-pulse-laser': 2,
  'medium-pulse-laser': 4,
  'large-pulse-laser': 10,
  
  // Ballistic weapons (most generate no heat)
  'machine-gun': 0,
  'ac-2': 1,
  'ac-5': 1,
  'ac-10': 3,
  'ac-20': 7,
  'lb-2-x-ac': 1,
  'lb-5-x-ac': 1,
  'lb-10-x-ac': 2,
  'lb-20-x-ac': 6,
  'ultra-ac-2': 1,
  'ultra-ac-5': 1,
  'ultra-ac-10': 4,
  'ultra-ac-20': 8,
  'gauss-rifle': 1,
  'light-gauss-rifle': 1,
  'heavy-gauss-rifle': 2,
  
  // Missile weapons
  'srm-2': 2,
  'srm-4': 3,
  'srm-6': 4,
  'lrm-5': 2,
  'lrm-10': 4,
  'lrm-15': 5,
  'lrm-20': 6,
  'streak-srm-2': 2,
  'streak-srm-4': 3,
  'streak-srm-6': 4,
  'mrm-10': 4,
  'mrm-20': 6,
  'mrm-30': 10,
  'mrm-40': 12,
};

function normalizeWeaponId(weaponId: string): string {
  let normalized = weaponId.toLowerCase().replace(/-\d+$/, '');
  
  normalized = normalized.replace(/^ac(\d+)$/, 'ac-$1');
  normalized = normalized.replace(/^srm(\d+)$/, 'srm-$1');
  normalized = normalized.replace(/^lrm(\d+)$/, 'lrm-$1');
  normalized = normalized.replace(/^mrm(\d+)$/, 'mrm-$1');
  
  return normalized;
}

function getWeaponHeat(weaponId: string): number {
  return WEAPON_HEAT[weaponId] ?? 0;
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
  
  const weaponsWithBV = config.weapons.map(w => {
    const weaponId = normalizeWeaponId(w.id);
    let bv = WEAPON_BV[weaponId] ?? 0;
    
    if (w.rear) {
      bv = Math.round(bv * 0.5);
    }
    
    if (config.hasTargetingComputer && !weaponId.includes('lrm') && !weaponId.includes('srm') && !weaponId.includes('mrm')) {
      bv = Math.round(bv * 1.25);
    }
    
    const heat = getWeaponHeat(weaponId);
    
    return {
      id: w.id,
      name: weaponId,
      heat,
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
  
  return defensiveResult.totalDefensiveBV + offensiveResult.totalOffensiveBV;
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
   
   const weaponsWithBV = config.weapons.map(w => {
     const weaponId = normalizeWeaponId(w.id);
     let bv = WEAPON_BV[weaponId] ?? 0;
     
     if (w.rear) {
       bv = Math.round(bv * 0.5);
     }
     
     if (config.hasTargetingComputer && !weaponId.includes('lrm') && !weaponId.includes('srm') && !weaponId.includes('mrm')) {
       bv = Math.round(bv * 1.25);
     }
     
     const heat = getWeaponHeat(weaponId);
     
     return {
       id: w.id,
       name: weaponId,
       heat,
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
     totalBV: defensiveResult.totalDefensiveBV + offensiveResult.totalOffensiveBV,
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

