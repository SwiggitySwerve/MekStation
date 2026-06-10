# Proposal: Align Terrain Costs and Cover with MegaMek

## Why

Audit 2026-06-09 findings C-3 (high), C-4 (medium), and C-7 (high) confirmed three MegaMek rules divergences in the terrain layer, and for C-3/C-7 the terrain-system spec itself encodes the wrong values (council Bucket-3 spec-locked findings):

- C-3: the static `TERRAIN_PROPERTIES` entry-cost table charged every motive the same flat value. MegaMek `Terrain.movementCost` is per-motive and per-level: swamp is base 2 but 1 for biped/quad meks and 0 for hover/WiGE; sand charges +1 only to non-dune-buggy wheeled vehicles (meks/tracked/hover pay 0); mud exempts hover/WiGE/naval; ice charges 1 to everything except hover/WiGE; level-1 snow charges wheeled only while level-2 snow charges all motives except hover/WiGE; ultra rough (level 2) and ultra rubble (level 6) cost 2 instead of 1.
- C-4: `getMovementStepCostBreakdown` charged only the primary (highest-layer) terrain feature. MegaMek `Hex.movementCost` sums `Terrain.movementCost` over every terrain in the hex; `MoveStep` skips the sum only when moving along a pavement/road/bridge surface ("Account for terrain, unless we're moving along a road").
- C-7: `TARGET_HEX_PARTIAL_COVER_TERRAINS` granted swamp target-hex partial cover (+1 to-hit and leg-hit conversion). MegaMek grants no swamp cover — `LosEffects` has no swamp cover source — and the to-hit-resolution spec's own Partial Cover Modifier list (level-1 hill, building, depth-1 water, rubble) never included swamp.

## What Changes

- `TERRAIN_PROPERTIES` rows for sand, mud, snow, ice, and swamp carry MegaMek-correct per-motive cells; swamp `coverLevel` becomes `None`.
- New `getTerrainFeatureMovementCostModifier(feature, movementType)` accessor applies the level-dependent branches (ultra rough/rubble, deep snow) on top of the table; the AI pathfinder helpers route through it.
- `getMovementStepCostBreakdown` sums the entry costs of every non-water feature in the hex (water keeps its separate depth surcharge), bypassing the sum on pavement/road/bridge surfaces; Terrain Master: Mountaineer relief applies per rough/rubble feature.
- Swamp is removed from `TARGET_HEX_PARTIAL_COVER_TERRAINS` (Building stays). Rubble is NOT added despite appearing in the to-hit-resolution spec's cover list: MegaMek `LosEffects` grants no rubble cover; that spec-text divergence is out of this slice.
- Existing tests pinning the flat table, the primary-feature lookup, or swamp cover are corrected with C-3/C-4/C-7 citations; new red-first tests lock the per-motive, per-level, multi-feature, and no-swamp-cover behavior.
- **BREAKING (spec)**: `terrain-system` requirements "Movement Cost by Terrain" (sand wheeled scenario corrected to +1; per-motive scenarios added), "Cover Levels" (swamp grants no cover), and "Terrain Feature Stacking" (multi-feature summing with pavement bypass) are corrected. The legacy "Terrain Properties Table" reference section of the spec sits outside the `## Requirements` section and cannot be reached by the delta mechanic; the requirement scenarios above are the binding contract.

## Impact

- Affected specs: `terrain-system` (3 MODIFIED requirements)
- Affected code: `src/types/gameplay/TerrainTypes.ts`, `src/utils/gameplay/terrainMovementCost.ts`, `src/utils/gameplay/movement/calculations.ts`, `src/utils/gameplay/terrainCover.ts`, support catalogs in `src/simulation/runner/CombatRuleSupport.ts` and `CombatTerrainEnvironmentSupport.ts`
- Affected consumers (all route through the shared helpers, verified): movement validation/reachability/pathfinding/commit validation, interactive session movement and attack cover, combat projection cover, simulation-runner weapon-attack cover and movement phase, AI move scorer cover term and terrain-cost pathfinder
