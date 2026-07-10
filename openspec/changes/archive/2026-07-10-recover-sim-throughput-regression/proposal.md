# Proposal: recover-sim-throughput-regression

## Why

A CPU-profile-backed investigation (baseline `7de770fb4^` vs current `main`, identical 80-run swarm-throughput workload) confirmed a **+42% simulation slowdown**: measured per-run cost rose from a 59.5–68.0 ms/run baseline band to 95–105 ms/run on current, and total `src/` self-CPU grew 5.07s → 7.90s (+56%) for the same 80 runs. This matches the reported +42% nightly slowdown.

The profiles **overrule the statically-suspected sites** (`calculateToHit` / PSR / event-creator normalization) — those are cold on both sides for this movement-dominated workload and are explicitly out of scope. The regression is localized to the AI movement / pathfinding inner loop, introduced by the `7de770fb4` decomposition sweep, via three mechanisms:

1. **Per-hex-step heap allocation.** `getMovementStepCostBreakdown` was decomposed into helpers that each take a freshly-built options object and some return fresh result objects (~6 heap allocations per hex-step where the pre-commit code used inline locals). This sits in the hottest loop in the sim: A* neighbor expansion under a full `findPath` per candidate destination in `MoveAI` (`getValidMoveCandidates` roots ~90% of all `src/` time on current).
2. **Per-call terrain-string re-parsing.** `terrainFeaturesFromString` re-parses terrain from its string encoding per hex per step-cost evaluation, allocating a fresh `Object.values(TerrainType)` array + linear `.includes()` each call. It was already the #1 self-time function at baseline (0.97s → 1.58s current, +63%) — a pre-existing hotspot amplified because the extracted `summarizeMovementTerrain` now invokes it per step.
3. **Lazy re-export getter indirection on the hot enum barrels.** The decomposition routes `TerrainType` through two wildcard `export *` hops (`TerrainTypeDefinitions.ts` → `TerrainTypes.ts` → `index.ts`); each wildcard hop transpiles to a lazy property getter, so every enum access inside the inner loop now trampolines through a getter instead of a static binding (baseline 0.12s → current 0.57s, **+363% — the largest relative regression in the profile**).

`findPath` itself is byte-identical pre/post commit; its measured inflation (0.78s → 1.13s, +45%) is downstream GC / lost-inlining pressure from the allocation-heavy callee path, and it recovers automatically once the callees stop allocating.

This is a **recovery** change: it removes the regression at its source with three minimal, profile-directed fixes. It does not restructure the decomposition, rename the extracted helpers, touch `findPath`, or widen any perf budget.

## What Changes

- **De-allocate the movement step-cost helpers** (`src/utils/gameplay/movement/calculations.ts` + `movementStepCost.ts`). Keep the extracted functions and their names / tests; change their signatures from per-call options objects to positional parameters returning primitives (or one caller-hoisted reusable result object), removing the ~6 per-hex-step allocations (`calculations.ts:113/:114/:141/:148/:180`; `movementStepCost.ts` `summarizeMovementTerrain` `:39/:59`, `movementElevationStepCost` `:95/:191`). Restores the pre-commit zero-allocation-per-hex-step property without re-inlining.
- **Memoize `terrainFeaturesFromString`** (`src/utils/gameplay/terrainEncoding.ts:34`) with a module-level `Map<string, readonly ITerrainFeature[]>` keyed on the encoding string, returning `Object.freeze`'d arrays, and hoist `Object.values(TerrainType)` into a module-level `Set` for O(1) membership. Terrain encodings are a small closed set per board, so the cache is bounded; because the parse was hot even at baseline, this may land **net-faster than pre-regression**.
- **Restore static bindings on the hot enum re-export path.** Replace the wildcard `export *` re-export of the hot `TerrainType` symbols with a direct static named re-export in `src/types/gameplay/TerrainTypes.ts` (and correspondingly `src/types/gameplay/index.ts`), OR — the lower-risk variant if the wildcard is load-bearing for a circular-init cycle — point the two hottest consumers (`terrainEncoding.ts`, `movementStepCost.ts`) at the defining module `@/types/gameplay/TerrainTypeDefinitions` directly, bypassing the barrel getter.

## Scope

### In

- `simulation-system` — ADDED "Simulation Throughput Stays Within Budget" requirement (regression-guard budget contract at CI perf-smoke + nightly full-scale; no budget widening).
- Source edits to the six profile-named files (three fixes), preserving the decomposition structure and helper names.
- Jest coverage: the existing movement / terrain suites as G1 QA (unchanged behavior), a new cache-correctness test for the memoization, typecheck as the barrel gate, and a before/after per-run perf measurement of the swarm-throughput workload as the acceptance proof.

### Out (Non-goals)

- **No architectural rewrites.** The extracted-helper decomposition stays; helper names and tests are preserved. No re-inlining back into a monolith.
- **`findPath` is NOT touched.** Its code is unchanged pre/post commit and recovers from reduced GC pressure once the callees stop allocating.
- **The cold static suspects** (`calculateToHit` 7-array spread-merge, PSR / event-creator normalization, c3, crit resolvers) are **excluded** — profiles show them cold on this workload. They are real code-shape debt that MAY matter in attack-heavy nightly scenarios; re-measure after the movement fixes land before touching them (do not pre-emptively refactor on static evidence alone).
- **No test budget widening.** This change RECOVERS perf; the perf-smoke and nightly `SWARM_THROUGHPUT_*` budgets stay exactly as-is.
- **The fixed jest module-load overhead** the sweep also inflated (one-time `readFileUtf8` / `open` cold-start cost) is a separate, lower-priority concern and is not addressed here.

## Impact

- **Affected specs**: `simulation-system` (ADDED "Simulation Throughput Stays Within Budget").
- **Affected code** (profile-named — the worker confirms exact current-tree line numbers before editing):
  - `src/utils/gameplay/movement/calculations.ts`
  - `src/utils/gameplay/movement/movementStepCost.ts`
  - `src/utils/gameplay/terrainEncoding.ts`
  - `src/types/gameplay/TerrainTypes.ts`
  - `src/types/gameplay/index.ts`
  - `src/utils/gameplay/movement/pathfinding.ts` (READ-ONLY — verify unchanged; recovers as a side effect)
- **Risk**: medium. The three risks that need care — dual-mode call-site migration on the step-cost helpers, memoization aliasing (return frozen arrays), and TDZ / circular-init on the barrel change — are detailed in `design.md`. Every fix is gated by a full unit run, not just the swarm test, and by a before/after per-run perf measurement on the same machine.
- **Expected recovery**: ~80–100% of the +42% per-run regression (per-run cost from ~95–105 ms back to ~60–70 ms/run), with the terrain memoization potentially landing net-faster than baseline. Nightly (1,000-run) recovery should exceed the smaller-batch measurement as the fixed module-load overhead amortizes away while the per-run loop savings scale.
