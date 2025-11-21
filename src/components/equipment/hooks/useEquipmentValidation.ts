import { useState, useCallback, useMemo } from 'react';
import { FullEquipment } from '../../../types';
import { EditableUnit } from '../../../types/editor';

export interface CompatibilityIssue {
  type: 'error' | 'warning';
  message: string;
  equipment?: string;
  reason: 'tech_base' | 'era' | 'weight' | 'space' | 'heat' | 'quirk' | 'special';
}

export interface ValidationOptions {
  strictTechBase: boolean;
  checkEraAvailability: boolean;
  validateWeight: boolean;
  validateHeat: boolean;
  checkQuirkCompatibility: boolean;
  allowMixedTech: boolean;
}

export interface EquipmentValidationResult {
  isValid: boolean;
  issues: CompatibilityIssue[];
  canAdd: boolean;
  suggestions?: string[];
}

export interface UseEquipmentValidationReturn {
  validateEquipment: (equipment: FullEquipment, unit: EditableUnit) => EquipmentValidationResult;
  validateLoadout: (unit: EditableUnit) => EquipmentValidationResult;
  checkCompatibility: (equipment1: FullEquipment, equipment2: FullEquipment) => boolean;
  getValidationIssues: (unit: EditableUnit) => CompatibilityIssue[];
  validationOptions: ValidationOptions;
  setValidationOptions: (options: Partial<ValidationOptions>) => void;
}

const DEFAULT_OPTIONS: ValidationOptions = {
  strictTechBase: true,
  checkEraAvailability: true,
  validateWeight: true,
  validateHeat: true,
  checkQuirkCompatibility: true,
  allowMixedTech: false,
};

// Equipment that requires specific other equipment
const EQUIPMENT_DEPENDENCIES: Record<string, string[]> = {
  'Stealth Armor': ['Guardian ECM', 'Double Heat Sink'],
  'Light Fusion Engine': ['Double Heat Sink'],
  'XXL Engine': ['Double Heat Sink'],
  'Targeting Computer': ['Direct Fire Weapon'],
  'C3 Slave': ['C3 Master'],
  'TAG': ['Arrow IV', 'Semi-Guided LRM'],
};

// Equipment that conflicts with other equipment
const EQUIPMENT_CONFLICTS: Record<string, string[]> = {
  'Guardian ECM': ['Beagle Active Probe'],
  'C3 Master': ['C3 Slave'],
  'MASC': ['Triple Strength Myomer'],
  'Stealth Armor': ['Null Signature System'],
};

