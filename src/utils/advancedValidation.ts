// Advanced validation system for complete BattleTech rule compliance
import { EditableUnit, ValidationResult, ValidationError } from '../types/editor';
import { FullEquipment } from '../types/index';
import { WeaponRangeValidator } from './weaponRangeValidation';
import { calculateEngineWeight, calculateStructureWeight } from '../types/systemComponents';
import { calculateInternalHeatSinks } from './heatSinkCalculations';
import { calculateArmorWeight } from './armorCalculations';
import { StructureType, EngineType, ArmorType } from '../types/systemComponents';

export interface ValidationContext {
  strictMode: boolean;           // Enforce tournament legal rules
  eraRestrictions: boolean;      // Check era-appropriate tech
  customRules: boolean;          // Allow house rules
  experimentalTech: boolean;     // Allow experimental equipment
  skipCostValidation: boolean;   // Skip BV/cost calculations
}

export interface DetailedValidationResult extends ValidationResult {
  criticalErrors: ValidationError[];    // Must fix to be playable
  suggestions: ValidationSuggestion[];  // Optimization recommendations
  ruleViolations: RuleViolation[];     // Specific rule violations
  battleValue: number;                  // Calculated BV
  cost: number;                        // C-Bill cost
  isLegal: boolean;                    // Tournament legal
  isOptimal: boolean;                  // Well-optimized design
}

export interface ValidationSuggestion {
  id: string;
  category: 'armor' | 'weapons' | 'heat' | 'structure' | 'movement' | 'cost';
  severity: 'info' | 'minor' | 'major';
  message: string;
  explanation?: string;
}

export interface RuleViolation {
  rule: string;
  section: string;              // TechManual section reference
  description: string;
  violationType: 'construction' | 'equipment' | 'era' | 'tech-base';
  canContinue: boolean;        // Can still play with this violation
}

// Type-safe casting functions for component enums
function castToStructureType(structureType: string): StructureType {
  const validTypes: StructureType[] = ['Standard', 'Endo Steel', 'Endo Steel (Clan)', 'Composite', 'Reinforced', 'Industrial'];
  return validTypes.includes(structureType as StructureType) ? structureType as StructureType : 'Standard';
}

function castToEngineType(engineType: string): EngineType {
  const validTypes: EngineType[] = ['Standard', 'XL (IS)', 'XL (Clan)', 'Light', 'XXL', 'Compact', 'ICE', 'Fuel Cell'];
  return validTypes.includes(engineType as EngineType) ? engineType as EngineType : 'Standard';
}

function castToArmorType(armorType: string): ArmorType {
  const validTypes: ArmorType[] = ['Standard', 'Ferro-Fibrous', 'Ferro-Fibrous (Clan)', 'Light Ferro-Fibrous', 'Heavy Ferro-Fibrous', 'Stealth', 'Reactive', 'Reflective', 'Hardened'];
  return validTypes.includes(armorType as ArmorType) ? armorType as ArmorType : 'Standard';
}

// Type-safe range extraction for weapons
interface WeaponRange {
  short?: number;
  medium?: number;
  long?: number;
}

function safeGetWeaponRange(weapon: FullEquipment): WeaponRange {
  if (weapon.range && typeof weapon.range === 'object') {
    const range = weapon.range as Record<string, unknown>;
    return {
      short: typeof range.short === 'number' ? range.short : undefined,
      medium: typeof range.medium === 'number' ? range.medium : undefined,
      long: typeof range.long === 'number' ? range.long : undefined
    };
  }
  if (weapon.data?.range && typeof weapon.data.range === 'object') {
    const range = weapon.data.range as Record<string, unknown>;
    return {
      short: typeof range.short === 'number' ? range.short : undefined,
      medium: typeof range.medium === 'number' ? range.medium : undefined,
      long: typeof range.long === 'number' ? range.long : undefined
    };
  }
  return {};
}

/**
 * Comprehensive advanced validation
 */
