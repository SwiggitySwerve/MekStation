# Design: Add AI Terrain-Aware Movement

## Context

The bot's movement scorer is competent at the 1v1 "see and shoot" level but plays on a featureless plain. `MoveAI.scoreMove` weighs LOS, a forward-arc bonus, closing distance, and raw move heat; it never asks whether the destination hex offers cover, whether ending there denies an enemy's LOS, or whether a cheaper path reaches an equally good position. Terrain cost (`getTerrainMovementCost`) and cover (`getTerrainCoverLevel`) are already computed — but only inside `HexMapDisplay/renderHelpers.ts`, a rendering module the simulation layer is forbidden to import. `getValidDestinations` enforces MP budget but yields a flat set of reachable hexes with no notion of *which path* was cheapest.

This change is the foundation of Wave 2. Beyond terrain-aware scoring it introduces the **AI Difficulty Tier Registry** — the single mechanism that makes "best-possible AI" shippable incrementally. Each later Wave 2 change (A2 resource planning, A3a coordination, A3b objectives, A4 advanced systems) ADDs its own parameter block to the registry rather than rewriting A1's. Tiers are player-facing: `Green`/`Regular` run shallow, `Veteran` adds A1+A2 depth, `Elite` adds A3+A4.

## Goals / Non-Goals

**Goals:**

- Extract `getTerrainMovementCost` into a shared sim utility so the AI can consult terrain cost without importing rendering code.
- Give the bot a deterministic terrain-cost pathfinder with a stable, frozen API that every later Wave 2 change can depend on.
- Add cover-seeking and LOS-denial terms to move scoring so the bot uses terrain defensively.
- Stand up the AI Difficulty Tier Registry as an all-ADDED, never-MODIFIED extension point.

**Non-Goals:**

- Multi-turn movement lookahead, jump-jet pathing, objective-seeking movement (A2/A3a/A3b/A4).
- Pathfinder performance optimization (caching, incremental replan).

## Decisions

### D1. Extract `getTerrainMovementCost` into `src/utils/gameplay/terrainMovementCost.ts`

`getTerrainMovementCost` and its dependency `getPrimaryTerrainFeature` move to a new pure utility module under `src/utils/gameplay/`. `renderHelpers.ts` re-exports both so existing rendering callers are untouched. The simulation layer imports only from the new module — no rendering dependency leaks into `src/simulation/`.

### D2. Frozen pathfinder API contract

The pathfinder API is frozen here so A2/A3a/A3b/A4 author against a stable signature. A1 MUST ship exactly this surface:

```typescript
/** A single legal path from origin to a destination hex. */
interface IAIPath {
  readonly destination: IHexCoordinate;
  /** Ordered hexes from origin (exclusive) to destination (inclusive). */
  readonly hexes: readonly IHexCoordinate[];
  /** Total movement points consumed along the path. */
  readonly totalMpCost: number;
  /** True when every hex on the path was within the MP budget. */
  readonly reachable: boolean;
}

interface IAIPathfindRequest {
  readonly grid: IHexGrid;
  readonly origin: IHexCoordinate;
  readonly destination: IHexCoordinate;
  readonly movementType: MovementType;
  readonly capability: IMovementCapability;
}

/**
 * Deterministic cheapest-path search over per-hex terrain movement cost.
 * Pure: identical request => identical IAIPath. Returns `reachable:false`
 * with a best-effort partial path when the destination exceeds the budget.
 */
function findPath(request: IAIPathfindRequest): IAIPath;

/**
 * Cheapest path to every reachable destination in one pass. Keyed by the
 * canonical "q,r" hex string. Used by scoreMove to avoid N separate searches.
 */
function findAllPaths(
  grid: IHexGrid,
  origin: IHexCoordinate,
  movementType: MovementType,
  capability: IMovementCapability,
): ReadonlyMap<string, IAIPath>;
```

Implementation is uniform-cost (Dijkstra) search over hex neighbors with edge weight = `getTerrainMovementCost(destinationHexTerrain)`. Tie-break between equal-cost paths is the canonical hex-neighbor order so the result is deterministic without consuming `SeededRandom`.

### D3. AI Difficulty Tier Registry

