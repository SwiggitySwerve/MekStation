/**
 * Map Preset Data
 * Pre-defined map configurations for terrain generation.
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */

import { BiomeType, type IMapPreset } from '../../types/scenario';

// =============================================================================
// Plains Biome Presets
// =============================================================================

/**
 * Open plains - minimal terrain.
 */
export const OPEN_PLAINS: IMapPreset = {
  id: 'open_plains',
  name: 'Open Plains',
  biome: BiomeType.Plains,
  radius: 10,
  features: [
    { type: 'elevation', density: 0.05, clustering: 0.3 },
    { type: 'rough', density: 0.03, clustering: 0.4 },
  ],
  elevationVariance: 0.1,
  temperatureRange: { min: 15, max: 30 },
};

/**
 * Rolling hills - gentle elevation changes.
 */
export const ROLLING_HILLS: IMapPreset = {
  id: 'rolling_hills',
  name: 'Rolling Hills',
  biome: BiomeType.Plains,
  radius: 12,
  features: [
    { type: 'elevation', density: 0.3, clustering: 0.6 },
    { type: 'woods', density: 0.1, clustering: 0.5 },
    { type: 'rough', density: 0.05, clustering: 0.4 },
  ],
  elevationVariance: 0.4,
  temperatureRange: { min: 10, max: 25 },
};

// =============================================================================
// Forest Biome Presets
// =============================================================================

/**
 * Light forest - scattered woods.
 */
export const LIGHT_FOREST: IMapPreset = {
  id: 'light_forest',
  name: 'Light Forest',
  biome: BiomeType.Forest,
  radius: 10,
  features: [
    { type: 'woods', density: 0.25, clustering: 0.5 },
    { type: 'elevation', density: 0.1, clustering: 0.4 },
    { type: 'water', density: 0.03, clustering: 0.7 },
  ],
  elevationVariance: 0.2,
  temperatureRange: { min: 5, max: 25 },
};

/**
 * Dense forest - heavy woods coverage.
 */
export const DENSE_FOREST: IMapPreset = {
  id: 'dense_forest',
  name: 'Dense Forest',
  biome: BiomeType.Forest,
  radius: 8,
  features: [
    { type: 'woods', density: 0.5, clustering: 0.7 },
    { type: 'elevation', density: 0.15, clustering: 0.5 },
    { type: 'water', density: 0.05, clustering: 0.6 },
    { type: 'rough', density: 0.05, clustering: 0.4 },
  ],
  elevationVariance: 0.3,
  temperatureRange: { min: 5, max: 20 },
};

// =============================================================================
// Urban Biome Presets
// =============================================================================

/**
 * Small town - scattered buildings.
 */
export const SMALL_TOWN: IMapPreset = {
  id: 'small_town',
  name: 'Small Town',
  biome: BiomeType.Urban,
  radius: 8,
  features: [
    { type: 'building', density: 0.2, clustering: 0.7 },
    { type: 'road', density: 0.15, clustering: 0.9 },
    { type: 'woods', density: 0.05, clustering: 0.4 },
  ],
  elevationVariance: 0.05,
  temperatureRange: { min: 10, max: 30 },
};

/**
 * Industrial complex - dense buildings and infrastructure.
 */
export const INDUSTRIAL_COMPLEX: IMapPreset = {
  id: 'industrial_complex',
  name: 'Industrial Complex',
  biome: BiomeType.Urban,
  radius: 10,
  features: [
    { type: 'building', density: 0.4, clustering: 0.8 },
    { type: 'road', density: 0.2, clustering: 0.9 },
    { type: 'rough', density: 0.1, clustering: 0.5 },
  ],
  elevationVariance: 0.1,
  temperatureRange: { min: 15, max: 35 },
};

/**
 * Megacity - massive urban sprawl.
 */
