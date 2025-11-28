/**
 * Canonical component placement contracts used by the editor services.
 * Centralizing these types keeps the slot validation logic aligned with the
 * BattleTech TechManual rules for engines, structure, armor, and electronics.
 */

import type { MechLocation } from './Editor';

export type PlacementType = 'static' | 'dynamic' | 'restricted';

/**
 * Base shape for all placement configurations.
 */
export interface ComponentPlacement {
  readonly placementType: PlacementType;
  readonly totalSlots: number;
}

export interface StaticPlacement extends ComponentPlacement {
  readonly placementType: 'static';
  readonly fixedSlots: Partial<Record<MechLocation, readonly number[]>>;
}

export interface DynamicPlacement extends ComponentPlacement {
  readonly placementType: 'dynamic';
}

export interface RestrictedPlacement extends ComponentPlacement {
  readonly placementType: 'restricted';
  readonly allowedLocations: readonly MechLocation[];
  readonly validationRules?: {
    readonly requiresEngineSlots?: boolean;
    readonly maxPerLocation?: number;
  };
}

export type PlacementConfiguration =
  | StaticPlacement
  | DynamicPlacement
  | RestrictedPlacement;

export interface PlacementValidationContext {
  readonly unitType: 'BattleMech' | 'IndustrialMech' | 'ProtoMech' | 'Battle Armor';
  readonly availableSlots: Record<MechLocation, number>;
  readonly engineType?: string;
  readonly engineSlots?: {
    readonly centerTorso: readonly number[];
    readonly leftTorso: readonly number[];
    readonly rightTorso: readonly number[];
  };
}

export interface PlacementValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly suggestedPlacements?: Partial<Record<MechLocation, number>>;
}

export interface ComponentPlacementService {
  validatePlacement(
    component: ComponentPlacement,
    context: PlacementValidationContext,
  ): PlacementValidationResult;

  getValidPlacements(
    component: ComponentPlacement,
    context: PlacementValidationContext,
  ): MechLocation[];

  getTotalSlots(component: ComponentPlacement): number;

  isValidPlacement(
    component: ComponentPlacement,
    location: MechLocation,
    context: PlacementValidationContext,
  ): boolean;
}

/**
 * Official placement presets for commonly constrained components.
 */
export const COMPONENT_PLACEMENTS = {
  ENGINE: {
    standard: {
      placementType: 'static',
      totalSlots: 6,
      fixedSlots: {
        'Center Torso': [0, 1, 2, 3, 4, 5],
      },
    },
    xl: {
      placementType: 'static',
      totalSlots: 12,
      fixedSlots: {
        'Center Torso': [0, 1, 2, 3, 4, 5],
        'Left Torso': [0, 1, 2],
        'Right Torso': [0, 1, 2],
      },
    },
  },

  GYRO: {
    standard: {
      placementType: 'static',
      totalSlots: 4,
      fixedSlots: {
        'Center Torso': [3, 4, 5, 6],
      },
    },
  },

  ENDO_STEEL: {
    innerSphere: {
      placementType: 'dynamic',
      totalSlots: 14,
    },
    clan: {
      placementType: 'dynamic',
      totalSlots: 7,
    },
  },

  FERRO_FIBROUS: {
    innerSphere: {
      placementType: 'dynamic',
      totalSlots: 14,
    },
    clan: {
      placementType: 'dynamic',
      totalSlots: 7,
    },
  },

  CASE: {
    placementType: 'restricted',
    totalSlots: 1,
    allowedLocations: ['Left Torso', 'Right Torso', 'Center Torso'],
  },

  CASE_II: {
    placementType: 'dynamic',
    totalSlots: 1,
  },

  JUMP_JETS: {
    placementType: 'restricted',
    totalSlots: 1,
    allowedLocations: ['Left Leg', 'Right Leg', 'Left Torso', 'Right Torso', 'Center Torso'],
  },

  SUPERCHARGER: {
    placementType: 'restricted',
    totalSlots: 1,
    allowedLocations: ['Center Torso', 'Left Torso', 'Right Torso'],
    validationRules: {
      requiresEngineSlots: true,
    },
  },

  PARTIAL_WING: {
    placementType: 'restricted',
    totalSlots: 6,
    allowedLocations: ['Left Torso', 'Right Torso'],
    validationRules: {
      maxPerLocation: 3,
    },
  },

  TORSO_ELECTRONICS: {
    placementType: 'restricted',
    totalSlots: 1,
    allowedLocations: ['Center Torso', 'Left Torso', 'Right Torso'],
  },
} as const;