export function useEquipmentValidation(): UseEquipmentValidationReturn {
  const [validationOptions, setOptions] = useState<ValidationOptions>(DEFAULT_OPTIONS);

  const setValidationOptions = useCallback((options: Partial<ValidationOptions>) => {
    setOptions(prev => ({
      ...prev,
      ...options,
    }));
  }, []);

  // Get total weight of equipment
  const getTotalEquipmentWeight = useCallback((unit: EditableUnit): number => {
    return unit.equipmentPlacements.reduce((total, placement) => {
      return total + (placement.equipment.weight || 0);
    }, 0);
  }, []);

  // Get total heat generation
  const getTotalHeatGeneration = useCallback((unit: EditableUnit): number => {
    return unit.equipmentPlacements.reduce((total, placement) => {
      return total + (placement.equipment.heat || 0);
    }, 0);
  }, []);

  // Get heat dissipation capacity
  const getHeatDissipation = useCallback((unit: EditableUnit): number => {
    const baseHeatSinks = unit.data?.heat_sinks?.count || 10;
    const heatSinkType = unit.data?.heat_sinks?.type || 'Single';
    const dissipationPerSink = heatSinkType === 'Double' ? 2 : 1;
    
    // Add additional heat sinks from equipment
    const additionalHeatSinks = unit.equipmentPlacements.filter(
      p => p.equipment.name.includes('Heat Sink')
    ).length;
    
    return (baseHeatSinks + additionalHeatSinks) * dissipationPerSink;
  }, []);

  // Check if equipment has required dependencies
  const checkDependencies = useCallback((
    equipment: FullEquipment,
    unit: EditableUnit
  ): { valid: boolean; missing: string[] } => {
    const dependencies = EQUIPMENT_DEPENDENCIES[equipment.name] || [];
    const existingEquipment = unit.equipmentPlacements.map(p => p.equipment.name);
    
    const missing = dependencies.filter(dep => !existingEquipment.includes(dep));
    
    return {
      valid: missing.length === 0,
      missing,
    };
  }, []);

  // Check for equipment conflicts
  const checkConflicts = useCallback((
    equipment: FullEquipment,
    unit: EditableUnit
  ): { valid: boolean; conflicts: string[] } => {
    const conflictsWith = EQUIPMENT_CONFLICTS[equipment.name] || [];
    const existingEquipment = unit.equipmentPlacements.map(p => p.equipment.name);
    
    const conflicts = conflictsWith.filter(conflict => existingEquipment.includes(conflict));
    
    return {
      valid: conflicts.length === 0,
      conflicts,
    };
  }, []);

  // Check tech base compatibility
  const checkTechBaseCompatibility = useCallback((
    equipment: FullEquipment,
    unit: EditableUnit
  ): boolean => {
    if (!validationOptions.strictTechBase || validationOptions.allowMixedTech) {
      return true;
    }
    
    const unitTechBase = unit.tech_base;
    const equipmentTechBase = equipment.tech_base;
    
    if (!equipmentTechBase || !unitTechBase) return true;
    
    // Check if tech bases are compatible
    if (unitTechBase === 'Mixed (IS Chassis)' || unitTechBase === 'Mixed (Clan Chassis)') {
      return true; // Mixed tech units can use any equipment
    }
    
    if (unitTechBase === 'Inner Sphere' && equipmentTechBase === 'Clan') {
      return false;
    }
    
    if (unitTechBase === 'Clan' && equipmentTechBase === 'Inner Sphere') {
      return false;
    }
    
    return true;
  }, [validationOptions]);

  // Check quirk compatibility
  const checkQuirkCompatibility = useCallback((
    equipment: FullEquipment,
    unit: EditableUnit
  ): { valid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    // Check positive quirks
    unit.selectedQuirks?.forEach(quirk => {
      // Example quirk checks
      if (quirk.name === 'Anti-Aircraft Targeting' && equipment.type === 'Ballistic Weapon') {
        // AA targeting improves ballistic weapons - no issue
      }
      
      if (quirk.name === 'Improved Communications' && equipment.name === 'ECM') {
        issues.push('ECM interferes with Improved Communications quirk');
      }
    });
    
    return {
      valid: issues.length === 0,
      issues,
    };
  }, []);

  // Validate individual equipment
  const validateEquipment = useCallback((
    equipment: FullEquipment,
    unit: EditableUnit
  ): EquipmentValidationResult => {
    const issues: CompatibilityIssue[] = [];
    const suggestions: string[] = [];
    
    // Tech base check
    if (validationOptions.strictTechBase && !checkTechBaseCompatibility(equipment, unit)) {
      issues.push({
        type: 'error',
        message: `${equipment.name} tech base (${equipment.tech_base}) incompatible with unit (${unit.tech_base})`,
        equipment: equipment.name,
        reason: 'tech_base',
      });
    }
    
    // Weight check
    if (validationOptions.validateWeight) {
      const currentWeight = getTotalEquipmentWeight(unit);
      const availableWeight = unit.mass - currentWeight;
      
      if (equipment.weight && equipment.weight > availableWeight) {
        issues.push({
          type: 'error',
          message: `${equipment.name} weighs ${equipment.weight}t but only ${availableWeight.toFixed(1)}t available`,
          equipment: equipment.name,
          reason: 'weight',
        });
      }
    }
    
    // Heat check for weapons
    if (validationOptions.validateHeat && equipment.heat) {
      const currentHeat = getTotalHeatGeneration(unit);
      const heatCapacity = getHeatDissipation(unit);
      const newHeat = currentHeat + equipment.heat;
      
      if (newHeat > heatCapacity) {
        const heatDeficit = newHeat - heatCapacity;
        issues.push({
          type: 'warning',
          message: `Adding ${equipment.name} would exceed heat capacity by ${heatDeficit}`,
          equipment: equipment.name,
          reason: 'heat',
        });
        suggestions.push(`Consider adding ${Math.ceil(heatDeficit)} more heat sinks`);
      }
    }
    
    // Dependency check
    const { valid: depsValid, missing } = checkDependencies(equipment, unit);
    if (!depsValid) {
      issues.push({
        type: 'error',
        message: `${equipment.name} requires: ${missing.join(', ')}`,
        equipment: equipment.name,
        reason: 'special',
      });
    }
    
    // Conflict check
    const { valid: conflictsValid, conflicts } = checkConflicts(equipment, unit);
    if (!conflictsValid) {
      issues.push({
        type: 'error',
        message: `${equipment.name} conflicts with: ${conflicts.join(', ')}`,
        equipment: equipment.name,
        reason: 'special',
      });
    }
    
    // Quirk compatibility
    if (validationOptions.checkQuirkCompatibility) {
      const { valid: quirkValid, issues: quirkIssues } = checkQuirkCompatibility(equipment, unit);
      if (!quirkValid) {
        quirkIssues.forEach(issue => {
          issues.push({
            type: 'warning',
            message: issue,
            equipment: equipment.name,
            reason: 'quirk',
          });
        });
      }
    }
    
    const hasErrors = issues.some(issue => issue.type === 'error');
    
    return {
      isValid: issues.length === 0,
      issues,
      canAdd: !hasErrors,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }, [
    validationOptions,
    checkTechBaseCompatibility,
    getTotalEquipmentWeight,
    getTotalHeatGeneration,
    getHeatDissipation,
    checkDependencies,
    checkConflicts,
    checkQuirkCompatibility,
  ]);

  // Validate entire loadout
  const validateLoadout = useCallback((unit: EditableUnit): EquipmentValidationResult => {
    const issues: CompatibilityIssue[] = [];
    const suggestions: string[] = [];
    
    // Check total weight
    if (validationOptions.validateWeight) {
      const totalWeight = getTotalEquipmentWeight(unit);
      if (totalWeight > unit.mass) {
        issues.push({
          type: 'error',
          message: `Equipment weight (${totalWeight}t) exceeds unit tonnage (${unit.mass}t)`,
          reason: 'weight',
        });
      }
    }
    
    // Check heat efficiency
    if (validationOptions.validateHeat) {
      const totalHeat = getTotalHeatGeneration(unit);
      const heatCapacity = getHeatDissipation(unit);
      
      if (totalHeat > heatCapacity) {
        const efficiency = (heatCapacity / totalHeat * 100).toFixed(0);
        issues.push({
          type: 'warning',
          message: `Heat efficiency at ${efficiency}% (${totalHeat} heat vs ${heatCapacity} dissipation)`,
          reason: 'heat',
        });
        
        const neededSinks = Math.ceil(totalHeat - heatCapacity);
        suggestions.push(`Add ${neededSinks} more heat sinks for neutral heat`);
      }
    }
    
    // Check for orphaned dependencies
    unit.equipmentPlacements.forEach(placement => {
      const { valid, missing } = checkDependencies(placement.equipment, unit);
      if (!valid) {
        issues.push({
          type: 'error',
          message: `${placement.equipment.name} missing required: ${missing.join(', ')}`,
          equipment: placement.equipment.name,
          reason: 'special',
        });
      }
    });
    
    // Check for mutual conflicts
    const equipmentNames = unit.equipmentPlacements.map(p => p.equipment.name);
    equipmentNames.forEach((name, index) => {
      const conflicts = EQUIPMENT_CONFLICTS[name] || [];
      conflicts.forEach(conflict => {
        if (equipmentNames.includes(conflict) && equipmentNames.indexOf(conflict) > index) {
          issues.push({
            type: 'error',
            message: `${name} conflicts with ${conflict}`,
            reason: 'special',
          });
        }
      });
    });
    
    const hasErrors = issues.some(issue => issue.type === 'error');
    
    return {
      isValid: issues.length === 0,
      issues,
      canAdd: !hasErrors,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }, [
    validationOptions,
    getTotalEquipmentWeight,
    getTotalHeatGeneration,
    getHeatDissipation,
    checkDependencies,
  ]);

  // Check compatibility between two pieces of equipment
  const checkCompatibility = useCallback((
    equipment1: FullEquipment,
    equipment2: FullEquipment
  ): boolean => {
    // Check if they conflict with each other
    const conflicts1 = EQUIPMENT_CONFLICTS[equipment1.name] || [];
    const conflicts2 = EQUIPMENT_CONFLICTS[equipment2.name] || [];
    
    if (conflicts1.includes(equipment2.name) || conflicts2.includes(equipment1.name)) {
      return false;
    }
    
    // Check tech base compatibility
    if (validationOptions.strictTechBase && !validationOptions.allowMixedTech) {
      if (equipment1.tech_base && equipment2.tech_base) {
        if (equipment1.tech_base !== equipment2.tech_base) {
          return false;
        }
      }
    }
    
    return true;
  }, [validationOptions]);

  // Get all validation issues for a unit
  const getValidationIssues = useCallback((unit: EditableUnit): CompatibilityIssue[] => {
    const result = validateLoadout(unit);
    return result.issues;
  }, [validateLoadout]);

  return {
    validateEquipment,
    validateLoadout,
    checkCompatibility,
    getValidationIssues,
    validationOptions,
    setValidationOptions,
  };
}
