# Change: Add AI Terrain-Aware Movement

## Why

`MoveAI.scoreMove` (`src/simulation/ai/MoveAI.ts`) scores a candidate move on line-of-sight to enemies, a forward-arc bonus, a closing-distance penalty, and a small raw heat penalty — but it is blind to **how much it costs to get there** and **what protects the unit once there**. `getValidMoves` calls `getValidDestinations`, which already accounts for movement-point cost, yet the scorer treats a hex reached by walking through open ground and a hex reached by clawing through heavy woods as equivalent. `getTerrainMovementCost` and `getTerrainCoverLevel` exist only inside `src/components/gameplay/HexMapDisplay/renderHelpers.ts` — a rendering module the simulation layer must not import. The bot also never seeks partial cover, never prefers a destination that breaks an enemy's LOS, and exposes no difficulty knob, so every bot plays at one fixed depth.

This change gives the bot a terrain-cost-aware pathfinder and cover/LOS-aware move scoring, extracts the terrain-cost helper into a shared simulation utility, and introduces the **AI Difficulty Tier Registry** — the player-selectable depth control that every later Wave 2 AI change registers its own parameters into.

## What Changes

- ADDED a shared `getTerrainMovementCost` simulation utility (`src/utils/gameplay/terrainMovementCost.ts`); `renderHelpers.ts` re-exports from it so no rendering import leaks into the sim layer
- ADDED `AITerrainPathfinder` — a deterministic terrain-cost pathfinder that computes the cheapest legal path to a destination using per-hex movement cost, returning total MP spent and the hex sequence
- ADDED terrain-aware move scoring: `scoreMove` gains a cover-seeking term (partial cover at the destination), an LOS-denial term (destination breaks the highest-threat enemy's LOS), and a terrain-cost efficiency term that prefers cheaper paths to equivalent positions
- ADDED the **AI Difficulty Tier Registry** — a named registry (`Green`, `Regular`, `Veteran`, `Elite`) mapping each tier to a frozen parameter set; the player picks a tier per scenario and the bot reads its scoring weights from the selected tier
- ADDED `IAITierParameters` movement parameters: cover weight, LOS-denial weight, terrain-cost weight, and a `pathfinderEnabled` flag (lower tiers may run the legacy straight-line scorer)
- ADDED a frozen pathfinder API contract (see `design.md` D2) so A2/A3a/A3b/A4 can depend on a stable signature

## Dependencies

- **Requires**: Wave 1 `add-procedural-map-variety` and `add-scenario-objective-engine` — terrain feature variety and the objective/terrain surface the pathfinder reasons over
- **Required By**: `add-ai-resource-planning` (A2), `add-ai-coordination-tactics` (A3a), `add-ai-objective-awareness` (A3b), `add-ai-advanced-systems` (A4) — all consume the pathfinder API and register their parameters into the Tier Registry

## Impact

- Affected specs: `simulation-system` (ADDED requirements only)
- Affected code: `src/simulation/ai/MoveAI.ts` (scoring terms), `src/simulation/ai/types.ts` (`IAITierParameters`, tier on `IBotBehavior`), `src/simulation/ai/behaviorVariants.ts` (variants resolve a tier), new `src/simulation/ai/AITierRegistry.ts`, new `src/simulation/ai/AITerrainPathfinder.ts`, new `src/utils/gameplay/terrainMovementCost.ts`, `src/components/gameplay/HexMapDisplay/renderHelpers.ts` (re-export)
- No database migrations — tier selection serializes with the game session config
- Reproducibility preserved: pathfinding and scoring are pure deterministic functions of grid + unit state; ties break through the existing `SeededRandom` discipline

## Non-Goals

- Multi-turn movement planning — A1 scores a single turn's move; multi-turn lookahead is A2 (heat) and A3a (coordination)
- Jump-jet tactical pathing — jump-specific movement is A4
- Objective-seeking movement — the bot reading objective markers to choose where to go is A3b
- Pathfinder caching or incremental replanning — A1 recomputes per turn; performance tuning is deferred
