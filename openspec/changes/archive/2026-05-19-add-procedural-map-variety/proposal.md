# Change: Add Procedural Map Variety

## Why

`src/constants/scenario/mapPresets.ts` defines 17 map presets (`LIGHT_FOREST`, `DENSE_FOREST`, `INDUSTRIAL_COMPLEX`, `OPEN_PLAINS`, …) each declaring terrain-feature density and cluster-size configs. `generateTerrain()` ignores them entirely — `TerrainGeneratorConfig` accepts only `width`, `height`, `biome`, and `seed`, and terrain selection runs purely on the hardcoded `BIOME_WEIGHTS`. Every "procedurally generated" map of a given biome is therefore statistically identical, and the 17 presets are dead code.

This change wires preset feature directives into the generator as a post-pass overlay so generated battle maps actually differ — clustered woods, building blocks, road networks — making "scenarios fully generated on a battle map" deliver genuinely varied terrain.

## What Changes

- ADDED `presetFeatures` on `TerrainGeneratorConfig`: an ordered list of feature-placement directives (feature type, density, cluster size)
- ADDED a feature-application pass that runs after base biome generation and overlays clustered features deterministically
- ADDED a feature-clustering algorithm: seeded cluster origins grown to a target cluster size, entirely from the generation seed
- ADDED structure placement: buildings as footprint blocks, roads as connected paths between two map edges, pavement auto-filled around buildings
- ADDED a preset-distinctness guarantee: two different presets at the same seed and biome SHALL produce measurably different terrain distributions

## Dependencies

- **Requires**: `terrain-generation` (existing source-of-truth — this change adds requirements to it)
- **Requires**: `terrain-system` (the `TerrainType` enum — `Building`, `Road`, `Pavement`, `Rubble` already defined)
- **Required By**: none

## Impact

- Affected specs: `terrain-generation` (added requirements)
- Affected code: `src/utils/gameplay/terrainGenerator.ts`, `src/services/generators/ScenarioGeneratorService.ts`, `src/simulation/generator/ScenarioGenerator.ts`, `src/constants/scenario/mapPresets.ts` (presets become consumed rather than dead)
- No new event types; no database migrations
- Reproducibility preserved: feature placement is fully seeded — identical seed + preset yields identical maps, so multiplayer map sync still requires no terrain transmission

## Non-Goals

- New terrain types — works with the existing `TerrainType` enum only
- Real-time terrain modification (fire spread, building collapse) — out of scope per the `terrain-generation` spec
- Hand-authored or imported MegaMek board files — procedural generation only
- Biome weight rebalancing — base biome generation and `BIOME_WEIGHTS` are unchanged
