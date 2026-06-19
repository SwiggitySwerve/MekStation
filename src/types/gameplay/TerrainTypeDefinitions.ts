/**
 * Terrain type definitions and structural terrain interfaces.
 */

import type { MovementTravelMode } from './HexGridInterfaces';

export enum TerrainType {
  Clear = 'clear',
  Pavement = 'pavement',
  Road = 'road',
  LightWoods = 'light_woods',
  HeavyWoods = 'heavy_woods',
  HeavyIndustrial = 'heavy_industrial',
  PlantedField = 'planted_field',
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
  Mines = 'mines',
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

  /** For buildings: stable footprint identity shared by connected hexes */
  readonly buildingId?: string;

  /** For fuel tanks: MegaMek FUEL_TANK_ELEV-derived LOS height */
  readonly fuelTankElevation?: number;

  /** For fuel tanks: stable object identity for future damageable cover routing */
  readonly fuelTankId?: string;

  /** Whether this terrain is currently on fire */
  readonly isOnFire?: boolean;

  /** Whether water/ice is frozen */
  readonly isFrozen?: boolean;

  /**
   * For MegaMek-style cliff-top edge metadata: Facing numeric directions
   * from this hex toward adjacent lower hexes where the cliff edge exists.
   */
  readonly cliffTopExits?: readonly number[];
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
  } & Partial<Record<MovementTravelMode, number>>;

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

/**
 * A fully generated battle map: the hex grid plus the originating preset id.
 *
 * Recorded by the procedural terrain generator so a generated map can be
 * reproduced and debugged from the preset it came from.
 *
 * @spec openspec/changes/add-procedural-map-variety/specs/terrain-generation/spec.md
 */
export interface IGeneratedMap {
  /** The generated hex grid (base pass plus optional feature overlay). */
  readonly grid: readonly IHexTerrain[];

  /** The originating map-preset id, when generation ran from a preset. */
  readonly presetId?: string;
}
