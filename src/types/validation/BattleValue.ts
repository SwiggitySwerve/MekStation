/**
 * Battle Value System Types
 * 
 * Defines BV calculation types and interfaces.
 * 
 * @spec openspec/changes/implement-phase4-validation/specs/battle-value-system/spec.md
 */

/**
 * Battle Value calculation version
 */
export enum BVVersion {
  BV1 = 'BV1',
  BV2 = 'BV2',
}

/**
 * Speed factor lookup table for BV2
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

