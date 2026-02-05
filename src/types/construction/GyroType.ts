/**
 * Gyro Type Definitions
 *
 * Defines all standard BattleTech gyro types with their characteristics.
 *
 * @spec openspec/specs/gyro-system/spec.md
 */

import { RulesLevel } from '../enums/RulesLevel';
import { TechBase } from '../enums/TechBase';

/**
 * Gyro type enumeration
 */
export enum GyroType {
  STANDARD = 'Standard Gyro',
  XL = 'XL Gyro',
  COMPACT = 'Compact Gyro',
  HEAVY_DUTY = 'Heavy-Duty Gyro',
}

/**
 * Gyro definition with all characteristics
 */
export interface GyroDefinition {
  readonly type: GyroType;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  /** Weight multiplier compared to standard (1.0 = standard) */
  readonly weightMultiplier: number;
  /** Critical slots required in center torso */
  readonly criticalSlots: number;
  /** Introduction year */
  readonly introductionYear: number;
  /** Gyro hit modifiers */
  readonly hitsToDestroy: number;
}

/**
 * All gyro type definitions
 */
export const GYRO_DEFINITIONS: readonly GyroDefinition[] = [
  {
    type: GyroType.STANDARD,
    name: 'Standard Gyro',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    weightMultiplier: 1.0,
    criticalSlots: 4,
    introductionYear: 2300,
    hitsToDestroy: 2,
  },
  {
    type: GyroType.XL,
    name: 'XL Gyro',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weightMultiplier: 0.5,
    criticalSlots: 6,
    introductionYear: 3067,
    hitsToDestroy: 2,
  },
  {
    type: GyroType.COMPACT,
    name: 'Compact Gyro',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weightMultiplier: 1.5,
    criticalSlots: 2,
    introductionYear: 3068,
    hitsToDestroy: 2,
  },
  {
    type: GyroType.HEAVY_DUTY,
    name: 'Heavy-Duty Gyro',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weightMultiplier: 2.0,
    criticalSlots: 4,
    introductionYear: 3067,
    hitsToDestroy: 3, // More resilient
  },
] as const;

/**
 * Get gyro definition by type
 */
export function getGyroDefinition(type: GyroType): GyroDefinition | undefined {
  return GYRO_DEFINITIONS.find((def) => def.type === type);
}
