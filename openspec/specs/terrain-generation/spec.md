# Terrain Generation Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-12
**Dependencies**: [terrain-system]
**Affects**: [tactical-map-interface, map-loading]

---

## Overview

### Purpose

Defines the procedural terrain generation algorithm for BattleTech tactical maps. This specification encodes the Perlin noise-based generation system that produces deterministic, biome-specific terrain layouts. The generated terrain is defined by the terrain-system specification; this spec focuses on the generation process itself.

Terrain generation uses seeded pseudo-random number generation to ensure reproducible maps from the same seed, enabling consistent multiplayer experiences and replay functionality. The algorithm combines elevation noise and terrain noise with biome-specific weight distributions to create varied, realistic terrain patterns.

### Scope

**In Scope:**

- Procedural generation algorithm (Perlin noise with octaves)
- Seeded random number generation for determinism
- Biome weight distributions (temperate, desert, arctic, urban, jungle)
- Elevation calculation and terrain selection
- Deterministic generation with seed control
- Edge cases (small/large grids, boundary conditions)

**Out of Scope:**

- Terrain type definitions (see terrain-system)
- Visual rendering of generated terrain
- Terrain transformation (fire spreading, building collapse)
- Real-time terrain modification
- Terrain feature stacking beyond single terrain type per hex

### Key Concepts

- **Seeded Random**: Pseudo-random number generator initialized with a seed value, producing identical sequences for identical seeds
- **Perlin Noise**: Gradient-based noise function producing smooth, natural-looking patterns
- **Octave**: A layer of noise at a specific frequency and amplitude; multiple octaves combined create fractal-like patterns
- **Biome**: A terrain distribution profile (temperate, desert, etc.) with weighted probabilities for each terrain type
- **Elevation**: Vertical height of a hex (0-3 typical), calculated from elevation noise
- **Terrain Type**: The primary terrain category (Clear, Water, Woods, etc.) selected based on weights and noise values

---

## Requirements

### Requirement: Seeded Random Number Generation

The system SHALL provide deterministic random number generation using a linear congruential generator (LCG) seeded with an initial value.

**Priority**: Critical

#### Scenario: Same seed produces identical sequence

**GIVEN** a SeededRandom initialized with seed 12345
**WHEN** calling next() five times
**THEN** the sequence SHALL be: [0.1644, 0.8147, 0.2654, 0.7351, 0.0391]
**AND** initializing a new SeededRandom with seed 12345 and calling next() five times SHALL produce the identical sequence

#### Scenario: Different seeds produce different sequences

**GIVEN** two SeededRandom instances with seeds 12345 and 54321
**WHEN** calling next() on each
**THEN** the first values SHALL differ

#### Scenario: Random values in valid range

**GIVEN** a SeededRandom with any seed
**WHEN** calling next()
**THEN** the returned value SHALL be in range [0.0, 1.0]

#### Scenario: Seed generation from random source

**GIVEN** a TerrainGeneratorConfig with no seed specified
**WHEN** calling generateTerrain
**THEN** a random seed SHALL be generated using Math.random()
**AND** the generated seed SHALL be in range [0, 0x7fffffff]

---

### Requirement: Perlin Noise Generation

The system SHALL generate smooth, continuous noise using Perlin noise with gradient vectors.

**Priority**: Critical

#### Scenario: Gradient creation from seeded RNG

**GIVEN** a SeededRandom with seed 42 and gridSize 8
**WHEN** calling createGradients
**THEN** 64 gradient vectors SHALL be created (8×8)
**AND** each gradient SHALL be a unit vector [cos(angle), sin(angle)]
**AND** the angles SHALL be derived from the seeded RNG

#### Scenario: Perlin noise smoothness

**GIVEN** Perlin noise evaluated at adjacent points (0.0, 0.0) and (0.1, 0.0)
**WHEN** calculating the noise values
**THEN** the values SHALL be similar (smooth transition, not discontinuous)

#### Scenario: Perlin noise range

