/**
 * Variable Equipment Types
 * 
 * Interfaces and types for equipment with variable properties
 * that depend on mech configuration.
 * 
 * Includes data-driven formula definitions supporting arithmetic operations
 * and MIN/MAX combinators.
 * 
 * @spec openspec/specs/equipment-services/spec.md
 */

import { TechBase } from '../enums/TechBase';

// ============================================================================
// LEGACY TYPES (for backwards compatibility with existing equipment definitions)
// ============================================================================

/**
 * Properties that can be variable for equipment
 */
export enum VariableProperty {
  WEIGHT = 'weight',
  SLOTS = 'slots',
  COST = 'cost',
  BATTLE_VALUE = 'battleValue',
  DAMAGE = 'damage',
}

/**
 * Context required for calculating variable equipment properties
 */
export interface IVariableEquipmentContext {
  /** Mech total tonnage (20-100 for standard mechs) */
  readonly mechTonnage: number;
  
  /** Engine rating (calculated from tonnage × walkMP) */
  readonly engineRating: number;
  
  /** Engine weight in tons (from engine type and rating) */
  readonly engineWeight: number;
  
  /** Total tonnage of direct-fire weapons (for targeting computer) */
  readonly directFireWeaponTonnage: number;
  
  /** Tech base (affects some calculations) */
  readonly techBase: TechBase;
}

/**
 * Configuration for variable equipment
 */
export interface IVariableEquipmentConfig {
  /** Which properties are variable */
  readonly variableProperties: readonly VariableProperty[];
  
  /** ID linking to calculation function */
  readonly calculationId: string;
  
  /** Required inputs from context */
  readonly inputRequirements: readonly (keyof IVariableEquipmentContext)[];
}

/**
 * Result of variable equipment calculation
 */
export interface ICalculatedEquipmentProperties {
  /** Calculated weight in tons */
  readonly weight: number;
  
  /** Calculated critical slots */
  readonly criticalSlots: number;
  
  /** Calculated cost in C-Bills */
  readonly costCBills: number;
  
  /** Calculated battle value (optional) */
  readonly battleValue?: number;
  
  /** Calculated damage (for physical weapons) */
  readonly damage?: number;
}

/**
 * Type for a variable equipment calculation function
 */
export type VariableEquipmentCalculator = (
  context: IVariableEquipmentContext
) => ICalculatedEquipmentProperties;

/**
 * Check if equipment has variable properties
 */
export function isVariableEquipment(
  equipment: { isVariable?: boolean }
): equipment is { isVariable: true; variableConfig: IVariableEquipmentConfig } {
  return equipment.isVariable === true;
}

/**
 * Create a minimal context for calculations
 */
export function createVariableEquipmentContext(
  partial: Partial<IVariableEquipmentContext>
): IVariableEquipmentContext {
  return {
    mechTonnage: partial.mechTonnage ?? 50,
    engineRating: partial.engineRating ?? 200,
    engineWeight: partial.engineWeight ?? 8.5,
    directFireWeaponTonnage: partial.directFireWeaponTonnage ?? 0,
    techBase: partial.techBase ?? TechBase.INNER_SPHERE,
  };
}

// ============================================================================
// FORMULA SYSTEM TYPES (data-driven formula definitions)
// ============================================================================

/**
 * Formula operation types
 */
export type FormulaType = 
  | 'FIXED'           // Constant value
  | 'CEIL_DIVIDE'     // ceil(field / divisor)
  | 'FLOOR_DIVIDE'    // floor(field / divisor)
  | 'MULTIPLY'        // field × multiplier
  | 'MULTIPLY_ROUND'  // field × multiplier, rounded to precision
  | 'EQUALS_WEIGHT'   // = calculated weight (for slots that equal weight)
  | 'EQUALS_FIELD'    // = context field directly
  | 'MIN'             // minimum of sub-formulas
  | 'MAX'             // maximum of sub-formulas
  | 'PLUS';           // base formula + bonus (for physical weapon damage)

/**
 * Formula definition
 * 
 * Each formula type uses specific fields:
 * - FIXED: value
 * - CEIL_DIVIDE, FLOOR_DIVIDE: field, divisor
 * - MULTIPLY: field, multiplier
 * - MULTIPLY_ROUND: field, multiplier, roundTo
 * - EQUALS_WEIGHT: (no additional fields)
 * - EQUALS_FIELD: field
 * - MIN, MAX: formulas (array of sub-formulas)
 */
export interface IFormula {
  readonly type: FormulaType;
  
  /** Context field name to read value from */
  readonly field?: string;
  
  /** Constant value for FIXED type */
  readonly value?: number;
  
  /** Divisor for CEIL_DIVIDE, FLOOR_DIVIDE */
  readonly divisor?: number;
  
  /** Multiplier for MULTIPLY variants */
  readonly multiplier?: number;
  
  /** Rounding precision (0.5, 1, etc.) for MULTIPLY_ROUND */
  readonly roundTo?: number;
  
  /** Sub-formulas for MIN/MAX combinators */
  readonly formulas?: readonly IFormula[];
  
  /** Base formula for PLUS combinator */
  readonly base?: IFormula;
  
  /** Bonus value for PLUS combinator */
  readonly bonus?: number;
}

/**
 * Complete variable equipment formula set
 */
export interface IVariableFormulas {
  /** Formula to calculate weight in tons */
  readonly weight: IFormula;
  
  /** Formula to calculate critical slots */
  readonly criticalSlots: IFormula;
  
  /** Formula to calculate C-Bill cost */
  readonly cost: IFormula;
  
