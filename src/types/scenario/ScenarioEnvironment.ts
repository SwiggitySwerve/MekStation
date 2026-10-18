import {
  BiomeType,
  ScenarioObjectiveType,
  ModifierEffect,
} from './ScenarioEnums';

// =============================================================================
// Battle Modifier Interface
// =============================================================================

/**
 * When a modifier can apply.
 */
export interface IModifierApplicability {
  /** Minimum turn for modifier to apply (0 = start) */
  readonly minTurn?: number;
  /** Maximum turn for modifier (0 = entire game) */
  readonly maxTurn?: number;
  /** Required biomes for modifier */
  readonly biomes?: readonly BiomeType[];
  /** Required scenario types */
  readonly scenarioTypes?: readonly ScenarioObjectiveType[];
  /** Probability weight (higher = more likely) */
  readonly weight: number;
  /** Is this modifier exclusive with others? */
  readonly exclusiveWith?: readonly string[];
}

/**
 * Implementation details for a modifier.
 */
export interface IModifierImplementation {
  /** Type of implementation */
  readonly type:
    | 'reinforcement'
    | 'terrain_effect'
    | 'equipment_effect'
    | 'force_modifier'
    | 'objective_modifier';
  /** Implementation-specific parameters */
  readonly parameters: Readonly<Record<string, unknown>>;
}

/**
 * Battle modifier definition.
 */
export interface IBattleModifier {
  /** Unique identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Description */
  readonly description: string;
  /** Effect type (positive/negative/neutral for player) */
  readonly effect: ModifierEffect;
  /** When this modifier can apply */
  readonly applicability: IModifierApplicability;
  /** How this modifier is implemented */
  readonly implementation: IModifierImplementation;
  /** Tags for categorization */
  readonly tags: readonly string[];
}

// =============================================================================
// Terrain/Map Generation Interface
// =============================================================================

/**
 * Terrain feature configuration.
 */
export interface ITerrainFeature {
  /** Feature type */
  readonly type:
    | 'woods'
    | 'water'
    | 'rough'
    | 'building'
    | 'elevation'
    | 'road';
  /** Density (0-1, how much of the map) */
  readonly density: number;
  /** Clustering factor (0-1, how clumped) */
  readonly clustering: number;
}

/**
 * Map preset configuration.
 */
export interface IMapPreset {
  /** Unique identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Biome type */
  readonly biome: BiomeType;
  /** Map size (hex radius) */
  readonly radius: number;
  /** Terrain features */
  readonly features: readonly ITerrainFeature[];
  /** Elevation variance (0 = flat, 1 = mountainous) */
  readonly elevationVariance: number;
  /** Temperature range */
  readonly temperatureRange: {
    readonly min: number;
    readonly max: number;
  };
}

/**
 * Type guard for IBattleModifier.
 */
export function isBattleModifier(obj: unknown): obj is IBattleModifier {
  if (typeof obj !== 'object' || obj === null) return false;
  const modifier = obj as IBattleModifier;
  return (
    typeof modifier.id === 'string' &&
    typeof modifier.name === 'string' &&
    typeof modifier.effect === 'string' &&
    typeof modifier.applicability === 'object' &&
    typeof modifier.implementation === 'object'
  );
}