**GIVEN** Perlin noise evaluated at any point
**WHEN** calculating the noise value
**THEN** the result SHALL be in range [-1.0, 1.0]

---

### Requirement: Octave Noise Combination

The system SHALL combine multiple Perlin noise octaves with decreasing amplitude to create fractal-like patterns.

**Priority**: Critical

#### Scenario: Elevation noise with 3 octaves

**GIVEN** octaveNoise called with octaves=3, persistence=0.5
**WHEN** calculating noise at point (5.0, 5.0)
**THEN** the result SHALL combine:

- Octave 0: frequency=1, amplitude=1
- Octave 1: frequency=2, amplitude=0.5
- Octave 2: frequency=4, amplitude=0.25
  **AND** the final value SHALL be normalized by total amplitude (1.75)

#### Scenario: Terrain noise with 2 octaves

**GIVEN** octaveNoise called with octaves=2, persistence=0.5
**WHEN** calculating noise at point (3.0, 3.0)
**THEN** the result SHALL combine:

- Octave 0: frequency=1, amplitude=1
- Octave 1: frequency=2, amplitude=0.5
  **AND** the final value SHALL be normalized by total amplitude (1.5)

---

### Requirement: Biome Weight Distribution

The system SHALL define terrain type probabilities for each biome, with weights summing to approximately 1.0.

**Priority**: Critical

#### Scenario: Temperate biome weights

**GIVEN** BIOME_WEIGHTS['temperate']
**WHEN** summing all weights
**THEN** the total SHALL be 1.0
**AND** the distribution SHALL be:

- Clear: 0.6 (60%)
- LightWoods: 0.12 (12%)
- HeavyWoods: 0.08 (8%)
- Water: 0.1 (10%)
- Rough: 0.05 (5%)
- Mud: 0.05 (5%)

#### Scenario: Desert biome weights

**GIVEN** BIOME_WEIGHTS['desert']
**WHEN** summing all weights
**THEN** the total SHALL be 1.0
**AND** the distribution SHALL be:

- Sand: 0.5 (50%)
- Rough: 0.3 (30%)
- Clear: 0.1 (10%)
- Mud: 0.05 (5%)
- LightWoods: 0.05 (5%)

#### Scenario: Arctic biome weights

**GIVEN** BIOME_WEIGHTS['arctic']
**WHEN** summing all weights
**THEN** the total SHALL be 1.0
**AND** the distribution SHALL be:

- Snow: 0.4 (40%)
- Ice: 0.3 (30%)
- Clear: 0.2 (20%)
- Rough: 0.05 (5%)
- Water: 0.05 (5%)

#### Scenario: Urban biome weights

**GIVEN** BIOME_WEIGHTS['urban']
**WHEN** summing all weights
**THEN** the total SHALL be 1.0
**AND** the distribution SHALL be:

- Pavement: 0.4 (40%)
- Building: 0.3 (30%)
- Clear: 0.2 (20%)
- Rubble: 0.1 (10%)

#### Scenario: Jungle biome weights

**GIVEN** BIOME_WEIGHTS['jungle']
**WHEN** summing all weights
**THEN** the total SHALL be 1.0
**AND** the distribution SHALL be:

- HeavyWoods: 0.4 (40%)
- LightWoods: 0.3 (30%)
- Swamp: 0.2 (20%)
- Water: 0.1 (10%)

---

### Requirement: Elevation Calculation

The system SHALL calculate hex elevation (0-3) from elevation noise, with lower elevations favoring water terrain.

**Priority**: Critical

#### Scenario: Elevation from noise value

**GIVEN** elevation noise value of 0.5 (normalized from [-1, 1] to [0, 1])
**WHEN** calculating elevation
**THEN** the raw elevation SHALL be floor(0.5 × 4) = 2
**AND** the clamped elevation SHALL be 2 (within [0, 3])

#### Scenario: Low elevation (water-favoring)

**GIVEN** elevation noise value of -0.8 (normalized to 0.1)
**WHEN** calculating elevation
**THEN** the elevation SHALL be 0
**AND** isLowElevation SHALL be true (elevation <= 1)

