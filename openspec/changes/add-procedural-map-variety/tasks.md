# Tasks: Add Procedural Map Variety

## 1. Config and Directive Types

- [x] 1.1 Add `IFeatureDirective` and an optional `presetFeatures` field to `TerrainGeneratorConfig` in `src/utils/gameplay/terrainGenerator.ts`
- [x] 1.2 Map `IMapPreset.features` to `IFeatureDirective[]`; confirm all 17 presets in `mapPresets.ts` map without loss
- [x] 1.3 Tests for the directive type and full preset-mapping coverage

## 2. Deterministic Feature Clustering

- [x] 2.1 Implement seeded cluster-origin derivation (`K` origins drawn from the generation `SeededRandom`)
- [x] 2.2 Implement seeded flood-fill cluster growth to the target `clusterSize`
- [x] 2.3 Tests: same seed yields identical clusters; different seed yields different clusters; realized density is within tolerance of the directive

## 3. Feature Application Pass

- [x] 3.1 Implement `applyPresetFeatures(grid, directives, rng)` as an overlay run after base biome generation
- [x] 3.2 Apply directives in the fixed order — natural features, then buildings, then roads, then pavement auto-fill
- [x] 3.3 Tests: the base biome generation requirements still hold; the overlay is deterministic; omitting `presetFeatures` yields output identical to base generation

## 4. Structure Placement

- [x] 4.1 Implement building footprint stamping (rectangular 1–4 hex blocks at seeded positions)
- [x] 4.2 Implement road path tracing between a seeded pair of map edges
- [x] 4.3 Implement pavement auto-fill on natural hexes orthogonally adjacent to building hexes
- [x] 4.4 Tests: buildings, roads, and pavement appear for the industrial and urban presets; a traced road connects edge to edge; tiny grids skip road tracing without error

## 5. Generator Wiring

- [x] 5.1 Pass `selectMapPreset()` output into `generateTerrain` from `ScenarioGeneratorService` and `ScenarioGenerator`
- [x] 5.2 Record the originating `presetId` on the generated map
- [x] 5.3 Tests: scenario generation consumes the selected preset; `presetId` round-trips through serialization

## 6. Distinctness and Verification

- [x] 6.1 Distinctness test: `LIGHT_FOREST` vs `DENSE_FOREST` at the same seed produce terrain histograms differing beyond tolerance
- [x] 6.2 Distinctness test: `OPEN_PLAINS` vs `INDUSTRIAL_COMPLEX` at the same seed produce terrain histograms differing beyond tolerance
- [x] 6.3 `openspec validate --strict` clean; build, lint, and typecheck pass
