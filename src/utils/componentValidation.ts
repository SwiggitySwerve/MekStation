/**
 * Component Validation & Migration Utilities
 * Handles validation, error recovery, and data migration for system components
 */

import { EditableUnit } from '../types/editor';
import {
  ENGINE_CRITICAL_SLOTS as ENGINE_SLOT_REQUIREMENTS,
  GYRO_CRITICAL_SLOTS as GYRO_SLOT_REQUIREMENTS,
  STRUCTURE_CRITICAL_SLOTS as STRUCTURE_SLOT_REQUIREMENTS,
  ARMOR_CRITICAL_SLOTS as ARMOR_SLOT_REQUIREMENTS,
  calculateEngineWeight,
  calculateStructureWeight,
  calculateGyroWeight,
} from '../constants/BattleTechConstructionRules';
import { calculateArmorWeight } from './armorCalculations';
import { COCKPIT_SLOT_REQUIREMENTS } from './cockpitCalculations';
import { initializeSystemComponents } from './componentSync';
import { initializeCriticalSlots, validateComponentPlacement, generateHeatSinkItems } from './componentRules';

// Local legacy interface to avoid importing from deprecated file
interface LegacySystemComponents {
  engine: { rating: number; type: string };
  gyro: { type: string };
  structure: { type: string };
  armor: { type: string };
  heatSinks: { total: number; externalRequired: number; type: string };
}

// Validation error types
export interface ComponentValidationError {
  id: string;
  category: 'error' | 'warning';
  component: string;
  message: string;
  field?: string;
}

/**
 * Validate system components configuration
 */
export function validateSystemComponents(
  unit: EditableUnit
): ComponentValidationError[] {
  const errors: ComponentValidationError[] = [];
  
  if (!unit.systemComponents) {
    errors.push({
      id: 'no-system-components',
      category: 'error',
      component: 'system',
      message: 'No system components defined',
    });
    return errors;
  }
  
  const components = unit.systemComponents as unknown as LegacySystemComponents;
  const mass = unit.mass;
  
  // Validate engine
  if (components.engine) {
    // Check engine rating limits
    const maxRating = mass * 4;
    const minRating = mass; // Minimum for walking speed 1
    
    if (components.engine.rating > maxRating) {
      errors.push({
        id: 'engine-rating-too-high',
        category: 'error',
        component: 'engine',
        message: `Engine rating ${components.engine.rating} exceeds maximum ${maxRating} for ${mass}-ton mech`,
        field: 'rating',
      });
    }
    
    if (components.engine.rating < minRating) {
      errors.push({
        id: 'engine-rating-too-low',
        category: 'error',
        component: 'engine',
        message: `Engine rating ${components.engine.rating} below minimum ${minRating} for ${mass}-ton mech`,
        field: 'rating',
      });
    }
    
    // Check engine weight
    const engineWeight = calculateEngineWeight(components.engine.rating, components.engine.type);
    if (engineWeight > mass * 0.75) {
      errors.push({
        id: 'engine-too-heavy',
        category: 'warning',
        component: 'engine',
        message: `Engine weight ${engineWeight} tons is more than 75% of mech tonnage`,
      });
    }
  }
  
  // Validate gyro
  if (components.gyro && components.engine) {
    const gyroWeight = calculateGyroWeight(components.engine.rating, components.gyro.type);
    
    // XL Gyro restrictions
    if (components.gyro.type === 'XL' && components.engine.type === 'XXL') {
      errors.push({
        id: 'gyro-engine-incompatible',
        category: 'error',
        component: 'gyro',
        message: 'XL Gyro cannot be used with XXL Engine',
      });
    }
  }
  
  // Validate structure
  if (components.structure) {
    const structureWeight = calculateStructureWeight(mass, components.structure.type);
    
    // Check for valid structure types
    if (components.structure.type === 'Composite' && mass > 40) {
      errors.push({
        id: 'composite-structure-limit',
        category: 'error',
        component: 'structure',
        message: 'Composite structure only available for mechs 40 tons or less',
      });
    }
  }
  
  // Validate heat sinks
  if (components.heatSinks) {
    if (components.heatSinks.total < 10) {
      errors.push({
        id: 'insufficient-heat-sinks',
        category: 'error',
        component: 'heatSinks',
        message: 'Minimum 10 total heat sinks required', // This is minimum TOTAL heat sinks for the mech
        field: 'total',
      });
    }
    
    if (components.heatSinks.externalRequired < 0) {
      errors.push({
        id: 'negative-external-heat-sinks',
        category: 'error',
        component: 'heatSinks',
        message: 'External heat sink calculation error',
      });
    }
  }
  
  return errors;
}

/**
 * Validate critical slot allocations
 */