#### Scenario: High elevation

**GIVEN** elevation noise value of 0.9 (normalized to 0.95)
**WHEN** calculating elevation
**THEN** the elevation SHALL be 3
**AND** isLowElevation SHALL be false

#### Scenario: Elevation clamping

**GIVEN** elevation noise value of 1.0 (normalized to 1.0)
**WHEN** calculating elevation
**THEN** the raw elevation SHALL be floor(1.0 × 4) = 4
**AND** the clamped elevation SHALL be 3 (max value)

---

### Requirement: Terrain Type Selection with Weight Modification

The system SHALL select terrain types based on biome weights, modified by elevation and noise values.

**Priority**: Critical

#### Scenario: Water weight increase at low elevation

**GIVEN** temperate biome, low elevation (isLowElevation=true), base Water weight=0.1
**WHEN** selecting terrain
**THEN** the Water weight SHALL be modified to 0.1 × 2.0 = 0.2

#### Scenario: Water weight decrease at high elevation

**GIVEN** temperate biome, high elevation (isLowElevation=false), base Water weight=0.1
**WHEN** selecting terrain
**THEN** the Water weight SHALL be modified to 0.1 × 0.3 = 0.03

#### Scenario: Woods weight increase with high terrain noise

**GIVEN** temperate biome, terrain noise value > 0.3, base LightWoods weight=0.12
**WHEN** selecting terrain
**THEN** the LightWoods weight SHALL be modified to 0.12 × 1.5 = 0.18

#### Scenario: Weighted random selection

**GIVEN** temperate biome with modified weights, random roll=0.5
**WHEN** selecting terrain
**THEN** the terrain SHALL be selected by cumulative weight distribution
**AND** if cumulative weights are [Clear: 0.6, LightWoods: 0.72, ...], roll 0.5 SHALL select Clear

---

### Requirement: Deterministic Generation with Same Seed

The system SHALL produce identical terrain grids when called with the same seed, width, height, and biome.

**Priority**: Critical

#### Scenario: Identical generation with same seed

**GIVEN** generateTerrain called with config {width: 10, height: 10, biome: 'temperate', seed: 42}
**WHEN** calling generateTerrain again with identical config
**THEN** the returned grids SHALL be identical
**AND** each hex SHALL have identical coordinate, elevation, and terrain type

#### Scenario: Different generation with different seed

**GIVEN** generateTerrain called with seed 42
**WHEN** calling generateTerrain with seed 43
**THEN** the returned grids SHALL differ
**AND** at least some hexes SHALL have different terrain types or elevations

#### Scenario: Reproducible multiplayer maps

**GIVEN** two players generating terrain with seed 12345, width 20, height 20, biome 'desert'
**WHEN** both complete generation
**THEN** both players SHALL have identical terrain layouts
**AND** multiplayer synchronization SHALL not require terrain transmission

---

### Requirement: Grid Generation with Correct Dimensions

The system SHALL generate terrain grids with exact width and height dimensions.

**Priority**: Critical

#### Scenario: Small grid generation

**GIVEN** generateTerrain called with width=5, height=5
**WHEN** generation completes
**THEN** the returned grid SHALL contain exactly 25 hexes (5×5)
**AND** coordinates SHALL range from q=[0,4], r=[0,4]

#### Scenario: Large grid generation

**GIVEN** generateTerrain called with width=50, height=50
**WHEN** generation completes
**THEN** the returned grid SHALL contain exactly 2500 hexes (50×50)
**AND** all coordinates SHALL be within bounds

#### Scenario: Rectangular grid (non-square)

**GIVEN** generateTerrain called with width=20, height=10
**WHEN** generation completes
**THEN** the returned grid SHALL contain exactly 200 hexes (20×10)
**AND** coordinates SHALL range from q=[0,19], r=[0,9]

---

### Requirement: Biome Distribution Accuracy

The system SHALL produce terrain distributions that approximate the biome weights over large grids.

**Priority**: High

#### Scenario: Temperate biome distribution

