/**
 * Component Placement System
 * Defines how components are placed in BattleMech critical slots
 * Handles static placement, dynamic placement, and location restrictions
 */

export type MechLocation = 
  | 'Head'
  | 'Center Torso'
  | 'Left Torso' 
  | 'Right Torso'
  | 'Left Arm'
  | 'Right Arm'
  | 'Left Leg'
  | 'Right Leg'

export type PlacementType = 'static' | 'dynamic' | 'restricted'

/**
 * Base interface for all component placement configurations
 */
export interface ComponentPlacement {
  placementType: PlacementType
  totalSlots: number
}

/**
 * Static placement - components that always occupy specific slots
 * Examples: Engine, Gyro, Cockpit, Actuators
 */
export interface StaticPlacement extends ComponentPlacement {
  placementType: 'static'
  fixedSlots: {
    [key in MechLocation]?: number[]
  }
}

/**
 * Dynamic placement - components that can be placed anywhere
 * Examples: Endo Steel, Ferro-Fibrous Armor, CASE II
 */
export interface DynamicPlacement extends ComponentPlacement {
  placementType: 'dynamic'
  // No additional restrictions - can be placed in any location
}

/**
 * Location-restricted placement - components that can be placed in specific locations
 * Examples: Jump Jets, CASE, Superchargers
 */
export interface RestrictedPlacement extends ComponentPlacement {
  placementType: 'restricted'
  allowedLocations: MechLocation[]
  // Special validation rules for specific components
  validationRules?: {
    requiresEngineSlots?: boolean // For superchargers
    maxPerLocation?: number // Maximum slots per location
  }
}

/**
 * Union type for all placement configurations
 */
export type PlacementConfiguration = 
  | StaticPlacement 
  | DynamicPlacement 
  | RestrictedPlacement

/**
 * Validation context for component placement
 */
export interface PlacementValidationContext {
  engineType?: string
  engineSlots?: {
    centerTorso: number[]
    leftTorso: number[]
    rightTorso: number[]
  }
  availableSlots: {
    [key in MechLocation]: number
  }
  unitType: 'BattleMech' | 'IndustrialMech' | 'ProtoMech' | 'BattleArmor'
}

/**
 * Result of placement validation
 */
export interface PlacementValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  suggestedPlacements?: {
    [key in MechLocation]: number
  }
}

/**
 * Component placement service interface
 */
export interface ComponentPlacementService {
  /**
   * Validate if a component can be placed according to its placement rules
   */
  validatePlacement(
    component: ComponentPlacement,
    context: PlacementValidationContext
  ): PlacementValidationResult

  /**
   * Get valid placement options for a component
   */
  getValidPlacements(
    component: ComponentPlacement,
    context: PlacementValidationContext
  ): MechLocation[]

  /**
   * Calculate total slots required by a component
   */
  getTotalSlots(component: ComponentPlacement): number

  /**
   * Check if a specific placement is valid
   */
  isValidPlacement(
    component: ComponentPlacement,
    location: MechLocation,
    context: PlacementValidationContext
  ): boolean
}

/**
 * Predefined placement configurations for common components
 */
export const COMPONENT_PLACEMENTS = {
  // Static Components
  ENGINE: {
    standard: {
      placementType: 'static' as const,
      totalSlots: 6,
      fixedSlots: {
        'Center Torso': [0, 1, 2, 3, 4, 5]
      }
    },
    xl: {
      placementType: 'static' as const,
      totalSlots: 12,
      fixedSlots: {
        'Center Torso': [0, 1, 2, 3, 4, 5],
        'Left Torso': [0, 1, 2],
        'Right Torso': [0, 1, 2]
      }
    }
  },

  GYRO: {
    standard: {
      placementType: 'static' as const,
      totalSlots: 4,
      fixedSlots: {
        'Center Torso': [3, 4, 5, 6]
      }
    }
  },

  // Dynamic Components
  ENDO_STEEL: {
    innerSphere: {
      placementType: 'dynamic' as const,
      totalSlots: 14
    },
    clan: {
      placementType: 'dynamic' as const,
      totalSlots: 7
    }
  },

  FERRO_FIBROUS: {
    innerSphere: {
      placementType: 'dynamic' as const,
      totalSlots: 14
    },
    clan: {
      placementType: 'dynamic' as const,
      totalSlots: 7
    }
  },

  CASE_II: {
    placementType: 'dynamic' as const,
    totalSlots: 1
  },

  // Restricted Components
  JUMP_JETS: {
    placementType: 'restricted' as const,
    totalSlots: 1,
    allowedLocations: ['Left Leg', 'Right Leg', 'Left Torso', 'Right Torso', 'Center Torso']
  },

  CASE: {
    placementType: 'restricted' as const,
    totalSlots: 1,
    allowedLocations: ['Left Torso', 'Right Torso', 'Center Torso']
  },

  SUPERCHARGER: {
    placementType: 'restricted' as const,
    totalSlots: 1,
    allowedLocations: ['Center Torso', 'Left Torso', 'Right Torso'],
    validationRules: {
      requiresEngineSlots: true
    }
  },

  PARTIAL_WING: {
    placementType: 'restricted' as const,
    totalSlots: 6, // 3 per torso in most implementations; adjust as needed elsewhere
    allowedLocations: ['Left Torso', 'Right Torso']
  },

  TORSO_ELECTRONICS: {
    placementType: 'restricted' as const,
    totalSlots: 1,
    allowedLocations: ['Center Torso', 'Left Torso', 'Right Torso']
  }
} as const 