export function validateCriticalAllocations(
  unit: EditableUnit
): ComponentValidationError[] {
  const errors: ComponentValidationError[] = [];
  
  if (!unit.criticalAllocations || !unit.systemComponents) {
    return errors;
  }
  
  // Validate component placement
  const placementResult = validateComponentPlacement(
    unit.criticalAllocations,
    unit.systemComponents
  );
  
  if (!placementResult.valid) {
    placementResult.errors.forEach((error, index) => {
      errors.push({
        id: `placement-error-${index}`,
        category: 'error',
        component: 'criticals',
        message: error,
      });
    });
  }
  
  // Check for orphaned equipment
  const equipment = unit.data?.weapons_and_equipment || [];
  const allocations = unit.criticalAllocations; // We already checked this is defined
  
  equipment.forEach(eq => {
    if (eq.location) {
      const locationSlots = allocations[eq.location];
      if (!locationSlots) {
        errors.push({
          id: `orphaned-equipment-${eq.item_name}`,
          category: 'warning',
          component: 'equipment',
          message: `${eq.item_name} assigned to invalid location ${eq.location}`,
        });
      } else {
        // Check if equipment is actually in the slots
        const foundInSlots = locationSlots.some(slot => 
          slot.name === eq.item_name
        );
        
        if (!foundInSlots) {
          errors.push({
            id: `misplaced-equipment-${eq.item_name}`,
            category: 'warning',
            component: 'equipment',
            message: `${eq.item_name} not found in assigned location ${eq.location}`,
          });
        }
      }
    }
  });
  
  return errors;
}

/**
 * Migrate unit data to new system components format
 */
export function migrateUnitToSystemComponents(
  unit: EditableUnit
): EditableUnit {
  // Already has system components
  if (unit.systemComponents && unit.criticalAllocations) {
    return unit;
  }
  
  // Initialize system components from existing data
  const systemComponents = initializeSystemComponents(unit);
  
  // Initialize critical allocations
  const criticalAllocations = initializeCriticalSlots(
    systemComponents,
    unit.mass
  );
  
  // Migrate existing critical slots data
  if (unit.data?.criticals) {
    unit.data.criticals.forEach(location => {
      const locationSlots = criticalAllocations[location.location];
      if (!locationSlots) return;
      
      // Copy over non-system equipment
      location.slots.forEach((slotContent, index) => {
        if (typeof slotContent === 'string' && 
            slotContent && 
            slotContent !== '-Empty-' && 
            slotContent !== '- Empty -' && 
            locationSlots[index] && 
            locationSlots[index].type === 'empty') {
          // This is equipment that should be preserved
          locationSlots[index] = {
            ...locationSlots[index],
            name: slotContent,
            type: 'equipment',
            isManuallyPlaced: true,
          };
        } else if (typeof slotContent === 'object' && slotContent) {
          // Handle object-based slots
          if (locationSlots[index]) {
            locationSlots[index] = {
              ...locationSlots[index],
              name: slotContent.name || '-Empty-',
              type: slotContent.type || 'equipment',
              isFixed: slotContent.isFixed || false,
              isManuallyPlaced: slotContent.isManuallyPlaced !== undefined ? slotContent.isManuallyPlaced : true
            };
          }
        }
      });
    });
  }
  
  // Also check if unit already has criticalAllocations with "-Empty-" strings
  if (unit.criticalAllocations) {
    Object.entries(unit.criticalAllocations).forEach(([location, slots]) => {
      const locationSlots = criticalAllocations[location];
      if (!locationSlots) return;
      
      // Type-safe array iteration
      const slotsArray = Array.isArray(slots) ? slots : [];
      slotsArray.forEach((slot, index) => {
                            if (locationSlots[index]) {
            // Handle both old and new formats with type-safe property access
            const slotRecord = slot as Record<string, unknown>;
            const slotName = String(slotRecord.name || slotRecord.content || '-Empty-');
            
            // Convert empty indicators to standard format
            if (slotName === '-Empty-' || slotName === '- Empty -' || slotName === '' || slotName === 'null') {
              locationSlots[index].name = '-Empty-';
              locationSlots[index].type = 'empty';
            } else if (slotName && locationSlots[index].type === 'empty') {
              // Preserve non-empty content - use safe defaults
              locationSlots[index] = {
                ...locationSlots[index],
                name: slotName,
                type: 'equipment', // Safe default type
                isFixed: Boolean(slotRecord.isFixed) || false,
                isManuallyPlaced: slotRecord.isManuallyPlaced !== undefined ? Boolean(slotRecord.isManuallyPlaced) : true
              };
            }
          }
      });
    });
  }
  
  // Generate external heat sink items if needed
  let weapons_and_equipment = unit.data?.weapons_and_equipment || [];
  if (systemComponents.heatSinks.externalRequired > 0) {
    const heatSinkItems = generateHeatSinkItems(
      systemComponents.heatSinks.type,
      systemComponents.heatSinks.total,
      systemComponents.engine.rating
    );
    
    // Add heat sink items as unallocated equipment
    weapons_and_equipment = [
      ...weapons_and_equipment,
      ...heatSinkItems.map((hs: { name: string; type: string; slots: number; weight: number }) => ({
        item_name: hs.name,
        item_type: 'equipment' as const,
        location: '', // Unallocated
        tech_base: unit.tech_base as 'IS' | 'Clan',
      })),
    ];
  }
  
  return {
    ...unit,
    systemComponents,
    criticalAllocations,
    data: {
      ...unit.data,
      weapons_and_equipment,
    },
  };
}

