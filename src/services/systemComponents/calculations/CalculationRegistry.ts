/**
 * Calculation Registry
 * 
 * Maps component IDs to their calculation specifications.
 * This is the bridge between component definitions and the calculation engine.
 */

/**
 * Component calculation specification
 */
export interface ComponentCalculationSpec {
  weight?: string  // References COMPONENT_CALCULATIONS key
  slots?: string | Record<string, string>  // Single value or per-location
  derived?: Record<string, string>  // Additional calculated properties
}

/**
 * Registry mapping component IDs to their calculations
 */
export const CALCULATION_REGISTRY: Record<string, ComponentCalculationSpec> = {
  // ===== ENGINES =====
  'standard_fusion': {
    weight: 'ENGINE_WEIGHT',
    slots: {
      'Center Torso': 'ENGINE_SLOTS_CT',
      'Left Torso': 'ENGINE_SLOTS_LT',
      'Right Torso': 'ENGINE_SLOTS_RT'
    },
    derived: {
      internalHeatSinks: 'ENGINE_INTERNAL_HEATSINKS',
      walkMP: 'WALK_MP',
      runMP: 'RUN_MP'
    }
  },
  
  'xl_fusion_is': {
    weight: 'ENGINE_WEIGHT',
    slots: {
      'Center Torso': 'ENGINE_SLOTS_CT',
      'Left Torso': 'ENGINE_SLOTS_LT',
      'Right Torso': 'ENGINE_SLOTS_RT'
    },
    derived: {
      internalHeatSinks: 'ENGINE_INTERNAL_HEATSINKS',
      walkMP: 'WALK_MP',
      runMP: 'RUN_MP'
    }
  },
  
  'xl_fusion_clan': {
    weight: 'ENGINE_WEIGHT',
    slots: {
      'Center Torso': 'ENGINE_SLOTS_CT',
      'Left Torso': 'ENGINE_SLOTS_LT',
      'Right Torso': 'ENGINE_SLOTS_RT'
    },
    derived: {
      internalHeatSinks: 'ENGINE_INTERNAL_HEATSINKS',
      walkMP: 'WALK_MP',
      runMP: 'RUN_MP'
    }
  },
  
  'light_fusion': {
    weight: 'ENGINE_WEIGHT',
    slots: {
      'Center Torso': 'ENGINE_SLOTS_CT',
      'Left Torso': 'ENGINE_SLOTS_LT',
      'Right Torso': 'ENGINE_SLOTS_RT'
    },
    derived: {
      internalHeatSinks: 'ENGINE_INTERNAL_HEATSINKS',
      walkMP: 'WALK_MP',
      runMP: 'RUN_MP'
    }
  },
  
  'xxl_fusion': {
    weight: 'ENGINE_WEIGHT',
    slots: {
      'Center Torso': 'ENGINE_SLOTS_CT',
      'Left Torso': 'ENGINE_SLOTS_LT',
      'Right Torso': 'ENGINE_SLOTS_RT'
    },
    derived: {
      internalHeatSinks: 'ENGINE_INTERNAL_HEATSINKS',
      walkMP: 'WALK_MP',
      runMP: 'RUN_MP'
    }
  },
  
  'compact_fusion': {
    weight: 'ENGINE_WEIGHT',
    slots: {
      'Center Torso': 'ENGINE_SLOTS_CT',
      'Left Torso': 'ENGINE_SLOTS_LT',
      'Right Torso': 'ENGINE_SLOTS_RT'
    },
    derived: {
      internalHeatSinks: 'ENGINE_INTERNAL_HEATSINKS',
      walkMP: 'WALK_MP',
      runMP: 'RUN_MP'
    }
  },
  
  'ice_engine': {
    weight: 'ENGINE_WEIGHT',
    slots: {
      'Center Torso': 'ENGINE_SLOTS_CT',
      'Left Torso': 'ENGINE_SLOTS_LT',
      'Right Torso': 'ENGINE_SLOTS_RT'
    },
    derived: {
      internalHeatSinks: 'ENGINE_INTERNAL_HEATSINKS',
      walkMP: 'WALK_MP',
      runMP: 'RUN_MP'
    }
  },
  
  'fuel_cell_engine': {
    weight: 'ENGINE_WEIGHT',
    slots: {
      'Center Torso': 'ENGINE_SLOTS_CT',
      'Left Torso': 'ENGINE_SLOTS_LT',
      'Right Torso': 'ENGINE_SLOTS_RT'
    },
    derived: {
      internalHeatSinks: 'ENGINE_INTERNAL_HEATSINKS',
      walkMP: 'WALK_MP',
      runMP: 'RUN_MP'
    }
  },

  // ===== GYROS =====
  'standard_gyro': {
    weight: 'GYRO_WEIGHT',
    slots: 'GYRO_SLOTS'
  },
  
  'compact_gyro': {
    weight: 'GYRO_WEIGHT',
    slots: 'GYRO_SLOTS'
  },
  
  'xl_gyro': {
    weight: 'GYRO_WEIGHT',
    slots: 'GYRO_SLOTS'
  },
  
  'heavy_duty_gyro': {
    weight: 'GYRO_WEIGHT',
    slots: 'GYRO_SLOTS'
  },

  // ===== STRUCTURE =====
  'standard_structure': {
    weight: 'STRUCTURE_WEIGHT',
    slots: 'STRUCTURE_SLOTS'
  },
  
  'endo_steel_is': {
    weight: 'STRUCTURE_WEIGHT',
    slots: 'STRUCTURE_SLOTS'
  },
  
  'endo_steel_clan': {
    weight: 'STRUCTURE_WEIGHT',
    slots: 'STRUCTURE_SLOTS'
  },
  
  'composite_structure': {
    weight: 'STRUCTURE_WEIGHT',
    slots: 'STRUCTURE_SLOTS'
  },
  
  'reinforced_structure': {
    weight: 'STRUCTURE_WEIGHT',
    slots: 'STRUCTURE_SLOTS'
  },
  
  'industrial_structure': {
    weight: 'STRUCTURE_WEIGHT',
    slots: 'STRUCTURE_SLOTS'
  },

  // ===== ARMOR =====
  'standard_armor': {
    weight: 'ARMOR_WEIGHT',
    slots: 'ARMOR_SLOTS'
  },
  
  'ferro_fibrous_is': {
    weight: 'ARMOR_WEIGHT',
    slots: 'ARMOR_SLOTS'
  },
  
  'ferro_fibrous_clan': {
    weight: 'ARMOR_WEIGHT',
    slots: 'ARMOR_SLOTS'
  },
  
  'light_ferro_fibrous': {
    weight: 'ARMOR_WEIGHT',
    slots: 'ARMOR_SLOTS'
  },
  
  'heavy_ferro_fibrous': {
    weight: 'ARMOR_WEIGHT',
    slots: 'ARMOR_SLOTS'
  },
  
  'stealth_armor': {
    weight: 'ARMOR_WEIGHT',
    slots: 'ARMOR_SLOTS'
  },
  
  'reactive_armor': {
    weight: 'ARMOR_WEIGHT',
    slots: 'ARMOR_SLOTS'
  },
  
  'reflective_armor': {
    weight: 'ARMOR_WEIGHT',
    slots: 'ARMOR_SLOTS'
  },
  
  'hardened_armor': {
    weight: 'ARMOR_WEIGHT',
    slots: 'ARMOR_SLOTS'
  },

  // ===== HEAT SINKS =====
  'single_heat_sink': {
    weight: 'HEATSINK_WEIGHT',
    slots: 'HEATSINK_SLOTS',
    derived: {
      dissipation: 'HEATSINK_DISSIPATION'
    }
  },
  
  'double_heat_sink': {
    weight: 'HEATSINK_WEIGHT',
    slots: 'HEATSINK_SLOTS',
    derived: {
      dissipation: 'HEATSINK_DISSIPATION'
    }
  },

  // ===== JUMP JETS =====
  'standard_jump_jet': {
    weight: 'JUMPJET_WEIGHT_PER_JET',
    slots: 'JUMPJET_SLOTS'
  },
  
  'improved_jump_jet': {
    weight: 'JUMPJET_WEIGHT_PER_JET',
    slots: 'JUMPJET_SLOTS'
  }
}

/**
 * Get calculation spec for a component
 */
export function getComponentCalculationSpec(componentId: string): ComponentCalculationSpec | undefined {
  return CALCULATION_REGISTRY[componentId]
}

/**
 * Check if a component has calculations registered
 */
export function hasComponentCalculationSpec(componentId: string): boolean {
  return componentId in CALCULATION_REGISTRY
}

/**
 * Get all registered component IDs
 */
export function getAllRegisteredComponentIds(): string[] {
  return Object.keys(CALCULATION_REGISTRY)
}