export function performAdvancedValidation(
  unit: EditableUnit,
  context: ValidationContext = {
    strictMode: false,
    eraRestrictions: true,
    customRules: false,
    experimentalTech: false,
    skipCostValidation: false
  }
): DetailedValidationResult {
  
  const result: DetailedValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    criticalErrors: [],
    suggestions: [],
    ruleViolations: [],
    battleValue: 0,
    cost: 0,
    isLegal: true,
    isOptimal: true
  };

  // Validate core structure
  validateCoreStructure(unit, result, context);
  
  // Validate heat management
  validateHeatManagement(unit, result, context);
  
  // Validate armor allocation
  validateArmorAllocation(unit, result, context);
  
  // Validate equipment placement
  validateEquipmentPlacement(unit, result, context);
  
  // Calculate battle value and cost
  if (!context.skipCostValidation) {
    calculateBattleValueAndCost(unit, result, context);
  }
  
  // Generate optimization suggestions
  generateOptimizationSuggestions(unit, result, context);
  
  // Final validation summary
  result.isValid = result.criticalErrors.length === 0;
  result.isLegal = result.ruleViolations.filter(v => !v.canContinue).length === 0;
  result.isOptimal = result.suggestions.filter(s => s.severity === 'major').length === 0;
  
  return result;
}

/**
 * Validate core unit structure
 */
function validateCoreStructure(unit: EditableUnit, result: DetailedValidationResult, context: ValidationContext) {
  const data = unit.data;
  
  // Mass validation
  if (!unit.mass || unit.mass < 20 || unit.mass > 100) {
    result.criticalErrors.push({
      id: 'invalid-mass',
      field: 'mass',
      category: 'error',
      message: `Invalid mass: ${unit.mass}. BattleMechs must be 20-100 tons.`
    });
  }
  
  // Engine rating validation
  const engineRating = data.engine?.rating || 0;
  if (engineRating < 10 || engineRating > 400) {
    result.criticalErrors.push({
      id: 'invalid-engine-rating',
      field: 'engine.rating',
      category: 'error',
      message: `Engine rating ${engineRating} is outside valid range (10-400).`
    });
  }
  
  // Walking MP validation
  const walkingMP = data.movement?.walk_mp || 0;
  if (walkingMP < 1) {
    result.criticalErrors.push({
      id: 'no-movement',
      field: 'movement.walk_mp',
      category: 'error',
      message: 'Unit must have at least 1 walking MP'
    });
  }
}

/**
 * Validate heat management systems
 */
function validateHeatManagement(unit: EditableUnit, result: DetailedValidationResult, context: ValidationContext) {
  const data = unit.data;
  const heatSinks = data.heat_sinks?.count || 10;
  const engineRating = data.engine?.rating || 100;
  
  // Minimum heat sink requirement
  const minHeatSinks = Math.max(10, Math.floor(engineRating / 25));
  if (heatSinks < minHeatSinks) {
    result.criticalErrors.push({
      id: 'insufficient-heat-sinks',
      field: 'heat_sinks.count',
      category: 'error',
      message: `Minimum ${minHeatSinks} heat sinks required (current: ${heatSinks})`
    });
  }
  
  // Heat balance analysis
  const weapons = unit.equipmentPlacements?.filter(eq => isWeaponEquipment(eq.equipment)) || [];
  const totalHeatGeneration = weapons.reduce((sum, weapon) => {
    const heat = weapon.equipment.heat || weapon.equipment.data?.heatmap || 0;
    return sum + Number(heat);
  }, 0);
  
  const heatSinkType = data.heat_sinks?.type || 'Single';
  const dissipation = heatSinks * (heatSinkType === 'Double' ? 2 : 1);
  
  if (totalHeatGeneration > dissipation + 5) {
    result.warnings.push({
      id: 'excessive-heat-generation',
      field: 'heat_sinks.count',
      category: 'warning',
      message: `Heat generation (${totalHeatGeneration}) significantly exceeds dissipation (${dissipation})`
    });
  }
}

/**
 * Validate armor allocation
 */
