# Change: Add Encounter Swarm Harness

## Why

MekStation already ships every load-bearing piece needed to swarm-test encounters: a headless `SimulationRunner` + `BatchRunner`, a complete `BotPlayer` AI driving both sides via `AttackAI` / `MoveAI` / `RetreatAI`, a `QuickResolveService` that already runs up to 5,000 in-browser Monte Carlo iterations, an `IEncounter` system with `IOpForConfig` (BV budget / era / faction / `pilotSkillTemplate`), 16 terrain types with movement / to-hit / cover / LOS / heat properties, a 4,196-unit canonical catalog, and an `IPilot` 3-store split that already binds pilots to mechs through `IForce.assignments[]`. What is missing is the **plumbing** that lets a CLI-driven swarm of sequential simulations consume the real catalog with **randomized Pilot + Mech pairings** and pit codified AI variants against one another so the bot can be tuned through head-to-head testing.

Five concrete blockers exist:

1. **Pilot skills are silently dropped at simulation time.** `src/simulation/runner/SimulationRunnerSupport.ts:134` hardcodes `gunnery: DEFAULT_GUNNERY` instead of reading the unit's actual gunnery — randomized pilots are meaningless until this is fixed.
2. **`CanonicalUnitService` is fetch-only.** Bare Node CLI cannot load real catalog units; `adaptUnit()` returns `null` silently.
3. **`BotPlayer` has no `IAIPlayer` interface.** `SimulationRunner.ts:61` directly news up `BotPlayer` with no injection seam — alternative AI variants cannot be plugged in.
4. **No per-chassis / per-pilot aggregation.** `MetricsCollector` outputs are side-aggregate only; chassis-vs-chassis matrix and gunnery-bracket rollups do not exist.
5. **No CLI-callable random force / pilot generator.** `IOpForConfig` scaffolding generates ONE opposing force per encounter, not N pairings consumable by a swarm.

This change closes all five blockers in six phases distributed across existing specs — no new spec is created. Worker-thread parallelism, biome generator wiring, and LLM-driven AI variants are explicitly deferred (Phase 7) and tracked as follow-ups.

## What Changes

- **Phase 1 (BLOCKING)**: `toAIUnitState()` and any companion AI helpers in `MoveAI` / `AttackAI` / `RetreatAI` SHALL read pilot `gunnery` / `piloting` from `IUnitGameState` rather than hardcoded defaults. `createInitialState()` and `createMinimalUnitState()` SHALL propagate pilot skills from `IGameUnit` end-to-end. Synthetic-unit fallback constants (`DEFAULT_GUNNERY = 4`, `DEFAULT_PILOTING = 5`) remain only when no pilot data is present.
- **Phase 2**: A new `NodeCanonicalUnitService` SHALL implement the same `ICanonicalUnitService` surface using `fs.readFileSync` + `path.resolve('public/data/units/battlemechs/...')`, lifting the proven loader pattern from `scripts/validate-bv.ts:4648-5193` without replacing the singleton globally. Selection between fetch and fs paths SHALL be controlled by an environment flag or a separate Node entry point.
- **Phase 3**: A new `IAIPlayer` interface SHALL be extracted from `BotPlayer`'s public method surface (`evaluateRetreat`, `playMovementPhase`, `playAttackPhase`, `playPhysicalAttackPhase`). `SimulationRunner` SHALL accept an injectable `aiPlayerFactory` via constructor with `BotPlayer` as the default. A `behaviorVariants` registry SHALL ship `default` / `aggressive` / `defensive` / `skirmisher` `IBotBehavior` presets, plus a `StandStillAIPlayer` stub for tests.
- **Phase 4**: New `randomForceGenerator` and `randomPilotGenerator` services SHALL produce `IForce` and `IPilot[]` payloads from BV-budget / tonnage / era / tech-base filters and from either vault-sample or template-synthesis pilot strategies. The simulation-result schema (`ISimulationRunResult`) SHALL carry a `participants` payload with `sideId` / `unitId` / `chassisId` / `pilotId` / `gunnery` / `piloting` for every unit so downstream aggregation can identify them. The existing `encounterToGameSession.ts:buildGameUnitsForForce` is reused unchanged.
- **Phase 5**: `scripts/run-simulation.ts` SHALL accept a JSON config file as its primary input plus override flags (`--runs`, `--seed`, `--bv-budget`, `--era`, `--tech-base`, `--ai-side-a`, `--ai-side-b`, `--pilots`, `--map-radius`, `--terrain-biome`, `--output`). The runner SHALL wire Phases 1-4 into the existing `BatchRunner.runBatch` sequential loop.
- **Phase 6**: `MetricsCollector` SHALL add per-chassis / per-pilot / per-AI-variant rollups: a `chassisMatrix`, a `gunneryBracket` table, an `aiVariantHeadToHead` matrix, and a `pilotPerformance` map. `ISimulationRunResult` SHALL carry `schemaVersion: 2` so existing consumers can detect the migration.
- **Deferred (Phase 7, NOT in this change)**: `worker_threads` parallelism in `BatchRunner`, wiring of the existing `terrainGenerator.ts` Perlin biome generator into `ScenarioGenerator`, and LLM-driven `IAIPlayer` implementations.