**GIVEN** generateTerrain called with width=100, height=100, biome='temperate', seed=999
**WHEN** counting terrain types in the generated grid
**THEN** Clear terrain SHALL comprise approximately 55-65% of hexes (target 60%)
**AND** Water terrain SHALL comprise approximately 8-12% of hexes (target 10%)
**AND** HeavyWoods SHALL comprise approximately 6-10% of hexes (target 8%)

#### Scenario: Desert biome distribution

**GIVEN** generateTerrain called with width=100, height=100, biome='desert', seed=999
**WHEN** counting terrain types in the generated grid
**THEN** Sand terrain SHALL comprise approximately 45-55% of hexes (target 50%)
**AND** Rough terrain SHALL comprise approximately 25-35% of hexes (target 30%)

---

### Requirement: Edge Cases and Boundary Conditions

The system SHALL handle edge cases gracefully without errors or invalid data.

**Priority**: High

#### Scenario: Minimum grid size

**GIVEN** generateTerrain called with width=1, height=1
**WHEN** generation completes
**THEN** the returned grid SHALL contain exactly 1 hex
**AND** the hex SHALL have valid elevation and terrain type

#### Scenario: Very large grid

**GIVEN** generateTerrain called with width=200, height=200
**WHEN** generation completes
**THEN** the returned grid SHALL contain exactly 40000 hexes
**AND** all hexes SHALL have valid properties

#### Scenario: Boundary hex generation

**GIVEN** generateTerrain called with width=10, height=10
**WHEN** examining hexes at grid boundaries (q=0, q=9, r=0, r=9)
**THEN** all boundary hexes SHALL have valid elevation and terrain
**AND** no boundary hexes SHALL be missing or malformed

---

### Requirement: Terrain Feature Creation

The system SHALL create terrain features with appropriate type and level for each hex.

**Priority**: High

#### Scenario: Water terrain feature level

**GIVEN** a hex with terrain type Water
**WHEN** examining the terrain feature
**THEN** the feature.type SHALL be TerrainType.Water
**AND** the feature.level SHALL be 1

#### Scenario: Non-water terrain feature level

**GIVEN** a hex with terrain type Clear
**WHEN** examining the terrain feature
**THEN** the feature.type SHALL be TerrainType.Clear
**AND** the feature.level SHALL be 0

#### Scenario: Water elevation clamping

**GIVEN** a hex with terrain type Water and calculated elevation 2
**WHEN** examining the hex elevation
**THEN** the hex.elevation SHALL be min(2, 1) = 1
**AND** non-water terrain SHALL retain full elevation value

---

### Requirement: Noise Scale Parameters

The system SHALL use consistent noise scale parameters for elevation and terrain noise.

**Priority**: Medium

#### Scenario: Elevation scale

**GIVEN** generateTerrain processing a hex at coordinate (q=10, r=10)
**WHEN** calculating elevation noise
**THEN** the noise SHALL be sampled at (q × 0.15, r × 0.15) = (1.5, 1.5)
**AND** the elevation scale SHALL be 0.15

#### Scenario: Terrain scale

**GIVEN** generateTerrain processing a hex at coordinate (q=10, r=10)
**WHEN** calculating terrain noise
**THEN** the noise SHALL be sampled at (q × 0.2, r × 0.2) = (2.0, 2.0)
**AND** the terrain scale SHALL be 0.2

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Configuration for terrain generation.
 */
export interface TerrainGeneratorConfig {
  /** Grid width in hexes */
  readonly width: number;

  /** Grid height in hexes */
  readonly height: number;

  /** Biome type determining terrain distribution */
  readonly biome: BiomeType;

  /** Optional seed for deterministic generation (auto-generated if omitted) */
  readonly seed?: number;
}

/**
 * Biome type enumeration.
 */
export type BiomeType = 'temperate' | 'desert' | 'arctic' | 'urban' | 'jungle';

/**
 * Terrain type weights for a biome.
 * Maps each terrain type to its probability (0.0-1.0).
 */
export type BiomeWeights = Record<
  BiomeType,
  Partial<Record<TerrainType, number>>