  /** Optional formula to calculate damage (for physical weapons) */
  readonly damage?: IFormula;
  
  /** Context fields required for calculation */
  readonly requiredContext: readonly string[];
}

/**
 * Stored custom formula record (for IndexedDB)
 */
export interface IStoredFormula {
  readonly equipmentId: string;
  readonly formulas: IVariableFormulas;
  readonly createdAt: number;
  readonly modifiedAt: number;
}

// ============================================================================
// HELPER FUNCTIONS FOR CREATING FORMULAS
// ============================================================================

/**
 * Create a FIXED value formula
 */
export function fixed(value: number): IFormula {
  return { type: 'FIXED', value };
}

/**
 * Create a CEIL_DIVIDE formula: ceil(field / divisor)
 */
export function ceilDivide(field: string, divisor: number): IFormula {
  return { type: 'CEIL_DIVIDE', field, divisor };
}

/**
 * Create a FLOOR_DIVIDE formula: floor(field / divisor)
 */
export function floorDivide(field: string, divisor: number): IFormula {
  return { type: 'FLOOR_DIVIDE', field, divisor };
}

/**
 * Create a MULTIPLY formula: field × multiplier
 */
export function multiply(field: string, multiplier: number): IFormula {
  return { type: 'MULTIPLY', field, multiplier };
}

/**
 * Create a MULTIPLY_ROUND formula: field × multiplier, rounded to precision
 */
export function multiplyRound(field: string, multiplier: number, roundTo: number): IFormula {
  return { type: 'MULTIPLY_ROUND', field, multiplier, roundTo };
}

/**
 * Create an EQUALS_WEIGHT formula (slots = calculated weight)
 */
export function equalsWeight(): IFormula {
  return { type: 'EQUALS_WEIGHT' };
}

/**
 * Create an EQUALS_FIELD formula: = context field
 */
export function equalsField(field: string): IFormula {
  return { type: 'EQUALS_FIELD', field };
}

/**
 * Create a MIN formula: minimum of sub-formulas
 */
export function min(...formulas: IFormula[]): IFormula {
  return { type: 'MIN', formulas };
}

/**
 * Create a MAX formula: maximum of sub-formulas
 */
export function max(...formulas: IFormula[]): IFormula {
  return { type: 'MAX', formulas };
}

/**
 * Create a PLUS formula: base formula + bonus
 * Useful for physical weapon damage: floor(tonnage/10) + 1
 */
export function plus(base: IFormula, bonus: number): IFormula {
  return { type: 'PLUS', base, bonus };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a formula definition
 */
export function validateFormula(formula: IFormula): string[] {
  const errors: string[] = [];

  switch (formula.type) {
    case 'FIXED':
      if (formula.value === undefined) {
        errors.push('FIXED formula requires value');
      }
      break;

    case 'CEIL_DIVIDE':
    case 'FLOOR_DIVIDE':
      if (!formula.field) {
        errors.push(`${formula.type} formula requires field`);
      }
      if (formula.divisor === undefined || formula.divisor <= 0) {
        errors.push(`${formula.type} formula requires positive divisor`);
      }
      break;

    case 'MULTIPLY':
      if (!formula.field) {
        errors.push('MULTIPLY formula requires field');
      }
      if (formula.multiplier === undefined) {
        errors.push('MULTIPLY formula requires multiplier');
      }
      break;

    case 'MULTIPLY_ROUND':
      if (!formula.field) {
        errors.push('MULTIPLY_ROUND formula requires field');
      }
      if (formula.multiplier === undefined) {
        errors.push('MULTIPLY_ROUND formula requires multiplier');
      }
      if (formula.roundTo === undefined || formula.roundTo <= 0) {
        errors.push('MULTIPLY_ROUND formula requires positive roundTo');
      }
      break;

    case 'EQUALS_WEIGHT':
      // No additional fields required
      break;

    case 'EQUALS_FIELD':
      if (!formula.field) {
        errors.push('EQUALS_FIELD formula requires field');
      }
      break;

    case 'MIN':
    case 'MAX':
      if (!formula.formulas || formula.formulas.length === 0) {
        errors.push(`${formula.type} formula requires at least one sub-formula`);
      } else {
        // Validate sub-formulas recursively
        for (const subFormula of formula.formulas) {
          errors.push(...validateFormula(subFormula));
        }
      }
      break;

    case 'PLUS':
      if (!formula.base) {
        errors.push('PLUS formula requires base formula');
      } else {
        errors.push(...validateFormula(formula.base));
      }
      if (formula.bonus === undefined) {
        errors.push('PLUS formula requires bonus value');
      }
      break;

    default:
      errors.push(`Unknown formula type: ${(formula as IFormula).type}`);
  }

  return errors;
}

/**
 * Validate a complete variable formulas definition
 */
export function validateVariableFormulas(formulas: IVariableFormulas): string[] {
  const errors: string[] = [];

  errors.push(...validateFormula(formulas.weight).map(e => `weight: ${e}`));
  errors.push(...validateFormula(formulas.criticalSlots).map(e => `criticalSlots: ${e}`));
  errors.push(...validateFormula(formulas.cost).map(e => `cost: ${e}`));
  
  // Damage formula is optional (only for physical weapons)
  if (formulas.damage) {
    errors.push(...validateFormula(formulas.damage).map(e => `damage: ${e}`));
  }

  if (!formulas.requiredContext || !Array.isArray(formulas.requiredContext)) {
    errors.push('requiredContext must be an array');
  }

  return errors;
}
