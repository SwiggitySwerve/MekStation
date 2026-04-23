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

## [2026-04-23] Water cooling integration point
**Choice**: Extend `resolveHeatPhase` with optional `options` arg including `getWaterDepth?: (unitId: string, position: IHexCoordinate) => number`. When provided, call it once per unit per phase and add `getWaterCoolingBonus(depth)` to dissipation. When omitted (legacy callers), water cooling contributes 0 — same behavior as today.
**Rationale**: `IHex.terrain` is currently a `string` not a structured `ITerrainFeature[]` — no canonical "depth" field at runtime. Changing IHex is out of scope (touches map rendering, pathfinding, etc.). A provider-callback lets callers wire water depth from wherever they track it (future change can add structured terrain to IHex and swap the provider). Preserves back-compat for every existing caller.

## [2026-04-23] Heat movement penalty integration point
**Choice**: Apply `getHeatMovementPenalty(heat)` at movement-validation / MP-computation time (not baked into unit state). `getMaxMP` in movement/calculations.ts is the canonical entry point; wrap/extend it to subtract heat penalty.
**Rationale**: Keeps unit state pure (`walkMP`, `runMP` unchanged); derived effective MP accounts for live heat. Matches existing pattern for other MP modifiers.