export const MEGACITY: IMapPreset = {
  id: 'megacity',
  name: 'Megacity',
  biome: BiomeType.Urban,
  radius: 12,
  features: [
    { type: 'building', density: 0.6, clustering: 0.9 },
    { type: 'road', density: 0.25, clustering: 0.95 },
    { type: 'elevation', density: 0.05, clustering: 0.3 },
  ],
  elevationVariance: 0.15,
  temperatureRange: { min: 15, max: 35 },
};

// =============================================================================
// Desert Biome Presets
// =============================================================================

/**
 * Open desert - flat, minimal terrain.
 */
export const OPEN_DESERT: IMapPreset = {
  id: 'open_desert',
  name: 'Open Desert',
  biome: BiomeType.Desert,
  radius: 14,
  features: [
    { type: 'rough', density: 0.1, clustering: 0.3 },
    { type: 'elevation', density: 0.05, clustering: 0.4 },
  ],
  elevationVariance: 0.1,
  temperatureRange: { min: 30, max: 50 },
};

/**
 * Desert canyon - rocky terrain with elevation.
 */
export const DESERT_CANYON: IMapPreset = {
  id: 'desert_canyon',
  name: 'Desert Canyon',
  biome: BiomeType.Desert,
  radius: 10,
  features: [
    { type: 'elevation', density: 0.4, clustering: 0.8 },
    { type: 'rough', density: 0.25, clustering: 0.6 },
  ],
  elevationVariance: 0.7,
  temperatureRange: { min: 25, max: 45 },
};

// =============================================================================
// Badlands Biome Presets
// =============================================================================

/**
 * Rocky badlands - rough terrain.
 */
export const ROCKY_BADLANDS: IMapPreset = {
  id: 'rocky_badlands',
  name: 'Rocky Badlands',
  biome: BiomeType.Badlands,
  radius: 10,
  features: [
    { type: 'rough', density: 0.35, clustering: 0.5 },
    { type: 'elevation', density: 0.25, clustering: 0.6 },
  ],
  elevationVariance: 0.5,
  temperatureRange: { min: 10, max: 35 },
};

/**
 * Volcanic wasteland - lava and rough terrain.
 */
export const VOLCANIC_WASTELAND: IMapPreset = {
  id: 'volcanic_wasteland',
  name: 'Volcanic Wasteland',
  biome: BiomeType.Volcanic,
  radius: 8,
  features: [
    { type: 'rough', density: 0.4, clustering: 0.6 },
    { type: 'elevation', density: 0.3, clustering: 0.7 },
  ],
  elevationVariance: 0.6,
  temperatureRange: { min: 35, max: 60 },
};

// =============================================================================
// Arctic Biome Presets
// =============================================================================

/**
 * Frozen tundra - open ice fields.
 */
export const FROZEN_TUNDRA: IMapPreset = {
  id: 'frozen_tundra',
  name: 'Frozen Tundra',
  biome: BiomeType.Arctic,
  radius: 12,
  features: [
    { type: 'water', density: 0.15, clustering: 0.6 }, // Frozen lakes
    { type: 'elevation', density: 0.1, clustering: 0.4 },
    { type: 'rough', density: 0.05, clustering: 0.3 },
  ],
  elevationVariance: 0.15,
  temperatureRange: { min: -40, max: -10 },
};

/**
 * Glacier field - ice and crevasses.
 */
export const GLACIER_FIELD: IMapPreset = {
  id: 'glacier_field',
  name: 'Glacier Field',
  biome: BiomeType.Arctic,
  radius: 10,
  features: [
    { type: 'rough', density: 0.2, clustering: 0.5 }, // Crevasses
    { type: 'water', density: 0.1, clustering: 0.7 },
    { type: 'elevation', density: 0.2, clustering: 0.6 },
  ],
  elevationVariance: 0.4,
  temperatureRange: { min: -50, max: -20 },
};

// =============================================================================
// Swamp Biome Presets
// =============================================================================

/**
 * Marshland - water and woods.
 */
