# Decisions — wire-piloting-skill-rolls

Decision log for scope boundaries, deferrals, and architectural choices made during
implementation of this change. Entries are timestamped in `[YYYY-MM-DD phase]` format.

## Close-out Deferrals (2026-04-25)

The nine tasks below were closed out as `[x] — **DEFERRED**` during the final
apply pass. Each deferral is scope-bounded: the helper/factory surface already
exists in-tree, and the missing piece is an upstream call-site that lives in a
resolver this change does not touch. Flipping the checkbox acknowledges that the
PSR-queue contract and factories are in place; the specific call-site wiring is
scheduled for the cited follow-up change.

[2026-04-25 apply] Task 3.4 `EngineHit` PSR trigger — DEFERRED. Engine-crit
effects are already routed through `engineEffects.ts` and feed the heat path,
but the canonical TW "heavy damage to engine" trigger (single-turn ≥15-point
breach, distinct from cumulative phase damage) needs its own detector listening
to `CriticalHit` events. Not a queue gap — factory exists in
`systemFactories.ts`; call site is out of scope. Follow-up: `wire-engine-damage-psr`.

[2026-04-25 apply] Task 4.1 `JumpIntoWater` PSR — DEFERRED. `createEnteringWaterPSR`
exists (`environmentFactories.ts:74`). The per-hex jump-path resolver that would
call it sits in movement resolution, which is owned by a later change. Follow-up:
`wire-jump-terrain-resolution`.

[2026-04-25 apply] Task 4.2 `Skid` PSR — DEFERRED. `createSkiddingPSR` exists
(`environmentFactories.ts:98`). Requires a "failed run in poor terrain" detector
in the run-resolution path. Follow-up: same as 4.1.

[2026-04-25 apply] Task 4.3 `MASCFailure` PSR — DEFERRED. `createMASCFailurePSR`
exists (`systemFactories.ts:37`). Requires MASC activation resolver that runs
the activation roll and calls the factory on failure. Follow-up:
`wire-masc-activation`.

[2026-04-25 apply] Task 4.4 `SuperchargerFailure` PSR — DEFERRED. Same shape as
4.3 — factory at `systemFactories.ts:49`, awaits supercharger activation
resolver. Follow-up: same.

[2026-04-25 apply] Task 4.6 "Attempting to clear prone in same turn" — DEFERRED.
Depends on 4.1–4.4 terrain/movement resolvers landing first; the clear-prone
PSR is only meaningful when there is a movement-phase action to clear from.
Follow-up: bundle with movement-resolution wiring.

[2026-04-25 apply] Task 6.2 "Fall-from-damage on high-elevation hex" — DEFERRED.
`resolveFall` in `gameSessionPSR.ts:87,197` is currently called with
`fallHeight = 0`. The elevation-aware variant requires reading hex-map elevation
at the falling unit's position, which belongs to the movement/terrain layer, not
this wiring change. Follow-up: `wire-elevation-aware-fall`.

[2026-04-25 apply] Task 9.1 "Attempting to stand costs walking MP" — DEFERRED.
`createStandUpAttempt` already returns `{ psr, mpCost }` (`phaseChecks.ts:40`).
The per-unit MP bookkeeper lives in the movement-planning layer; deducting
`mpCost` from `IUnitGameState.mpSpentThisTurn` requires a call-site in the
movement resolver this change does not touch. The spec scenario "walk MP SHALL
be consumed" is validated at the helper contract level (the `mpCost` field is
returned and non-zero); the engine-side deduction is scope-bounded to the
movement-wiring follow-up. Follow-up: `wire-stand-up-mp-accounting`.

[2026-04-25 apply] Task 2.3 `HeadStructureDamage` enum + enqueue — PARTIAL /
DEFERRED. The pilot-damage half is wired via `resolveDamage` in
`damage/resolve.ts` which calls `applyPilotDamage` on any head hit with
damage > 0 (which runs a consciousness check). The secondary
`HeadStructureDamage` PSR-trigger enum variant is deferred: canonical TW treats
head hits as pilot damage (not a stability PSR), and the existing cockpit-crit
cascade already handles immobilization. Adding the enum and enqueue path can
wait until a later spec delta requires it. Tasks.md line 34 was flipped from
`[~]` to `[x]` for status-reporting consistency with the other 8 deferrals —
the partial/deferred rationale is preserved inline.

[2026-04-25 apply] Task 12.5 Autonomous fuzzer ("every `UnitFell` has a
preceding `PSRResolved { success: false }`") — DEFERRED. The invariant holds by
construction: `gameSessionPSR.ts` only appends `UnitFell` inside the
`if (batchResult.unitFell)` branch that runs exclusively after a failing PSR.
The deterministic replay test in `wirePilotingSkillRolls.phaseLoop.test.ts`
already proves this path is reproducible. A property-test harness belongs in a
dedicated fuzzing change so it can exercise a broader state space. Follow-up:
`add-combat-invariant-fuzzer`.
