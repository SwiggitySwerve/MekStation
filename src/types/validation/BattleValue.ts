/**
 * Battle Value System Types
 *
 * Defines BV calculation types and interfaces.
 *
 * @spec openspec/specs/battle-value-system/spec.md
 */

import { EngineType } from '../construction/EngineType';

/**
 * Battle Value calculation version
 */
export enum BVVersion {
  BV1 = 'BV1',
  BV2 = 'BV2',
}

/**
 * Speed factor lookup table for BV2 - indexed by TMM (Target Movement Modifier)
 * Per TechManual BV2 rules
 */
export const BV2_SPEED_FACTORS_BY_TMM: Record<number, number> = {
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
 * Calculate TMM from movement points
 * Per TechManual movement rules
 */
export function calculateTMM(runMP: number, jumpMP: number = 0): number {
  // Use the better of run or jump MP for TMM calculation
  const effectiveMP = Math.max(runMP, jumpMP);

  if (effectiveMP <= 2) return 0;
  if (effectiveMP <= 4) return 1;
  if (effectiveMP <= 6) return 2;
  if (effectiveMP <= 9) return 3;
  if (effectiveMP <= 17) return 4;
  if (effectiveMP <= 24) return 5;
  return 6;
}

/**
 * @deprecated Use BV2_SPEED_FACTORS_BY_TMM with calculateTMM instead
 * Speed factor lookup table for BV2 - indexed by raw MP (legacy/incorrect)
 */
export const BV2_SPEED_FACTORS: Record<number, number> = {
  0: 0.44,
  1: 0.54,
  2: 0.64,
  3: 0.74,
  4: 0.84,
  5: 0.94,
  6: 1.0,
  7: 1.0,
  8: 1.08,
  9: 1.17,
  10: 1.28,
  11: 1.28,
  12: 1.37,
  13: 1.37,
  14: 1.46,
  15: 1.46,
  16: 1.55,
  17: 1.55,
  18: 1.64,
  19: 1.64,
  20: 1.73,
  21: 1.73,
  22: 1.82,
  23: 1.82,
  24: 1.91,
  25: 2.0,
};

/**
 * Armor type BV multipliers
 * Per MegaMek BVCalculator.java:1477-1498
 */
export const ARMOR_BV_MULTIPLIERS: Record<string, number> = {
  hardened: 2.0,
  reactive: 1.5,
  reflective: 1.5,
  'ballistic-reinforced': 1.5,
  'ferro-lamellor': 1.2,
  'anti-penetrative': 1.2,
  'heat-dissipating': 1.1,
  standard: 1.0,
};

/**
 * Structure type BV multipliers
 * Per MegaMek MekBVCalculator.java:88-123
 */
export const STRUCTURE_BV_MULTIPLIERS: Record<string, number> = {
  industrial: 0.5,
  composite: 0.5,
  reinforced: 2.0,
  standard: 1.0,
};

/**
 * Gyro type BV multipliers
 * Per MegaMek Mek.java:5589-5597
 * Formula: tonnage × gyro_multiplier
 */
export const GYRO_BV_MULTIPLIERS: Record<string, number> = {
  standard: 0.5,
  xl: 0.5,
  compact: 0.5,
  'heavy-duty': 1.0,
};

/**
 * Engine type BV multipliers for structure calculation
 * Per MegaMek Engine.getBVMultiplier()
 * XL/XXL engines reduce structure BV because they're more fragile
 * Formula: structureBV = totalStructure × 1.5 × structureMultiplier × engineMultiplier
 */
export const ENGINE_BV_MULTIPLIERS: Record<EngineType, number> = {
  [EngineType.STANDARD]: 1.0,
  [EngineType.XL_IS]: 0.75,
  [EngineType.XL_CLAN]: 0.75,
  [EngineType.LIGHT]: 0.75,
  [EngineType.XXL]: 0.5,
  [EngineType.COMPACT]: 1.0,
  [EngineType.ICE]: 1.0,
  [EngineType.FUEL_CELL]: 1.0,
  [EngineType.FISSION]: 1.0,
};

/**
 * Pilot skill BV multiplier matrix
 * 9×9 matrix: gunnery (0-8) × piloting (0-8)
 * Per MegaMek BVCalculator.java:1265-1274
 * Baseline (4/5): 1.0
 */
export const PILOT_SKILL_MULTIPLIERS: number[][] = [
  [2.42, 2.31, 2.21, 2.1, 1.93, 1.75, 1.68, 1.59, 1.5], // gunnery 0
  [2.21, 2.11, 2.02, 1.92, 1.76, 1.6, 1.54, 1.46, 1.38], // gunnery 1
  [1.93, 1.85, 1.76, 1.68, 1.54, 1.4, 1.35, 1.28, 1.21], // gunnery 2
  [1.66, 1.58, 1.51, 1.44, 1.32, 1.2, 1.16, 1.1, 1.04], // gunnery 3
  [1.38, 1.32, 1.26, 1.2, 1.1, 1.0, 0.95, 0.9, 0.85], // gunnery 4
  [1.31, 1.19, 1.13, 1.08, 0.99, 0.9, 0.86, 0.81, 0.77], // gunnery 5
  [1.24, 1.12, 1.07, 1.02, 0.94, 0.85, 0.81, 0.77, 0.72], // gunnery 6
  [1.17, 1.06, 1.01, 0.96, 0.88, 0.8, 0.76, 0.72, 0.68], // gunnery 7
  [1.1, 0.99, 0.95, 0.9, 0.83, 0.75, 0.71, 0.68, 0.64], // gunnery 8
];

/**
 * Get armor BV multiplier by type
 * Returns 1.0 (standard) if type not found
 */
export function getArmorBVMultiplier(armorType: string): number {
  return ARMOR_BV_MULTIPLIERS[armorType.toLowerCase()] ?? 1.0;
}

/**
 * Get structure BV multiplier by type
 * Returns 1.0 (standard) if type not found
 */
export function getStructureBVMultiplier(structureType: string): number {
  return STRUCTURE_BV_MULTIPLIERS[structureType.toLowerCase()] ?? 1.0;
}

/**
 * Get gyro BV multiplier by type
 * Returns 0.5 (standard) if type not found
 */
export function getGyroBVMultiplier(gyroType: string): number {
  return GYRO_BV_MULTIPLIERS[gyroType.toLowerCase()] ?? 0.5;
}

/**
 * Get engine BV multiplier by type
 * Returns 1.0 (standard) if type not found
 */
export function getEngineBVMultiplier(engineType: EngineType): number {
  return ENGINE_BV_MULTIPLIERS[engineType] ?? 1.0;
}

/**
 * Calculate pilot skill BV modifier using full 9×9 matrix
 * Gunnery/Piloting of 4/5 is baseline (1.0 modifier)
 * Per MegaMek BVCalculator.java:1265-1274
 */
export function getPilotSkillModifier(
  gunnery: number,
  piloting: number,
): number {
  // Clamp values to valid range (0-8)
  const g = Math.max(0, Math.min(8, Math.floor(gunnery)));
  const p = Math.max(0, Math.min(8, Math.floor(piloting)));

  return PILOT_SKILL_MULTIPLIERS[g][p];
}

/**
 * Defensive BV components
 */
export interface DefensiveBVComponents {
  readonly armorBV: number;
  readonly structureBV: number;
  readonly defensiveModifier: number;
  readonly totalDefensiveBV: number;
}

/**
 * Offensive BV components
 */
export interface OffensiveBVComponents {
  readonly weaponsBV: number;
  readonly ammoBV: number;
  readonly heatAdjustment: number;
  readonly speedFactor: number;
  readonly totalOffensiveBV: number;
}

/**
 * BV modifiers
 */
export interface BVModifiers {
  readonly pilotSkillModifier: number;
  readonly c3Modifier: number;
  readonly targetingComputerModifier: number;
  readonly otherModifiers: number;
  readonly totalModifier: number;
}

/**
 * Complete BV breakdown
 */
export interface BVCalculation {
  readonly version: BVVersion;
  readonly defensive: DefensiveBVComponents;
  readonly offensive: OffensiveBVComponents;
  readonly modifiers: BVModifiers;
  readonly baseBV: number;
  readonly finalBV: number;
}

/**
 * Offensive speed factor lookup table - indexed by TMM
 * Per MegaMekLab BV2 implementation
 * Offensive factors are slightly lower than defensive factors
 */
export const BV2_OFFENSIVE_SPEED_FACTORS_BY_TMM: Record<number, number> = {
  0: 1.0,
  1: 1.06,
  2: 1.12,
  3: 1.18,
  4: 1.24,
  5: 1.3,
  6: 1.36,
  7: 1.42,
  8: 1.48,
  9: 1.54,
  10: 1.6,
};

/**
 * Get defensive speed factor for BV2 calculation
 * Applied to (armor + structure + gyro)
 */
export function getDefensiveSpeedFactor(runMP: number, jumpMP: number): number {
  const tmm = calculateTMM(runMP, jumpMP);
  const cappedTMM = Math.min(10, Math.max(0, tmm));
  return BV2_SPEED_FACTORS_BY_TMM[cappedTMM] ?? 1.0;
}

/**
 * Get offensive speed factor for BV2 calculation
 * Applied to (weapons + ammo + weight bonus)
 * Slightly lower than defensive factor per MegaMekLab
 */
export function getOffensiveSpeedFactor(runMP: number, jumpMP: number): number {
  const tmm = calculateTMM(runMP, jumpMP);
  const cappedTMM = Math.min(10, Math.max(0, tmm));
  return BV2_OFFENSIVE_SPEED_FACTORS_BY_TMM[cappedTMM] ?? 1.0;
}

/**
 * @deprecated Use getDefensiveSpeedFactor or getOffensiveSpeedFactor instead
 * Get speed factor for BV2 calculation
 */
export function getBV2SpeedFactor(runMP: number, jumpMP: number): number {
  // Use higher of run or jump MP (jump weighted by 0.5)
  const effectiveSpeed = Math.max(runMP, Math.ceil(jumpMP * 0.5));

  if (effectiveSpeed <= 0) return BV2_SPEED_FACTORS[0];
  if (effectiveSpeed >= 25) return BV2_SPEED_FACTORS[25];
  return BV2_SPEED_FACTORS[effectiveSpeed] ?? 1.0;
}
