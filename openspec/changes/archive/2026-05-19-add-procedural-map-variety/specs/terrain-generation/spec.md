## ADDED Requirements

### Requirement: Preset Feature Directives

`TerrainGeneratorConfig` SHALL accept an optional `presetFeatures` field — an ordered list of `IFeatureDirective` records, each specifying a `type` (`TerrainType`), a `density` (target fraction of grid hexes, `[0, 1]`), and a `clusterSize` (mean cluster radius in hexes). When `presetFeatures` is omitted or empty, `generateTerrain` SHALL produce output identical to base biome generation.

#### Scenario: Generation without presetFeatures is unchanged

- **GIVEN** a `TerrainGeneratorConfig` with no `presetFeatures` field
- **WHEN** `generateTerrain` runs
- **THEN** the resulting grid SHALL be identical to the grid produced by base biome generation for the same width, height, biome, and seed

#### Scenario: Directives are accepted and applied

- **GIVEN** a `TerrainGeneratorConfig` with a `presetFeatures` directive for `HeavyWoods` at density `0.3`
- **WHEN** `generateTerrain` runs
- **THEN** the resulting grid SHALL contain `HeavyWoods` hexes
- **AND** the `HeavyWoods` fraction SHALL be within tolerance of `0.3`

### Requirement: Deterministic Feature Clustering

The feature-application pass SHALL place each directive's hexes as clusters: cluster origins SHALL be drawn from the same seeded RNG used by base generation, and each origin SHALL be grown by seeded flood-fill to approximately `clusterSize` hexes. The full generated map — base pass plus feature pass — SHALL be a deterministic function of the seed.

#### Scenario: Identical seed yields identical clustered map

- **GIVEN** two `generateTerrain` calls with identical width, height, biome, seed, and `presetFeatures`
- **WHEN** both complete
- **THEN** the two grids SHALL be identical hex for hex, including all feature placements

#### Scenario: Different seed yields different feature placement

- **GIVEN** two `generateTerrain` calls identical except for the seed
- **WHEN** both complete with the same `presetFeatures`
- **THEN** at least some feature hexes SHALL be placed at different coordinates

#### Scenario: Features form clusters, not uniform noise

- **GIVEN** a directive with `clusterSize = 4` and density `0.25`
- **WHEN** `generateTerrain` runs
- **THEN** the directive's hexes SHALL be grouped into contiguous clusters rather than scattered uniformly across the grid

### Requirement: Feature Application Pass

The feature-application pass SHALL run after base biome generation and overlay directive features onto the generated grid. Directives SHALL be applied in a fixed order independent of their order in `presetFeatures` — natural features (`Woods`, `Water`, `Rough`) first, then `Building`, then `Road`, then `Pavement` auto-fill — so that structures override natural terrain deterministically.

#### Scenario: Structures override natural terrain

- **GIVEN** a `presetFeatures` list containing both a `HeavyWoods` directive and a `Building` directive whose clusters would overlap
- **WHEN** `generateTerrain` runs
- **THEN** hexes in the overlap region SHALL be `Building`, not `HeavyWoods`

#### Scenario: Application order is independent of directive order

- **GIVEN** two configs with the same directives listed in different orders
- **WHEN** both run with the same seed
- **THEN** the two grids SHALL be identical

### Requirement: Structure Placement

The feature-application pass SHALL place structural terrain so that generated maps contain coherent built environments. `Building` directives SHALL stamp rectangular footprints of 1–4 hexes. `Road` directives SHALL trace a connected path of `Road` hexes between two map edges. `Pavement` SHALL auto-fill natural hexes orthogonally adjacent to `Building` hexes. On a grid too small to trace a road, the `Road` directive SHALL be skipped without error.

#### Scenario: Industrial preset produces buildings and roads

- **GIVEN** a generation config using the `INDUSTRIAL_COMPLEX` preset's directives
- **WHEN** `generateTerrain` runs
- **THEN** the grid SHALL contain `Building` hexes grouped as footprints
- **AND** the grid SHALL contain a connected run of `Road` hexes reaching two map edges

#### Scenario: Pavement surrounds buildings

- **GIVEN** a generated grid containing `Building` hexes
- **WHEN** structure placement completes
- **THEN** natural hexes orthogonally adjacent to a `Building` hex SHALL be `Pavement`

#### Scenario: Road tracing skipped on a tiny grid

- **GIVEN** a 2×2 generation grid with a `Road` directive
- **WHEN** `generateTerrain` runs
- **THEN** generation SHALL complete without error
- **AND** the `Road` directive SHALL be skipped

### Requirement: Preset Map Distinctness

Two different presets generated at the same seed, width, height, and biome SHALL produce measurably different terrain. A terrain-type histogram of one preset's grid SHALL differ from the other's beyond a defined tolerance, so that no two distinct presets yield statistically identical maps.

#### Scenario: Sparse and dense forest presets differ

- **GIVEN** the `LIGHT_FOREST` and `DENSE_FOREST` presets generated at the same seed, dimensions, and biome
- **WHEN** both grids are generated
- **THEN** their `LightWoods` + `HeavyWoods` hex fractions SHALL differ beyond tolerance

#### Scenario: Open and industrial presets differ

- **GIVEN** the `OPEN_PLAINS` and `INDUSTRIAL_COMPLEX` presets generated at the same seed, dimensions, and biome
- **WHEN** both grids are generated
- **THEN** their terrain-type histograms SHALL differ beyond tolerance
- **AND** only the `INDUSTRIAL_COMPLEX` grid SHALL contain `Building` hexes
