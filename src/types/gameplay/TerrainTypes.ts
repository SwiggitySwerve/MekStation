/**
 * Terrain Types and Properties
 * Comprehensive terrain system per BattleTech TechManual.
 *
 * @spec openspec/specs/terrain-system/spec.md
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * Enumeration of all terrain types per TechManual.
 */
export enum TerrainType {
  Clear = 'clear',
  Pavement = 'pavement',
  Road = 'road',
  LightWoods = 'light_woods',
  HeavyWoods = 'heavy_woods',
  Rough = 'rough',
  Rubble = 'rubble',
  Water = 'water',
  Sand = 'sand',
  Mud = 'mud',
  Snow = 'snow',
  Ice = 'ice',
  Swamp = 'swamp',
  Building = 'building',
  Bridge = 'bridge',
  Fire = 'fire',
  Smoke = 'smoke',
}

/**
 * Cover level classification.
 */
export enum CoverLevel {
  None = 'none',
  Partial = 'partial',
  Full = 'full',
}

// =============================================================================
// Interfaces
// =============================================================================

/**
 * A terrain feature with type and level.
 */
export interface ITerrainFeature {
  /** The terrain type */
  readonly type: TerrainType;

  /** Level/depth/intensity (0 = none, 1+ = increasing) */
  readonly level: number;

  /** For buildings: Construction Factor */
  readonly constructionFactor?: number;

  /** Whether this terrain is currently on fire */
  readonly isOnFire?: boolean;

  /** Whether water/ice is frozen */
  readonly isFrozen?: boolean;
}

/**
 * Mechanical properties for a terrain type.
 */
export interface ITerrainProperties {
  /** Base movement cost modifier (added to 1) */
  readonly movementCostModifier: {
    walk: number;
    run: number;
    jump: number;
    tracked: number;
    wheeled: number;
    hover: number;
    vtol: number;
  };

  /** To-hit modifier when intervening */
  readonly toHitInterveningModifier: number;

  /** To-hit modifier when target is in this terrain */
  readonly toHitTargetInModifier: number;

  /** Heat effect per turn (negative = cooling) */
  readonly heatEffect: number;

  /** Cover level provided */
  readonly coverLevel: CoverLevel;

  /** Whether this terrain blocks LOS */
  readonly blocksLOS: boolean;

  /** Height for LOS calculations (0 = ground level) */
  readonly losBlockHeight: number;

  /** Whether PSR is required to enter */
  readonly requiresPSR: boolean;

  /** Special rules that apply */
  readonly specialRules: readonly string[];
}

/**
 * Complete hex terrain definition.
 */
export interface IHexTerrain {
  /** Hex coordinate */
  readonly coordinate: { q: number; r: number };

  /** Base elevation level */
  readonly elevation: number;

  /** All terrain features in this hex */
  readonly features: readonly ITerrainFeature[];
}

// =============================================================================
// Terrain Properties Constant
// =============================================================================

/**
 * Complete terrain properties mapping per TechManual.
 * Includes movement costs, to-hit modifiers, heat effects, cover, and LOS blocking.
 */
export const TERRAIN_PROPERTIES: Readonly<
  Record<TerrainType, ITerrainProperties>
> = {
  [TerrainType.Clear]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Pavement]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Road]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.LightWoods]: {
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 1,
      wheeled: 1,
      hover: 1,
      vtol: 0,
    },
    toHitInterveningModifier: 1,
    toHitTargetInModifier: 1,
    heatEffect: 0,
    coverLevel: CoverLevel.Partial,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.HeavyWoods]: {
    movementCostModifier: {
      walk: 2,
      run: 2,
      jump: 2,
      tracked: 2,
      wheeled: 2,
      hover: 2,
      vtol: 0,
    },
    toHitInterveningModifier: 2,
    toHitTargetInModifier: 2,
    heatEffect: 0,
    coverLevel: CoverLevel.Full,
    blocksLOS: true,
    losBlockHeight: 1,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Rough]: {
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 1,
      wheeled: 1,
      hover: 1,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Rubble]: {
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 1,
      wheeled: 1,
      hover: 1,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Water]: {
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 1,
      wheeled: 1,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: -1,
    heatEffect: -2,
    coverLevel: CoverLevel.Partial,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: ['depth-dependent'],
  },

  [TerrainType.Sand]: {
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 1,
      wheeled: 1,
      hover: 1,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Mud]: {
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 1,
      wheeled: 1,
      hover: 1,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Snow]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: ['depth-dependent'],
  },

  [TerrainType.Ice]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Swamp]: {
    movementCostModifier: {
      walk: 2,
      run: 2,
      jump: 2,
      tracked: 2,
      wheeled: 2,
      hover: 2,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 1,
    heatEffect: 0,
    coverLevel: CoverLevel.Partial,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Building]: {
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 1,
      wheeled: 1,
      hover: 1,
      vtol: 0,
    },
    toHitInterveningModifier: 1,
    toHitTargetInModifier: 1,
    heatEffect: 0,
    coverLevel: CoverLevel.Partial,
    blocksLOS: true,
    losBlockHeight: 1,
    requiresPSR: false,
    specialRules: ['construction-factor-dependent'],
  },

  [TerrainType.Bridge]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Fire]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 5,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: ['heat-damage'],
  },

  [TerrainType.Smoke]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 1,
    toHitTargetInModifier: 1,
    heatEffect: 0,
    coverLevel: CoverLevel.Partial,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: ['density-dependent'],
  },
};