export const MARSHLAND: IMapPreset = {
  id: 'marshland',
  name: 'Marshland',
  biome: BiomeType.Swamp,
  radius: 10,
  features: [
    { type: 'water', density: 0.35, clustering: 0.5 },
    { type: 'woods', density: 0.2, clustering: 0.6 },
    { type: 'rough', density: 0.1, clustering: 0.4 },
  ],
  elevationVariance: 0.05,
  temperatureRange: { min: 15, max: 30 },
};

// =============================================================================
// Jungle Biome Presets
// =============================================================================

/**
 * Tropical jungle - dense vegetation.
 */
export const TROPICAL_JUNGLE: IMapPreset = {
  id: 'tropical_jungle',
  name: 'Tropical Jungle',
  biome: BiomeType.Jungle,
  radius: 8,
  features: [
    { type: 'woods', density: 0.55, clustering: 0.8 },
    { type: 'water', density: 0.1, clustering: 0.6 },
    { type: 'rough', density: 0.1, clustering: 0.4 },
    { type: 'elevation', density: 0.1, clustering: 0.5 },
  ],
  elevationVariance: 0.25,
  temperatureRange: { min: 25, max: 40 },
};

// =============================================================================
// Mountain Biome Presets
// =============================================================================

/**
 * Mountain pass - restricted terrain.
 */
export const MOUNTAIN_PASS: IMapPreset = {
  id: 'mountain_pass',
  name: 'Mountain Pass',
  biome: BiomeType.Mountains,
  radius: 8,
  features: [
    { type: 'elevation', density: 0.5, clustering: 0.85 },
    { type: 'rough', density: 0.3, clustering: 0.7 },
    { type: 'woods', density: 0.05, clustering: 0.3 },
  ],
  elevationVariance: 0.8,
  temperatureRange: { min: -10, max: 15 },
};

/**
 * Alpine valley - mountain-ringed clearing.
 */
export const ALPINE_VALLEY: IMapPreset = {
  id: 'alpine_valley',
  name: 'Alpine Valley',
  biome: BiomeType.Mountains,
  radius: 10,
  features: [
    { type: 'elevation', density: 0.35, clustering: 0.9 },
    { type: 'woods', density: 0.15, clustering: 0.5 },
    { type: 'water', density: 0.05, clustering: 0.7 },
    { type: 'rough', density: 0.1, clustering: 0.5 },
  ],
  elevationVariance: 0.6,
  temperatureRange: { min: -5, max: 20 },
};

// =============================================================================
// Exports
// =============================================================================

/**
 * All available map presets.
 */
export const MAP_PRESETS: readonly IMapPreset[] = [
  // Plains
  OPEN_PLAINS,
  ROLLING_HILLS,
  // Forest
  LIGHT_FOREST,
  DENSE_FOREST,
  // Urban
  SMALL_TOWN,
  INDUSTRIAL_COMPLEX,
  MEGACITY,
  // Desert
  OPEN_DESERT,
  DESERT_CANYON,
  // Badlands/Volcanic
  ROCKY_BADLANDS,
  VOLCANIC_WASTELAND,
  // Arctic
  FROZEN_TUNDRA,
  GLACIER_FIELD,
  // Swamp
  MARSHLAND,
  // Jungle
  TROPICAL_JUNGLE,
  // Mountains
  MOUNTAIN_PASS,
  ALPINE_VALLEY,
];

/**
 * Get a map preset by ID.
 */
export function getMapPresetById(id: string): IMapPreset | undefined {
  return MAP_PRESETS.find((p) => p.id === id);
}

/**
 * Get map presets by biome.
 */
export function getMapPresetsByBiome(biome: BiomeType): readonly IMapPreset[] {
  return MAP_PRESETS.filter((p) => p.biome === biome);
}

/**
 * Get a random map preset for a biome.
 */
export function getRandomMapPresetForBiome(biome: BiomeType): IMapPreset {
  const presets = getMapPresetsByBiome(biome);
  if (presets.length === 0) {
    return OPEN_PLAINS; // Fallback
  }
  return presets[Math.floor(Math.random() * presets.length)];
}