A new `AITierRegistry.ts` exposes a frozen `Record<AITierName, IAITierParameters>` where `AITierName = 'Green' | 'Regular' | 'Veteran' | 'Elite'`. `IAITierParameters` is an open interface: A1 defines the movement block; A2/A3a/A3b/A4 each ADD their own block (resource, coordination, objective, advanced). Registration is **additive only** — no later change MODIFIES A1's requirement or the existing parameter fields. The registry exports `getTierParameters(name)` (throws on unknown, mirroring `getBehaviorVariant`).

```typescript
type AITierName = 'Green' | 'Regular' | 'Veteran' | 'Elite';

interface IAITierMovementParameters {
  readonly pathfinderEnabled: boolean;
  readonly coverWeight: number;
  readonly losDenialWeight: number;
  readonly terrainCostWeight: number;
}

interface IAITierParameters {
  readonly tier: AITierName;
  readonly movement: IAITierMovementParameters;
  // A2..A4 ADD: resource?, coordination?, objective?, advanced? blocks.
}
```

`IBotBehavior` gains an optional `tier?: AITierName` (default `'Regular'`). `behaviorVariants.ts` presets map onto tiers (`default`→`Regular`, `aggressive`→`Veteran`, etc.) so existing callers keep working.

### D4. Tiered scoring — lower tiers run the legacy scorer

`Green` and `Regular` set `pathfinderEnabled: false` and zero the new weights, so they reproduce today's straight-line scorer byte-for-byte (legacy determinism preserved). `Veteran` and `Elite` enable the pathfinder and the new terms. This is how "best-possible AI" ships incrementally without regressing the baseline bot.

### D5. New scoring terms in `scoreMove`

When `pathfinderEnabled`, `scoreMove` adds three terms, each multiplied by its tier weight:

- **Cover term** — `+coverWeight` when the destination hex's `getTerrainCoverLevel` is partial-or-better.
- **LOS-denial term** — `+losDenialWeight` when the destination breaks `calculateLOS` from the highest-threat enemy (when `highestThreatTarget` is supplied).
- **Terrain-cost term** — `-terrainCostWeight * (pathMpCost - hexDistance)` so a destination reached by a wasteful path scores below an equivalent destination reached cheaply.

All terms are additive over the existing scorer; the existing LOS/arc/distance/heat terms are unchanged. Determinism: same grid + unit + tier → same score; ties still break via `SeededRandom`.

### D6. Pathfinder is consulted once per move evaluation

`MoveAI.selectMove` calls `findAllPaths` once, then `scoreMove` reads each destination's path from the returned map. No per-move search. Keeps the per-turn cost a single Dijkstra pass.

## Risks / Trade-offs

- **[Risk] Re-export cycle between `terrainMovementCost.ts` and `renderHelpers.ts`** → Mitigation: the new module imports nothing from `renderHelpers.ts`; the dependency is one-directional (renderHelpers re-exports the new module).
- **[Risk] A later Wave 2 change MODIFIES A1's Tier Registry requirement, breaking the all-ADDED rule** → Mitigation: `IAITierParameters` blocks are optional and additive; each change ADDs a separate requirement; the registry merges blocks by key.
- **[Risk] Pathfinder changes the bot's chosen hex and breaks SimulationRunner determinism golden tests** → Mitigation: `Green`/`Regular` keep `pathfinderEnabled:false` and reproduce the legacy scorer exactly; golden traces run on the legacy tier; new behavior is asserted on `Veteran`/`Elite`.
- **[Trade-off] Dijkstra per turn is O(hexes·log hexes)** — acceptable at current map sizes; caching is a deferred non-goal.

## Migration Plan

Purely additive. `IBotBehavior.tier` is optional and defaults to `'Regular'`, which runs the legacy scorer — every existing bot, test fixture, and the swarm harness behave identically until a caller opts into `Veteran`/`Elite`. The `getTerrainMovementCost` extraction is a pure move plus a re-export; no call site changes. No database migrations — tier selection lives in the game-session config. Rollback = revert the change-set; the registry and pathfinder become dead code with no behavior change.

## Open Questions

- Default tier for player-vs-bot scenarios — proposed `Regular`; the scenario UI exposes the picker. Revisit once tiers A2–A4 are populated.
- Whether `Elite` should always enable the pathfinder even before A3/A4 ship — proposed yes; `Elite` is the top tier and accumulates depth as later changes land.
