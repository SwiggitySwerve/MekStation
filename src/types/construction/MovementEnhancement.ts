/**
 * Movement Enhancement Type Definitions
 *
 * Defines MASC, TSM, Supercharger, and other movement enhancers.
 * Static metadata only - for weight/slot calculations use EquipmentCalculatorService.
 *
 * @spec openspec/specs/movement-system/spec.md
 */

import { RulesLevel } from '../enums/RulesLevel';
import { TechBase } from '../enums/TechBase';

/**
 * Movement enhancement type enumeration
 */
export enum MovementEnhancementType {
  MASC = 'MASC',
  SUPERCHARGER = 'Supercharger',
  TSM = 'Triple-Strength Myomer',
  PARTIAL_WING = 'Partial Wing',
}

/**
 * Movement enhancement definition (static metadata only)
 *
 * For weight/slot calculations, use EquipmentCalculatorService with:
 * - 'masc-is': IS MASC (tonnage / 20, rounded to nearest whole ton)
 *   Examples: 85t → 4 tons, 90t → 5 tons
 * - 'masc-clan': Clan MASC (tonnage / 25, rounded to nearest whole ton)
 * - 'supercharger': Supercharger (engineWeight × 10%, rounded to 0.5t)
 * - 'tsm': TSM (0 weight, 6 slots)
 * - 'partial-wing': Partial Wing (tonnage × 5%, rounded to 0.5t, 6 slots)
 */
export interface MovementEnhancementDefinition {
  readonly type: MovementEnhancementType;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  /** Movement multiplier when active */
  readonly activeMultiplier: number;
  /** Can be used with other enhancements? */
  readonly exclusions: MovementEnhancementType[];
  /** Introduction year */
  readonly introductionYear: number;
}

/**
 * Movement enhancement definitions (static metadata)
 *
 * Weight and slot calculations are handled by EquipmentCalculatorService
 * using the formula registry in variableEquipmentFormulas.ts
 */
export const MOVEMENT_ENHANCEMENT_DEFINITIONS: readonly MovementEnhancementDefinition[] =
  [
    {
      type: MovementEnhancementType.MASC,
      name: 'Myomer Accelerator Signal Circuitry (MASC)',
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.STANDARD,
      activeMultiplier: 2.0, // sprint = walk × 2
      exclusions: [], // Can combine with Supercharger but NOT another MASC
      introductionYear: 2740,
    },
    {
      type: MovementEnhancementType.SUPERCHARGER,
      name: 'Supercharger',
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.ADVANCED,
      activeMultiplier: 2.0, // sprint = walk × 2
      exclusions: [], // Can combine with MASC
      introductionYear: 3072,
    },
    {
      type: MovementEnhancementType.TSM,
      name: 'Triple-Strength Myomer',
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.STANDARD,
      activeMultiplier: 1.5, // +2 walk MP when activated
      exclusions: [MovementEnhancementType.MASC], // Incompatible with MASC
      introductionYear: 3050,
    },
    {
      type: MovementEnhancementType.PARTIAL_WING,
      name: 'Partial Wing',
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.EXPERIMENTAL,
      activeMultiplier: 1.0, // Adds jump MP, doesn't multiply
      exclusions: [],
      introductionYear: 3067,
    },
  ] as const;

/**
 * Get movement enhancement definition by type
 */
export function getMovementEnhancementDefinition(
  type: MovementEnhancementType,
): MovementEnhancementDefinition | undefined {
  return MOVEMENT_ENHANCEMENT_DEFINITIONS.find((def) => def.type === type);
}

/**
 * Validate movement enhancement compatibility
 */
export function validateEnhancementCombination(
  enhancements: MovementEnhancementType[],
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for duplicates
  const uniqueTypes = new Set(enhancements);
  if (uniqueTypes.size !== enhancements.length) {
    errors.push('Cannot have multiple of the same movement enhancement');
  }

  // Check exclusions
  for (const type of enhancements) {
    const def = getMovementEnhancementDefinition(type);
    if (def) {
      for (const exclusion of def.exclusions) {
        if (enhancements.includes(exclusion)) {
          errors.push(`${type} is incompatible with ${exclusion}`);
        }
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}
