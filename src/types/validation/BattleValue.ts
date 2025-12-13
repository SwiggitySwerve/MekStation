/**
 * Battle Value System Types
 * 
 * Defines BV calculation types and interfaces.
 * 
 * @spec openspec/specs/battle-value-system/spec.md
 */

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
  5: 1.30,
  6: 1.36,
  7: 1.42,
  8: 1.48,
  9: 1.54,
  10: 1.60,
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

/**
 * Calculate pilot skill BV modifier
 * Gunnery/Piloting of 4/5 is baseline (1.0 modifier)
 */
export function getPilotSkillModifier(gunnery: number, piloting: number): number {
  // Simplified - full table is more complex
  const skillTotal = gunnery + piloting;
  if (skillTotal <= 5) return 1.4;
  if (skillTotal <= 7) return 1.2;
  if (skillTotal <= 9) return 1.0;
  if (skillTotal <= 11) return 0.9;
  return 0.8;
}

