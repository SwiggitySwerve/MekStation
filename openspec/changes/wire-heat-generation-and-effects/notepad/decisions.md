# Decisions — wire-heat-generation-and-effects

## [2026-04-23] Double heat sink modeling
**Choice**: Add optional `heatSinkType?: 'single' | 'double'` to `IGameUnit`. Default to `'single'` when absent (back-compat). Dissipation = count × (type === 'double' ? 2 : 1) − destroyed × rating.
**Rationale**: Existing code passes count only; no existing rating field. Adding an enum string is minimally invasive and matches catalog data. Destroyed-sink penalty matches rating so dissipating a destroyed double heat sink correctly loses 2 dissipation.

## [2026-04-23] HeatDissipated payload extension
**Choice**: Extend `IHeatPayload` with optional `breakdown?: { baseDissipation: number; waterBonus: number }`. Only HeatDissipated events populate it (HeatGenerated leaves it undefined).
**Rationale**: Keeps a single IHeatPayload shape, no breaking change to existing emit sites, satisfies task 13.2.

## [2026-04-23] PilotHit.source extension
**Choice**: Extend `IPilotHitPayload.source` union with `'heat'` and switch heat-phase pilot damage emission from `'head_hit'` to `'heat'`.
**Rationale**: Task 12.3 explicitly requires `source 'Heat'`. Current `'head_hit'` is semantically wrong for heat damage — it causes consumers (UI/replay) to conflate heat pilot damage with head-location critical damage.

## [2026-04-23] CASE / CASE II coordination (11.3)
**Choice**: DEFER. Out-of-scope for this change per kickoff "stay out of damage-pipeline internals" guardrail. `integrate-damage-pipeline` owns CASE routing.
**Rationale**: CASE protection lives in the damage-application layer (ammo explosion damage routes through internal structure but CASE vents externally). Wiring this here would touch damage pipeline code the parallel change is owning.
**Alt-coverage**: Heat-induced ammo-explosion event emission (11.4) IS in this change (`AmmoExploded` with `source = 'HeatInduced'`); the actual damage-routing-with-CASE-vent semantics belongs to `integrate-damage-pipeline` (now archived as `2026-04-24-integrate-damage-pipeline`). Future hardening tracked there.

## [2026-04-24] Autonomous fuzzer deferral (15.2)
**Choice**: DEFER. Fuzzer harness infrastructure (property-based / random-input generator over heat-phase invariants) is out of scope for this change.
**Rationale**: This change wires existing heat mechanics; building a fuzzer would more than double its surface area and overlap with future test-infra work. The two specific invariants the task names — "no mech ever has negative heat" and "no mech silently skips a shutdown check" — are already validated by deterministic tests.
**Alt-coverage**:
- Negative-heat invariant: `src/utils/gameplay/gameSessionHeat.ts` line 205-208 clamps via `newHeat = Math.max(0, currentHeatBeforeDissipation - totalDissipation)`. Tests: `src/utils/gameplay/__tests__/heatSystem.test.ts` line 373 (`does not go below 0 heat`) and line 677 (`handles extreme heat values (100+)`).
- Shutdown-check invariant: `resolveHeatPhase` deterministically iterates every active unit and emits `ShutdownCheck` for any unit at heat ≥ 14, covered by the smoke fixture in `src/__tests__/unit/utils/gameplay/wireHeatGenerationAndEffects.smoke.test.ts` (case 14.5: heat=14 produces `ShutdownCheck` with correct TN) plus `heatSystem.test.ts` `getShutdownTN` tests.

## [2026-04-24] End-to-end multi-turn alpha-strike test deferral (15.3)
**Choice**: DEFER. A multi-turn E2E harness that scripts `fire → dissipate → shutdown → idle turn → startup` against the live engine is out of scope.
**Rationale**: This change is a heat-phase wiring change, not a turn-loop change. Building an E2E harness that drives `advancePhase` across multiple full turns belongs to a dedicated E2E / integration testing initiative. Per-phase behaviour is exhaustively covered by unit + smoke tests.
**Alt-coverage**:
- Smoke fixture in `src/__tests__/unit/utils/gameplay/wireHeatGenerationAndEffects.smoke.test.ts` (tasks 14.1-14.6): asserts per-source HeatGenerated events, dissipation, final heat, and shutdown attempt at heat=14 with the expected TN.
- Startup branch: same smoke file (test `shutdown unit attempts a startup roll after dissipation brings heat ≤ 29`) seeds a shutdown unit at heat=20, runs `resolveHeatPhase`, and asserts a `StartupAttempt` event fires with `success=true`.
- Startup TN formula coverage: `heatSystem.test.ts` `startup system → getStartupTN formula → matches shutdown TN for same heat level` (line 621-629).

## [2026-04-23] Water cooling integration point
**Choice**: Extend `resolveHeatPhase` with optional `options` arg including `getWaterDepth?: (unitId: string, position: IHexCoordinate) => number`. When provided, call it once per unit per phase and add `getWaterCoolingBonus(depth)` to dissipation. When omitted (legacy callers), water cooling contributes 0 — same behavior as today.
**Rationale**: `IHex.terrain` is currently a `string` not a structured `ITerrainFeature[]` — no canonical "depth" field at runtime. Changing IHex is out of scope (touches map rendering, pathfinding, etc.). A provider-callback lets callers wire water depth from wherever they track it (future change can add structured terrain to IHex and swap the provider). Preserves back-compat for every existing caller.

## [2026-04-23] Heat movement penalty integration point
**Choice**: Apply `getHeatMovementPenalty(heat)` at movement-validation / MP-computation time (not baked into unit state). `getMaxMP` in movement/calculations.ts is the canonical entry point; wrap/extend it to subtract heat penalty.
**Rationale**: Keeps unit state pure (`walkMP`, `runMP` unchanged); derived effective MP accounts for live heat. Matches existing pattern for other MP modifiers.