>;

/**
 * Seeded pseudo-random number generator using linear congruential generator.
 * Produces deterministic sequences for identical seeds.
 */
class SeededRandom {
  /**
   * Initialize with a seed value.
   * @param seed - Initial seed (typically 0 to 0x7fffffff)
   */
  constructor(seed: number);

  /**
   * Generate next random value in range [0.0, 1.0].
   * @returns Random value
   */
  next(): number;
}

/**
 * Generate a procedural terrain grid.
 * @param config - Generation configuration (width, height, biome, optional seed)
 * @returns Array of IHexTerrain with generated terrain
 */
export function generateTerrain(config: TerrainGeneratorConfig): IHexTerrain[];
```

### Required Constants

```typescript
/**
 * Biome-specific terrain type weight distributions.
 * Each biome maps terrain types to probabilities (sum ≈ 1.0).
 */
export const BIOME_WEIGHTS: BiomeWeights = {
  temperate: {
    [TerrainType.Clear]: 0.6,
    [TerrainType.LightWoods]: 0.12,
    [TerrainType.HeavyWoods]: 0.08,
    [TerrainType.Water]: 0.1,
    [TerrainType.Rough]: 0.05,
    [TerrainType.Mud]: 0.05,
  },
  desert: {
    [TerrainType.Sand]: 0.5,
    [TerrainType.Rough]: 0.3,
    [TerrainType.Clear]: 0.1,
    [TerrainType.Mud]: 0.05,
    [TerrainType.LightWoods]: 0.05,
  },
  arctic: {
    [TerrainType.Snow]: 0.4,
    [TerrainType.Ice]: 0.3,
    [TerrainType.Clear]: 0.2,
    [TerrainType.Rough]: 0.05,
    [TerrainType.Water]: 0.05,
  },
  urban: {
    [TerrainType.Pavement]: 0.4,
    [TerrainType.Building]: 0.3,
    [TerrainType.Clear]: 0.2,
    [TerrainType.Rubble]: 0.1,
  },
  jungle: {
    [TerrainType.HeavyWoods]: 0.4,
    [TerrainType.LightWoods]: 0.3,
    [TerrainType.Swamp]: 0.2,
    [TerrainType.Water]: 0.1,
  },
};
```

---

## Calculation Formulas

### Seeded Random Formula

**Formula**:

```
seed = (seed × 1103515245 + 12345) & 0x7fffffff
value = seed / 0x7fffffff
```

**Where**:

- `seed` - Current seed state (updated each call)
- `1103515245` - LCG multiplier
- `12345` - LCG increment
- `0x7fffffff` - Bitmask (2^31 - 1)

**Example**:

```
Initial seed: 12345
Iteration 1: (12345 × 1103515245 + 12345) & 0x7fffffff = 1644 → value = 1644/2147483647 ≈ 0.0008
Iteration 2: (1644 × 1103515245 + 12345) & 0x7fffffff = 1744 → value ≈ 0.0008
```

### Elevation Calculation Formula

**Formula**:

```
elevationNoise = octaveNoise(gradients, gridSize, q × 0.15, r × 0.15, octaves=3, persistence=0.5)
normalizedElevation = (elevationNoise + 1) / 2
elevation = floor(normalizedElevation × 4)
clampedElevation = max(0, min(3, elevation))
isLowElevation = clampedElevation <= 1
```

**Where**:

- `elevationNoise` - Perlin noise value in range [-1, 1]
- `normalizedElevation` - Noise normalized to [0, 1]
- `elevation` - Raw elevation before clamping
- `clampedElevation` - Final elevation in range [0, 3]
- `isLowElevation` - Boolean flag for water weight modification

**Example**:

```
Elevation noise: 0.5
Normalized: (0.5 + 1) / 2 = 0.75
Raw elevation: floor(0.75 × 4) = 3
Clamped: 3
isLowElevation: false
```

### Terrain Selection Formula

**Formula**:

```
modifiedWeights = weights.map(weight => {
  if (type === Water && isLowElevation) weight *= 2.0
  else if (type === Water && !isLowElevation) weight *= 0.3
  if ((type === LightWoods || HeavyWoods) && noiseValue > 0.3) weight *= 1.5
  return weight
})