## Dependencies

- **Requires**: existing `simulation-system` infrastructure (`SimulationRunner`, `BatchRunner`, `BotPlayer`, `MetricsCollector`).
- **Requires**: existing `scenario-generation` `IOpForConfig` shape (re-used for `pilotSkillTemplate` synthesis contract).
- **Requires**: existing `combat-resolution` `IBotBehavior` field set (`retreatThreshold`, `retreatEdge`, `safeHeatThreshold`).
- **Requires**: existing `pilot-system` `IPilot` + 3-store split (`usePilotStore.{ts,api.ts,skills.ts}`).
- **Requires**: existing `combat-analytics` `MetricsCollector` projections.
- **Required By**: a future LLM-driven `IAIPlayer` change — Phase 3's interface is the seam.

## Impact

- **Affected specs**: `simulation-system` (MODIFIED — pilot skill plumbing, `IAIPlayer` injection, schemaVersion'd result), `combat-resolution` (MODIFIED — `BotPlayer` conforms to `IAIPlayer`, behavior-variant registry), `scenario-generation` (ADDED — random force generator + pilot synthesis), `pilot-system` (ADDED — vault-sample vs template-synthesis pilot generation), `combat-analytics` (ADDED — chassis matrix, gunnery brackets, AI-variant head-to-head, pilot performance), `quick-session` (ADDED — CLI swarm runner contract).
- **Affected code**: `src/simulation/runner/SimulationRunnerSupport.ts` (read real skills), `src/simulation/runner/SimulationRunnerState.ts` (skill propagation), `src/simulation/ai/{AttackAI,MoveAI,RetreatAI}.ts` (audit hardcoded defaults), `src/simulation/ai/BotPlayer.ts` (`implements IAIPlayer`), `src/simulation/ai/IAIPlayer.ts` (NEW), `src/simulation/ai/behaviorVariants.ts` (NEW), `src/simulation/runner/SimulationRunner.ts` (constructor accepts `aiPlayerFactory`), `src/services/units/NodeCanonicalUnitService.ts` (NEW), `src/services/encounter/randomForceGenerator.ts` (NEW), `src/services/encounter/randomPilotGenerator.ts` (NEW), `src/simulation/MetricsCollector*` (new rollups), `scripts/run-simulation.ts` (new flags), `scripts/swarm-configs/*.json` (NEW example configs).
- **Reused unchanged**: `src/simulation/core/SeededRandom.ts`, `src/simulation/core/WeightedTable.ts`, `src/simulation/runner/BatchRunner.ts`, `src/simulation/QuickResolveService.ts`, `src/services/encounter/encounterToGameSession.ts`, `scripts/validate-bv.ts` (loader pattern reference).
- **Schema migration**: `ISimulationRunResult` gains `schemaVersion: 2` and a `participants` payload. Schema-version 1 results remain readable; consumers that need participant identity SHALL gate on `schemaVersion >= 2`.
- **No database changes**, **no UI changes** outside the existing CLI script. The browser-facing `QuickResolveService` path is left untouched.
- **Reproducibility preserved**: seeded determinism end-to-end. Same `--config` + `--seed` SHALL produce byte-identical output JSON across two invocations.

## Non-Goals

- **Worker-thread parallelism** in `BatchRunner` — deferred to Phase 7. The trigger condition is documented but not implemented: ≥10K interactive runs or ≥360K offline (e.g., full Heavy-class N×N matrix). Phase 0 evidence puts current single-thread throughput at ~30 ms / run, sufficient for thousands of runs in seconds.
- **Biome / Perlin map generation** — `src/utils/gameplay/terrainGenerator.ts` already implements `temperate` / `desert` / `arctic` / `urban` / `jungle` biomes via Perlin noise but is not wired into `ScenarioGenerator`. Wiring is deferred; the existing weighted-terrain hex grid is the starting point.
- **LLM-driven AI players** — the `IAIPlayer` interface (Phase 3) is the seam, but no LLM implementation ships in this change.
- **Map themes beyond terrain weights** — elevation / water bodies / urban templates are deferred to the biome wiring follow-up.
- **Browser-tab swarm UI** — this change is CLI-first. The existing in-browser `QuickResolveService` button continues to handle the 25 / 100 / 500 / 5000 use case for interactive Monte Carlo.
- **Coordinated team behavior across an `IAIPlayer`** — the per-unit decision contract is unchanged. Cross-unit coordination (focus-fire, withdraw-as-team) is a future variant.
- **BV-budget enforcement modes beyond ±5% greedy fill** — the random force generator accepts a single tolerance band. Richer fairness models (era-mirror, tech-base-mirror, weight-class-mirror) are deferred.
- **Schema downgrade for `schemaVersion: 1` consumers** — existing consumers that ignore `schemaVersion` continue to work with the old fields; consumers that need `participants` MUST update to read `schemaVersion: 2`.
