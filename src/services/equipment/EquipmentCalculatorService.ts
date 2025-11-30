/**
 * Equipment Calculator Service
 * 
 * Calculates variable equipment properties using the formula registry.
 * Supports both built-in and custom equipment formulas.
 * 
 * @spec openspec/specs/equipment-services/spec.md
 */

import { IVariableEquipmentContext, ICalculatedEquipmentProperties } from '../common/types';
import { ValidationError } from '../common/errors';
import { formulaRegistry, IFormulaRegistry } from './FormulaRegistry';
import { formulaEvaluator, IFormulaEvaluator, FormulaContext } from './FormulaEvaluator';

/**
 * Equipment calculator service interface
 */
export interface IEquipmentCalculatorService {
  initialize(): Promise<void>;
  
  calculateProperties(
    equipmentId: string,
    context: IVariableEquipmentContext
  ): ICalculatedEquipmentProperties;
  
  isVariable(equipmentId: string): boolean;
  
  getRequiredContext(equipmentId: string): readonly string[];
  
  getAllVariableEquipmentIds(): string[];
}

/**
 * Equipment Calculator Service implementation
 * 
 * Uses FormulaRegistry for formula definitions and FormulaEvaluator for evaluation.
 */
export class EquipmentCalculatorService implements IEquipmentCalculatorService {
  private readonly registry: IFormulaRegistry;
  private readonly evaluator: IFormulaEvaluator;

  constructor(
    registry: IFormulaRegistry = formulaRegistry,
    evaluator: IFormulaEvaluator = formulaEvaluator
  ) {
    this.registry = registry;
    this.evaluator = evaluator;
  }

  /**
   * Initialize the service (loads custom formulas from storage)
   */
  async initialize(): Promise<void> {
    await this.registry.initialize();
  }

  /**
   * Calculate properties for variable equipment
   */
  calculateProperties(
    equipmentId: string,
    context: IVariableEquipmentContext
  ): ICalculatedEquipmentProperties {
    // Get formulas from registry
    const formulas = this.registry.getFormulas(equipmentId);
    
    if (!formulas) {
      throw new ValidationError(
        `Unknown variable equipment: ${equipmentId}`,
        [`Equipment ID '${equipmentId}' has no formula definition`]
      );
    }

    // Validate required context
    const formulaContext = this.buildFormulaContext(context);
    const required = formulas.requiredContext;
    const missing = required.filter(field => formulaContext[field] === undefined);
    
    if (missing.length > 0) {
      throw new ValidationError(
        `Missing required context for ${equipmentId}`,
        missing.map(f => `Missing: ${f}`)
      );
    }

    // Calculate weight first (may be needed by other formulas)
    const weight = this.evaluator.evaluate(formulas.weight, formulaContext);
    
    // Add calculated weight to context for EQUALS_WEIGHT formulas
    const contextWithWeight: FormulaContext = {
      ...formulaContext,
      weight,
    };

    // Calculate slots and cost
    const criticalSlots = this.evaluator.evaluate(formulas.criticalSlots, contextWithWeight);
    const cost = this.evaluator.evaluate(formulas.cost, contextWithWeight);

    // Calculate damage if formula exists (physical weapons)
    const damage = formulas.damage 
      ? this.evaluator.evaluate(formulas.damage, contextWithWeight)
      : undefined;

    return {
      weight,
      criticalSlots,
      cost,
      ...(damage !== undefined && { damage }),
    };
  }

  /**
   * Check if equipment has variable properties
   */
  isVariable(equipmentId: string): boolean {
    return this.registry.isVariable(equipmentId);
  }

  /**
   * Get required context fields for equipment
   */
  getRequiredContext(equipmentId: string): readonly string[] {
    return this.registry.getRequiredContext(equipmentId);
  }

  /**
   * Get all variable equipment IDs
   */
  getAllVariableEquipmentIds(): string[] {
    return this.registry.getAllVariableEquipmentIds();
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Build formula context from variable equipment context
   */
  private buildFormulaContext(context: IVariableEquipmentContext): FormulaContext {
    const formulaContext: FormulaContext = {};

    // Map all defined properties to formula context
    if (context.tonnage !== undefined) {
      formulaContext.tonnage = context.tonnage;
    }
    if (context.engineRating !== undefined) {
      formulaContext.engineRating = context.engineRating;
    }
    if (context.engineWeight !== undefined) {
      formulaContext.engineWeight = context.engineWeight;
    }
    if (context.directFireWeaponTonnage !== undefined) {
      formulaContext.directFireWeaponTonnage = context.directFireWeaponTonnage;
    }
    if (context.techBase !== undefined) {
      // Convert TechBase enum to string for formula context
      formulaContext.techBase = typeof context.techBase === 'string' 
        ? 0 // Default numeric value
        : context.techBase;
    }

    return formulaContext;
  }
}

// Singleton instance
export const equipmentCalculatorService = new EquipmentCalculatorService();

/**
 * Variable equipment ID constants
 * Preserved for backwards compatibility
 */
export const VARIABLE_EQUIPMENT = {
  // Movement equipment
  TARGETING_COMPUTER_IS: 'targeting-computer-is',
  TARGETING_COMPUTER_CLAN: 'targeting-computer-clan',
  MASC_IS: 'masc-is',
  MASC_CLAN: 'masc-clan',
  SUPERCHARGER: 'supercharger',
  PARTIAL_WING: 'partial-wing',
  TSM: 'tsm',
  
  // Physical weapons
  HATCHET: 'hatchet',
  SWORD: 'sword',
  MACE: 'mace',
  CLAWS: 'claws',
  LANCE: 'lance',
  TALONS: 'talons',
  RETRACTABLE_BLADE: 'retractable-blade',
  FLAIL: 'flail',
  WRECKING_BALL: 'wrecking-ball',
} as const;
