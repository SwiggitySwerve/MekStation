/**
 * UnitContext - Runtime context for dynamic component calculations
 * 
 * This interface represents all the unit properties that can be referenced
 * when calculating component weights, slots, and other derived properties.
 */

import { 
    TechBase, 
    RulesLevel, 
    UnitType 
} from '../../../types/core/BaseTypes';

import {
    EngineType,
    GyroType,
    StructureType,
    ArmorType,
    HeatSinkType
} from '../../../constants/BattleTechConstructionRules';

// Re-export for convenience in local files
export { 
    TechBase, 
    RulesLevel, 
    UnitType,
    EngineType,
    GyroType,
    StructureType,
    ArmorType,
    HeatSinkType
};

/**
 * UnitContext contains all unit properties that can be referenced at runtime
 * for dynamic calculations
 */
export interface UnitContext {
  // Primary identifiers
  tonnage: number;          // 20-100 tons for BattleMechs
  techBase: TechBase;       // Unit's overall tech base
  unitType: UnitType;       // 'BattleMech' | 'IndustrialMech' | etc
  rulesLevel: RulesLevel;   // 'Introductory' | 'Standard' | 'Advanced' | 'Experimental'
  
  // Engine properties
  engineRating: number;     // 10-400+
  engineType: EngineType;   // 'Standard' | 'XL' | 'Light' | etc
  engineTechBase?: TechBase; // Specific tech base of the engine (for Mixed Tech)
  
  // Movement
  walkMP: number;           // Derived: engineRating / tonnage
  runMP: number;            // Derived: walkMP * 1.5 (rounded down)
  jumpMP: number;           // 0-8+
  
  // Gyro
  gyroType: GyroType;       // 'Standard' | 'Compact' | 'XL' | 'Heavy-Duty'
  
  // Structure & Armor
  structureType: StructureType;
  armorType: ArmorType;
  armorPoints: number;      // Total armor points allocated
  
  // Heat management
  heatSinkType: HeatSinkType;  // 'Single' | 'Double' | 'Compact' | 'Laser'
  heatSinkCount: number;       // Total heat sinks
  
  // Era restrictions
  constructionYear: number;
  
  // Custom: Allow extension for future use
  custom: Record<string, any>;
}

/**
 * Create a default UnitContext for testing or initial state
 */
export function createDefaultUnitContext(): UnitContext {
  return {
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    unitType: UnitType.BATTLEMECH,
    rulesLevel: RulesLevel.STANDARD,
    engineRating: 200,
    engineType: 'Standard',
    engineTechBase: TechBase.INNER_SPHERE,
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    gyroType: 'Standard',
    structureType: 'Standard',
    armorType: 'Standard',
    armorPoints: 0,
    heatSinkType: 'Single',
    heatSinkCount: 10,
    constructionYear: 3025,
    custom: {}
  };
}

/**
 * Validate a UnitContext
 */
export function validateUnitContext(context: Partial<UnitContext>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (context.tonnage !== undefined) {
    if (context.tonnage < 10 || context.tonnage > 200) {
      errors.push('Tonnage must be between 10 and 200');
    }
  }
  
  if (context.engineRating !== undefined) {
    if (context.engineRating < 10 || context.engineRating > 500) {
      errors.push('Engine rating must be between 10 and 500');
    }
  }
  
  if (context.walkMP !== undefined && context.walkMP < 0) {
    errors.push('Walk MP cannot be negative');
  }
  
  if (context.armorPoints !== undefined && context.armorPoints < 0) {
    errors.push('Armor points cannot be negative');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
