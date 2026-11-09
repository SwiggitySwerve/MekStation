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
  SUPERHEAVY = 'Superheavy Gyro',
  NONE = 'None',
}

export const NO_GYRO_SOURCE_TAG = 'NONE';

/**
 * Gyro definition with all characteristics
 */
export interface GyroDefinition {
  readonly type: GyroType;
  /** Native source tag for variants absent from legacy mapper aliases. */
  readonly sourceTag?: string;
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
    introductionYear: 3050, // 48fcb2f64 Mek.java:3677-3684 (3055, approximate).
    hitsToDestroy: 2,
  },
  {
    type: GyroType.COMPACT,
    name: 'Compact Gyro',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weightMultiplier: 1.5,
    criticalSlots: 2,
    introductionYear: 3050, // 48fcb2f64 Mek.java:3685-3694 (3055, approximate).
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
  {
    type: GyroType.SUPERHEAVY,
    name: 'Superheavy Gyro',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    // 48fcb2f64 TestMek.java:249-264: superheavy weighs twice, like heavy-duty.
    weightMultiplier: 2.0,
    criticalSlots: 4,
    introductionYear: 3076,
    hitsToDestroy: 2,
  },
  {
    // MegaMek 48fcb2f64 TestMek.java:258-259; Engine.java:639-640.
    type: GyroType.NONE,
    sourceTag: NO_GYRO_SOURCE_TAG,
    name: 'No Gyro',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weightMultiplier: 0,
    criticalSlots: 0,
    introductionYear: 0, // No introduction date: Mek.java:3710-3716 placeholder.
    hitsToDestroy: 0,
  },
] as const;

/** Shared native identity; legacy exact/fuzzy aliases retain their guards. */
export function getNativeGyroType(source: string): GyroType | undefined {
  return GYRO_DEFINITIONS.find(
    (definition) => definition.sourceTag === source.trim().toUpperCase(),
  )?.type;
}

/**
 * Get gyro definition by type
 */
export function getGyroDefinition(type: GyroType): GyroDefinition | undefined {
  return GYRO_DEFINITIONS.find((def) => def.type === type);
}