/**
 * Validate entire unit configuration
 */
export function validateUnit(unit: EditableUnit): {
  valid: boolean;
  errors: ComponentValidationError[];
} {
  const errors: ComponentValidationError[] = [];
  
  // IMPORTANT: Don't migrate during validation - just validate what we have
  // Migration should only happen explicitly, not as a side effect
  const unitToValidate = unit.systemComponents && unit.criticalAllocations ? unit : migrateUnitToSystemComponents(unit);
  
  // Validate system components
  errors.push(...validateSystemComponents(unitToValidate));
  
  // Validate critical allocations
  errors.push(...validateCriticalAllocations(unitToValidate));
  
  // Validate weight limits
  const totalWeight = calculateTotalWeight(unitToValidate);
  if (totalWeight > unit.mass) {
    errors.push({
      id: 'overweight',
      category: 'error',
      component: 'weight',
      message: `Total weight ${totalWeight.toFixed(1)} tons exceeds ${unit.mass} ton limit`,
    });
  }
  
  return {
    valid: errors.filter(e => e.category === 'error').length === 0,
    errors,
  };
}

/**
 * Calculate total weight of all components
 */
export function calculateTotalWeight(unit: EditableUnit): number {
  let weight = 0;
  
  if (!unit.systemComponents) {
    return weight;
  }
  
  const components = unit.systemComponents;
  
  // Engine weight
  if (components.engine) {
    weight += calculateEngineWeight(components.engine.rating, components.engine.type);
  }
  
  // Gyro weight
  if (components.gyro && components.engine) {
    weight += calculateGyroWeight(components.engine.rating, components.gyro.type);
  }
  
  // Structure weight
  if (components.structure) {
    weight += calculateStructureWeight(unit.mass, components.structure.type);
  }
  
  // Cockpit weight (standard is 3 tons)
  weight += 3;
  
  // Armor weight
  if (components.armor && unit.armorAllocation) {
    const totalArmorPoints = Object.values(unit.armorAllocation).reduce(
      (sum, location) => sum + location.front + (location.rear || 0),
      0
    );
    weight += calculateArmorWeight(totalArmorPoints, components.armor.type);
  }
  
  // Heat sinks (external only, integrated are part of engine)
  if (components.heatSinks) {
    weight += components.heatSinks.externalRequired;
  }
  
  // Equipment weight
  const equipment = unit.data?.weapons_and_equipment || [];
  equipment.forEach(eq => {
    // Find equipment in database to get weight
    // This would need to be implemented based on your equipment database
    // For now, assume weight is stored somewhere
    weight += 1; // Placeholder
  });
  
  return weight;
}

/**
 * Auto-fix common validation errors
 */
export function autoFixValidationErrors(
  unit: EditableUnit,
  errors: ComponentValidationError[]
): EditableUnit {
  let fixedUnit = { ...unit };
  
  errors.forEach(error => {
    switch (error.id) {
      case 'no-system-components':
        // Migrate to system components
        fixedUnit = migrateUnitToSystemComponents(fixedUnit);
        break;
        
      case 'insufficient-heat-sinks':
        // Set minimum heat sinks
        if (fixedUnit.systemComponents?.heatSinks) {
          fixedUnit.systemComponents.heatSinks.total = 10;
        }
        break;
        
      case 'negative-external-heat-sinks':
        // Recalculate external heat sinks
        if (fixedUnit.systemComponents?.heatSinks && fixedUnit.systemComponents.engine) {
          const integrated = Math.min(10, Math.floor(fixedUnit.systemComponents.engine.rating / 25));
          fixedUnit.systemComponents.heatSinks.externalRequired = 
            Math.max(0, fixedUnit.systemComponents.heatSinks.total - integrated);
        }
        break;
    }
  });
  
  return fixedUnit;
}

/**
 * Check if unit data needs migration
 */
export function needsMigration(unit: EditableUnit): boolean {
  return !unit.systemComponents || !unit.criticalAllocations;
}

/**
 * Get migration status and recommendations
 */
export function getMigrationStatus(unit: EditableUnit): {
  needsMigration: boolean;
  hasLegacyData: boolean;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  
  const hasSystemComponents = !!unit.systemComponents;
  const hasCriticalAllocations = !!unit.criticalAllocations;
  const hasLegacyData = !!unit.data?.criticals;
  
  if (!hasSystemComponents) {
    recommendations.push('Migrate to system components for better engine/gyro management');
  }
  
  if (!hasCriticalAllocations) {
    recommendations.push('Migrate to critical allocations for improved slot tracking');
  }
  
  if (hasLegacyData && (!hasSystemComponents || !hasCriticalAllocations)) {
    recommendations.push('Legacy critical slot data can be migrated automatically');
  }
  
  return {
    needsMigration: !hasSystemComponents || !hasCriticalAllocations,
    hasLegacyData,
    recommendations,
  };
}
