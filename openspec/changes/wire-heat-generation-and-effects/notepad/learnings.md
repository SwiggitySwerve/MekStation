# Learnings — wire-heat-generation-and-effects

## [2026-04-23 seed] State at orchestration start

### Existing implementation (already DONE on main before this change)
- Movement heat: `calculateMovementHeat` in `src/utils/gameplay/movement/modifiers.ts` already returns walk=1, run=2, jump=max(hexesMoved, 3). Correct.
- Heat phase: `src/utils/gameplay/gameSessionHeat.ts::resolveHeatPhase` wires movement/firing/engine-hit HeatGenerated events (sources `'movement' | 'firing' | 'engine_hit'`), dissipation, shutdown check at ≥14, auto-shutdown at ≥30, startup attempts, ammo explosion roll, pilot heat damage.
- Heat constants: `src/constants/heat.ts` has `getShutdownTN`, `getAmmoExplosionTN`, `getHeatMovementPenalty`, `getPilotHeatDamage`, `HEAT_TO_HIT_TABLE`.
- `IHeatPayload.source` union already includes `'movement' | 'firing' | 'weapons' | 'engine_hit' | 'environment' | 'dissipation' | 'external'`.
- `IGameUnit.heatSinks?: number` and `IComponentDamageState.heatSinksDestroyed` exist.

### Gaps to close (remaining tasks)
1. **Heat-sink rating (4.2/4.3)**: current `gameSessionHeat.ts` uses `unit.heatSinks` as count with 1:1 dissipation. Need per-sink rating (single=1, double=2). `IGameUnit` has only a count field, not a type. Need to add `heatSinkType?: 'single' | 'double'` to `IGameUnit` (default single for back-compat).
2. **Water cooling (5.x)**: `src/utils/gameplay/heat.ts::getWaterCoolingBonus` exists but is NOT wired into `gameSessionHeat.ts`. Need to read terrain at unit position and add water bonus to dissipation.
3. **Heat movement penalty (7.x)**: `getHeatMovementPenalty` exists in constants/heat.ts but is not applied to effective MP. Need to wire into movement MP computation (likely where `getMaxMP` or `calculateRunMP` is called at movement phase).
4. **Ammo explosion event (11.4)**: currently heat-induced ammo explosion emits `UnitDestroyed`. Should also emit `AmmoExplosion` event with `source: 'HeatInduced'`. Enum has `AmmoExplosion = 'ammo_explosion'`. Need payload interface and creator.
5. **CASE protection (11.3)**: out-of-scope coordination with integrate-damage-pipeline — leave as deferred with rationale.
6. **PilotHit Heat source (12.3)**: `IPilotHitPayload.source` is `'head_hit' | 'ammo_explosion' | 'mech_destruction'`. Need to add `'heat'`. Currently heat pilot damage emits `createPilotHitEvent(...'head_hit'...)` — wrong source. Switch to `'heat'`.
7. **HeatDissipated breakdown (13.2)**: current payload shape `{unitId, amount, source, newTotal}` doesn't separate base vs water bonus. Options: (a) extend payload with optional `breakdown: {base, waterBonus}`, or (b) emit two HeatDissipated events. Cleaner: extend payload with optional breakdown.
8. **Smoke test 14.5/14.6**: expand existing `gameSessionHeat.test.ts` with heat=14 fixture and seeded dice determinism.
9. **Fuzzer 15.2 / E2E 15.3**: deferrable if time-budget tight — document rationale.

## Scope guardrails (from kickoff)
- Do NOT modify firing-arc logic (#342 open)
- Do NOT modify ammo state handling structurally (#344 open) — but extending `AmmoExplosion` emission inside heat phase is OK since we're consuming existing ammoState, not changing its shape.
- Stay out of damage-pipeline internals (parallel Wave 2 change) — heat phase triggers only, no damage resolution changes.

## Tooling / env rules
- Windows: husky `--no-verify` for commits; manual via `sh .husky/pre-commit` if needed
- `npx oxfmt --write` on modified files before commit
- `openspec validate wire-heat-generation-and-effects --strict` must pass before PR