function validateArmorAllocation(unit: EditableUnit, result: DetailedValidationResult, context: ValidationContext) {
  const armor = unit.armorAllocation;
  if (!armor) return;
  
  Object.entries(armor).forEach(([location, allocation]) => {
    // Check for excessive armor
    if (allocation.front > allocation.maxArmor) {
      result.criticalErrors.push({
        id: `excessive-armor-${location}`,
        field: `armor.${location}`,
        category: 'error',
        message: `${location} armor (${allocation.front}) exceeds maximum (${allocation.maxArmor})`
      });
    }
    
    // Check for unarmored locations
    if (allocation.front === 0 && location !== 'head') {
      result.warnings.push({
        id: `unarmored-${location}`,
        field: `armor.${location}`,
        category: 'warning',
        message: `${location} has no armor`
      });
    }
  });
  
  // Head armor optimization
  const headArmor = armor.head?.front || 0;
  if (headArmor < 9) {
    result.suggestions.push({
      id: 'maximize-head-armor',
      category: 'armor',
      severity: 'minor',
      message: `Head armor is ${headArmor}/9. Consider maximizing for pilot protection.`,
      explanation: 'Maximum head armor protects against headshots'
    });
  }
}

/**
 * Validate equipment placement and compatibility
 */
function validateEquipmentPlacement(unit: EditableUnit, result: DetailedValidationResult, context: ValidationContext) {
  const equipmentPlacements = unit.equipmentPlacements || [];
  
  // Check for weapons
  const weapons = equipmentPlacements.filter(eq => isWeaponEquipment(eq.equipment));
  
  if (weapons.length === 0) {
    result.warnings.push({
      id: 'no-weapons',
      field: 'equipment',
      category: 'warning',
      message: 'Unit has no weapons'
    });
  } else {
    analyzeWeaponLoadout(weapons, result);
  }
  
  // Ammo safety analysis
  const ammoEquipment = equipmentPlacements.filter(eq =>
    eq.equipment.type === 'ammo' || eq.equipment.name.toLowerCase().includes('ammo')
  );
  
  ammoEquipment.forEach(ammo => {
    if (ammo.location === 'head' || ammo.location === 'center_torso') {
      result.warnings.push({
        id: `ammo-safety-${ammo.id}`,
        field: 'equipment',
        category: 'warning',
        message: `${ammo.equipment.name} in ${ammo.location} poses explosion risk`
      });
    }
  });
}

/**
 * Analyze weapon loadout for balance and effectiveness
 */
function analyzeWeaponLoadout(weapons: any[], result: DetailedValidationResult) {
  const rangeCategories = {
    short: weapons.filter(w => getWeaponMaxRange(w.equipment) <= 9),
    medium: weapons.filter(w => {
      const range = getWeaponMaxRange(w.equipment);
      return range > 9 && range <= 18;
    }),
    long: weapons.filter(w => getWeaponMaxRange(w.equipment) > 18)
  };
  
  // Range coverage analysis
  if (rangeCategories.short.length === 0 && rangeCategories.medium.length === 0) {
    result.suggestions.push({
      id: 'no-close-range-weapons',
      category: 'weapons',
      severity: 'major',
      message: 'No short or medium range weapons. Consider adding close-range capability.',
      explanation: 'Close-range weapons are essential for knife-fighting'
    });
  }
  
  if (rangeCategories.long.length === 0 && weapons.length > 3) {
    result.suggestions.push({
      id: 'no-long-range-weapons',
      category: 'weapons',
      severity: 'minor',
      message: 'No long-range weapons. Consider adding long-range capability.',
      explanation: 'Long-range weapons provide engagement flexibility'
    });
  }
}

/**
 * Calculate battle value and C-Bill cost
 */
