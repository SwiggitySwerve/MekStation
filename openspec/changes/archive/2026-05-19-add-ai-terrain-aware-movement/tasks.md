# Tasks: Add AI Terrain-Aware Movement

## 1. Extract Shared Terrain-Cost Utility

- [x] 1.1 Create `src/utils/gameplay/terrainMovementCost.ts` exporting `getTerrainMovementCost` and `getPrimaryTerrainFeature`, moved verbatim from `src/components/gameplay/HexMapDisplay/renderHelpers.ts`
- [x] 1.2 Re-export both functions from `renderHelpers.ts` so existing rendering call sites are untouched
- [x] 1.3 Confirm no `src/simulation/` import resolves into `src/components/` — the sim layer imports only the new utility
- [x] 1.4 Unit tests for the extracted utility (open ground = 1 MP, heavy woods > 1, deterministic for a given terrain)

## 2. AI Difficulty Tier Registry

- [x] 2.1 Create `src/simulation/ai/AITierRegistry.ts` with `AITierName` (`Green` | `Regular` | `Veteran` | `Elite`), `IAITierParameters`, and `IAITierMovementParameters`
- [x] 2.2 Define the frozen tier table — `Green`/`Regular` set `pathfinderEnabled: false` with zeroed weights; `Veteran`/`Elite` enable the pathfinder with tuned weights
- [x] 2.3 Export `getTierParameters(name)` that throws an explicit error on an unknown tier name (mirror `getBehaviorVariant`)
- [x] 2.4 Add optional `tier?: AITierName` to `IBotBehavior` (default `Regular`) and map each `behaviorVariants.ts` preset onto a tier
- [x] 2.5 Tests: every tier resolves; unknown tier throws; `Green`/`Regular` parameters yield zero scoring delta vs. the legacy scorer

## 3. Terrain-Cost Pathfinder

- [x] 3.1 Create `src/simulation/ai/AITerrainPathfinder.ts` implementing the frozen API contract from `design.md` D2 (`IAIPath`, `IAIPathfindRequest`, `findPath`, `findAllPaths`)
- [x] 3.2 Implement uniform-cost (Dijkstra) search over hex neighbors with edge weight = `getTerrainMovementCost`, tie-broken by canonical neighbor order
- [x] 3.3 `findPath` returns `reachable: false` with a best-effort partial path when the destination exceeds the MP budget
- [x] 3.4 `findAllPaths` returns the cheapest path to every reachable destination keyed by the canonical `"q,r"` string in a single pass
- [x] 3.5 Tests: cheapest path avoids costly terrain; identical request → identical path; unreachable destination flagged; `findAllPaths` agrees with per-destination `findPath`

## 4. Terrain-Aware Move Scoring

- [x] 4.1 In `MoveAI.selectMove`, call `findAllPaths` once and pass each destination's `IAIPath` into `scoreMove`
- [x] 4.2 Add the cover term to `scoreMove` — `+coverWeight` when the destination hex offers partial-or-better cover
- [x] 4.3 Add the LOS-denial term — `+losDenialWeight` when the destination breaks the highest-threat enemy's line of sight
- [x] 4.4 Add the terrain-cost term — `-terrainCostWeight * (pathMpCost - hexDistance)` so wasteful paths score lower
- [x] 4.5 Gate all three terms on `tier.movement.pathfinderEnabled`; when disabled, `scoreMove` output is byte-identical to today's
- [x] 4.6 Tests: a `Veteran` bot prefers a partial-cover hex over an equal-LOS open hex; an LOS-breaking hex outscores an exposed equal-cost hex; a `Regular` bot reproduces the legacy choice

## 5. Verification

- [x] 5.1 Integration test: a `Veteran` bot on a map with woods routes around open ground into cover; the same scenario on `Regular` takes the straight line
- [x] 5.2 Determinism test: SimulationRunner golden traces on the legacy (`Regular`) tier are byte-identical to pre-change traces
- [x] 5.3 `npx openspec validate add-ai-terrain-aware-movement --strict` reports valid
- [x] 5.4 Build, lint, and typecheck pass