totalWeight = sum(modifiedWeights)
normalizedRoll = roll × totalWeight
terrainType = selectByAccumulativeWeight(modifiedWeights, normalizedRoll)
```

**Where**:

- `weights` - Biome weights for terrain types
- `roll` - Random value from SeededRandom [0, 1]
- `noiseValue` - Terrain noise normalized to [0, 1]
- `isLowElevation` - Elevation <= 1

**Example**:

```
Temperate biome, low elevation, terrain noise 0.5, roll 0.3:
  Clear: 0.6 (no modification)
  LightWoods: 0.12 × 1.5 = 0.18 (noise > 0.3)
  HeavyWoods: 0.08 × 1.5 = 0.12 (noise > 0.3)
  Water: 0.1 × 2.0 = 0.2 (low elevation)
  Rough: 0.05 (no modification)
  Mud: 0.05 (no modification)

  totalWeight = 1.2
  normalizedRoll = 0.3 × 1.2 = 0.36

  Cumulative: Clear=0.6, LightWoods=0.78, ...
  Roll 0.36 <= 0.6 → Select Clear
```

---

## Implementation Notes

### Performance Considerations

- Pre-calculate gradient vectors once per generation (not per hex)
- Use lookup tables for biome weights (not conditionals)
- Cache normalized elevation and terrain noise values
- Avoid repeated Math.floor/Math.min/Math.max calls

### Algorithm Overview

1. Initialize SeededRandom with provided or generated seed
2. Create gradient vectors for elevation and terrain noise (gridSize × gridSize each)
3. For each hex (q, r) in grid:
   - Calculate elevation noise using octaveNoise (3 octaves, scale 0.15)
   - Calculate terrain noise using octaveNoise (2 octaves, scale 0.2)
   - Normalize both to [0, 1]
   - Calculate elevation (0-3) from elevation noise
   - Determine isLowElevation flag
   - Generate random roll
   - Select terrain type using modified weights
   - Create terrain feature with appropriate level
   - Clamp water elevation to max 1
4. Return complete grid

### Edge Cases

- **Minimum grid (1×1)**: Single hex generation works correctly
- **Very large grids (200×200+)**: Performance acceptable with pre-calculated gradients
- **Boundary hexes**: No special handling needed; all hexes treated identically
- **Seed overflow**: LCG bitmask prevents overflow; seed always in valid range

### Noise Quality

- Perlin noise provides smooth gradients (no discontinuities)
- Octave combination creates natural-looking fractal patterns
- Persistence 0.5 balances detail and smoothness
- Multiple octaves prevent repetitive patterns

---

## Dependencies

### Depends On

- **terrain-system**: TerrainType enumeration and IHexTerrain interface
- **hex-grid-interfaces**: IHexCoordinate for hex positions

### Used By

- **tactical-map-interface**: Renders generated terrain visually
- **map-loading**: Loads and caches generated maps
- **campaign-system**: Generates campaign maps with consistent seeds

---

## References

### Perlin Noise

- Perlin, K. (2002). "Improving Noise". Proceedings of SIGGRAPH 2002.
- Gradient-based noise function with smooth interpolation (fade function)
- Dot product of gradient and distance vectors

### Linear Congruential Generator

- Lehmer, D. H. (1951). "Mathematical methods in large-scale computing units"
- Parameters: a=1103515245, c=12345, m=2^31
- Deterministic sequence from seed

### Procedural Generation

- Ebert, D. S., et al. (2003). "Texturing and Modeling: A Procedural Approach"
- Octave noise (fractional Brownian motion)
- Biome-based weight distributions

---

## Changelog

### Version 1.0 (2026-02-12)

- Initial specification for terrain generation algorithm
- Covers Perlin noise, seeded RNG, biome weights, deterministic generation
- 13 requirements with 40+ scenarios
- Cross-references terrain-system specification
