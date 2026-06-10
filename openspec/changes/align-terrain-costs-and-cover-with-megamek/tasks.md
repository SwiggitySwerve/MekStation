# Tasks: Align Terrain Costs and Cover with MegaMek

## 1. Implementation

- [x] 1.1 `TERRAIN_PROPERTIES` sand/mud/snow/ice/swamp rows corrected to MegaMek per-motive cells (C-3)
- [x] 1.2 `getTerrainFeatureMovementCostModifier` level-aware accessor added (ultra rough level 2, ultra rubble level 6, deep snow level 2) and AI pathfinder helpers routed through it (C-3)
- [x] 1.3 `getMovementStepCostBreakdown` sums entry costs across all non-water features with pavement/road/bridge bypass and per-feature Mountaineer relief (C-4)
- [x] 1.4 Swamp removed from `TARGET_HEX_PARTIAL_COVER_TERRAINS`; swamp `coverLevel` set to `None`; Rubble deliberately not added (MegaMek LosEffects grants no rubble cover) (C-7)
- [x] 1.5 Support catalog descriptions updated (`terrain-movement-costs`, terrain movement properties source ref)

## 2. Tests

- [x] 2.1 Red-first behavior tests for per-motive swamp/mud/sand/ice/snow costs, ultra rough/rubble levels, multi-feature summing, and road-surface bypass
- [x] 2.2 Red-first accessor tests for `getTerrainFeatureMovementCostModifier`
- [x] 2.3 Red-first cover tests: swamp grants no partial cover (terrainCover unit + runner AttackDeclared behavior)
- [x] 2.4 Existing tests pinning pre-fix values updated with C-3/C-4/C-7 citations (TerrainTypes.test.ts, terrainCover.test.ts, reachable.test.ts, InteractiveSession.movement.scenario.test.ts)
- [x] 2.5 Movement, terrain, cover, to-hit, runner, and engine scenario suites green

## 3. Spec Delta

- [x] 3.1 MODIFIED `terrain-system` "Movement Cost by Terrain" — sand wheeled scenario corrected (+2 -> +1); per-motive swamp/hover/sand/ice scenarios added
- [x] 3.2 MODIFIED `terrain-system` "Cover Levels" — swamp grants no cover scenario added (C-7)
- [x] 3.3 MODIFIED `terrain-system` "Terrain Feature Stacking" — multi-feature entry-cost summing scenario with pavement bypass added (C-4)
- [x] 3.4 `npx openspec validate align-terrain-costs-and-cover-with-megamek --strict` and `npx openspec validate --all --strict` pass
