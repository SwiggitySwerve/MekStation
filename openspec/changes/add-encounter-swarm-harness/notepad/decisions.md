# Notepad: Decisions (`add-encounter-swarm-harness`)

Architectural decisions made during execution. Decisions referenced by 2+ tasks graduate into `design.md` before archive.

## [2026-05-05 SEED] D1 (from design.md): Plug pilot skills into `createInitialState`, not `ScenarioGenerator`

**Choice**: Phase 1's `toAIUnitState` reads `gunnery` / `piloting` from `IUnitGameState`, which is propagated by `createInitialState` from `IGameUnit`. `ScenarioGenerator` is left untouched because the CLI bypasses it entirely.

**Rationale**: OMO Council Phase 0 corrected an early assumption that `ScenarioGenerator` was the right plug-in point. The CLI path is `BatchRunner` → `SimulationRunner.run` → `SimulationRunnerState.createInitialState` → `createMinimalUnitState`, never touching `ScenarioGenerator`.

**Discovered during**: Phase 0 council pre-phase Metis + Phase 2 Explore-Deep verification.

## [2026-05-05 SEED] D2: `adaptUnitFromData` is the Node-side workhorse

**Choice**: Phase 2's `NodeCanonicalUnitService` returns pre-loaded `IFullUnit` data; consumers call `adaptUnitFromData(fullUnit, options)` from `CompendiumAdapter:465` directly. The async `adaptUnit(unitId)` path is avoided in Node because it routes through `getCanonicalUnitService()` which can pull browser-only deps.

**Rationale**: Avoid touching `CompendiumAdapter`. The synchronous workhorse is a stable, side-effect-free function — perfect for bulk Node-side use.

**Discovered during**: Phase 2 design.

## [2026-05-05 SEED] D3: `IAIPlayer` is method-shaped, not strategy-composition

**Choice**: Phase 3's `IAIPlayer` interface mirrors `BotPlayer`'s four public methods (`evaluateRetreat`, `playMovementPhase`, `playAttackPhase`, `playPhysicalAttackPhase`). We do NOT extract sub-interfaces (`IAttackStrategy` / `IMoveStrategy` / `IRetreatStrategy`).

**Rationale**: Future LLM AI players will reason at the player level (full game session in, single decision out), not at the per-sub-strategy level. Sub-strategy composition would over-fit a shape we cannot predict.

**Discovered during**: design.md D3.

## [2026-05-05 SEED] D7: `participants` payload + `schemaVersion: 2`

**Choice**: `ISimulationRunResult` gains a `schemaVersion: 1 | 2` field. When `2`, results carry `participants: { sideId, unitId, chassisId, pilotId, gunnery, piloting, aiVariant }[]`. Existing consumers ignore `schemaVersion` and continue to work.

**Rationale**: Phase 6's per-chassis / per-pilot / per-AI-variant rollups need identity at the result level. Versioning the schema is both forward signal and migration documentation.

**Discovered during**: design.md D7. Referenced by Phase 4 (Task 4.11–4.12) AND Phase 6 (Task 6.1, all rollups). **Already graduated in design.md as D7.**