function calculateBattleValueAndCost(unit: EditableUnit, result: DetailedValidationResult, context: ValidationContext) {
  // Basic BV calculation (simplified)
  let battleValue = unit.mass * 10; // Base value
  
  // Add weapon BV
  const weapons = unit.equipmentPlacements?.filter(eq => isWeaponEquipment(eq.equipment)) || [];
  
  weapons.forEach(weapon => {
    const weaponBV = weapon.equipment.data?.battle_value || weapon.equipment.data?.battlevalue || 0;
    battleValue += Number(weaponBV);
  });
  
  // Add equipment BV
  const otherEquipment = unit.equipmentPlacements?.filter(eq => !isWeaponEquipment(eq.equipment)) || [];
  
  otherEquipment.forEach(eq => {
    const equipmentBV = eq.equipment.data?.battle_value || eq.equipment.data?.battlevalue || 0;
    battleValue += Number(equipmentBV);
  });
  
  // Apply quirk modifiers
  const quirks = unit.selectedQuirks || [];
  quirks.forEach(quirk => {
    if (quirk.name.toLowerCase().includes('good reputation')) {
      battleValue *= 1.1;
    } else if (quirk.name.toLowerCase().includes('bad reputation')) {
      battleValue *= 0.9;
    }
  });
  
  result.battleValue = Math.round(battleValue);
  
  // Basic cost calculation (very simplified)
  let cost = unit.mass * 10000; // Base cost per ton
  
  // Add equipment costs
  unit.equipmentPlacements?.forEach(eq => {
    const equipmentCost = eq.equipment.cost || eq.equipment.data?.cost || 0;
    cost += Number(equipmentCost);
  });
  
  result.cost = Math.round(cost);
}

/**
 * Generate optimization suggestions
 */
function generateOptimizationSuggestions(unit: EditableUnit, result: DetailedValidationResult, context: ValidationContext) {
  // Tonnage efficiency estimation
  const usedTonnage = estimateUsedTonnage(unit);
  const remainingTonnage = unit.mass - usedTonnage;
  
  if (remainingTonnage > 1) {
    result.suggestions.push({
      id: 'unused-tonnage',
      category: 'structure',
      severity: 'major',
      message: `Approximately ${remainingTonnage.toFixed(1)} tons unused. Consider additional armor or equipment.`,
      explanation: 'Maximize unit potential with available tonnage'
    });
  }
  
  // Speed vs armor trade-off analysis
  const walkingMP = unit.data.movement?.walk_mp || 0;
  const totalArmor = Object.values(unit.armorAllocation || {}).reduce(
    (sum, alloc) => sum + alloc.front + (alloc.rear || 0), 0
  );
  
  if (walkingMP >= 6 && totalArmor < unit.mass * 2) {
    result.suggestions.push({
      id: 'speed-vs-armor',
      category: 'armor',
      severity: 'minor',
      message: 'Fast unit with light armor. Consider if speed compensates for protection.',
      explanation: 'Balance mobility and survivability based on intended role'
    });
  }
}

/**
 * Helper functions
 */
function isWeaponEquipment(equipment: FullEquipment): boolean {
  return equipment.type === 'weapon' || 
         Boolean(equipment.damage) ||
         Boolean(equipment.data?.damage);
}

function getWeaponMaxRange(weapon: FullEquipment): number {
  const range = safeGetWeaponRange(weapon);
  return range.long || range.medium || range.short || 0;
}

function estimateUsedTonnage(unit: EditableUnit): number {
  let usedTonnage = 0;
  
  // Engine weight
  const engineRating = unit.data.engine?.rating || 0;
  const engineType = unit.data.engine?.type || 'Standard';
  usedTonnage += calculateEngineWeight(engineRating, unit.mass, castToEngineType(engineType));
  
  // Structure weight
  const structureType = unit.data.structure?.type || 'Standard';
  usedTonnage += calculateStructureWeight(unit.mass, castToStructureType(structureType));
  
  // Equipment weight
  unit.equipmentPlacements?.forEach(eq => {
    const weight = eq.equipment.weight || eq.equipment.data?.tons || 0;
    usedTonnage += Number(weight);
  });
  
  // Armor weight
  const totalArmor = Object.values(unit.armorAllocation || {}).reduce(
    (sum, alloc) => sum + alloc.front + (alloc.rear || 0), 0
  );
  const armorType = unit.data.armor?.type || 'Standard';
  usedTonnage += calculateArmorWeight(totalArmor, castToArmorType(armorType));
  
  return usedTonnage;
}

/**
 * Quick validation for UI feedback
 */
export function quickValidation(unit: EditableUnit): { isValid: boolean; errorCount: number; warningCount: number } {
  const result = performAdvancedValidation(unit, { 
    strictMode: false, 
    eraRestrictions: false, 
    customRules: true, 
    experimentalTech: true, 
    skipCostValidation: true 
  });
  
  return {
    isValid: result.isValid,
    errorCount: result.criticalErrors.length,
    warningCount: result.warnings.length
  };
}
