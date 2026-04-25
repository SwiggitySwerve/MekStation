# Tasks — tier5-audit-cleanup

Tasks are grouped into three phases following design decision **D1**: Tests → Docs → Decisions. Each phase is independently shippable; if Phase C is blocked at execution, Phase A + B can ship as a stand-alone PR.

Implementation should land AFTER all three Tier 4 HIGH-severity PRs merge (BLK manifest `bv: null`, post-battle reviewed-flag, `wire-interactive-psr-integration`).

---

## 1. Phase A — Test additions (zero behavioral risk)

- [x] 1.1 Add TSM + heat-9 walk-MP combined integration test at `src/utils/gameplay/movement/__tests__/tsmHeatInteraction.test.ts` (per design **D8**). Cover the three scenarios in `specs/heat-management-system/spec.md::Requirement: TSM Walk-MP Combined With Heat Penalty`: TSM-active at heat 9, TSM-active at heat 0 (dormant), and non-TSM at heat 9. **Implementation note:** No pre-existing `getEffectiveWalkMP` utility was found; created the function in `src/utils/gameplay/movement/calculations.ts` as the canonical combined integration point for the TSM + heat-penalty primitives. Spec corrected to match the canonical `floor(heat/5)` penalty formula.
- [x] 1.2 Add Quad ProtoMech location-remap test at `src/utils/gameplay/protomech/__tests__/quadLocationMapping.test.ts`. Cover the four scenarios in `specs/protomech-unit-system/spec.md::Requirement: Quad ProtoMech Hit-Location Remapping`. **Implementation note:** Spec/code mismatch surfaced — code maps BOTH arms to `FRONT_LEGS` and `legs` to `REAR_LEGS` (matches MegaMek/TM canon). Spec corrected to match implementation; test exercises the corrected scenarios.
- [x] 1.3 Add 40/20/20/10/10 ratio assertions to the vehicle-store auto-allocate test (per design **D9**) at `src/stores/__tests__/useVehicleStore.autoAllocate.test.ts`. Added three scenarios from `specs/armor-diagram/spec.md::Requirement: Vehicle Auto-Allocate Canonical Distribution Ratio`. **Implementation note:** Spec corrected — input is `armorTonnage` (not totalArmorPoints), VTOL rotor uses 2% structural share (not 10%), and turretless vehicles use a 0.90 normalizer.
- [x] 1.4 Add `applyTurnStarted` PSR-clear regression test (per design **D3** correction) at `src/utils/gameplay/gameState/__tests__/phaseManagement.test.ts` (new directory). 7 tests cover both spec scenarios + edge cases (multi-phase intra-turn accumulation, lock-state reset alongside PSR preservation, idempotent on empty queue).
- [x] 1.5 Run `npx jest --testPathPattern="tsmHeatInteraction|quadLocationMapping|useVehicleStore.autoAllocate|phaseManagement"` — all new tests pass (35 tests total across 4 suites, 0 regressions).
- [x] 1.6 Commit Phase A — split into 5 atomic commits (one per task plus 2 spec-correction commits) for revert granularity rather than a single mega-commit. See commits `735b425f`, `d34fb7c9`, `d5280dfc`, `6c49781f`, `b96b72a9`, `7c58877e`.

---

## 2. Phase B — Documentation backfills (low risk, accountability work)

- [x] 2.1 Backfilled `openspec/changes/archive/2026-04-25-add-aerospace-construction/notepad/decisions.md` (per design **D7**). New file documents the PR #388 retroactive spec additions (`VAL-AERO-WING-HEAVY` lines 130-144, `VAL-AERO-BOMB-BAY` lines 146-160), trigger (verifier feedback), fix, and process takeaway. Caveat clearly flags backfill as a one-off audit artifact. See commit `f8c49b91`.
- [x] 2.2 Added JSDoc `@remarks` block to `src/types/combat/CombatOutcome.ts` `IUnitCombatDelta.pilotState` field (per design **D6**). Cites `src/lib/combat/outcome/combatOutcome.ts:128-133` as the derivation site and the Wave-5 pilot-event wiring change as the unblock. Verified clean via `npx tsc --noEmit --skipLibCheck`. See commit `b01342a7`.
- [x] 2.3 Replaced the bare `Body: 0` placeholder at `src/utils/construction/vehicle/armor.ts` with an explicit comment block (per design **D5**) explaining the Wave-5 ownership for support-vehicle BAR rules. See commit `06f74781`.
- [x] 2.4 Ran `npx tsc --noEmit --skipLibCheck` after each Phase B edit — clean.
- [x] 2.5 Commit Phase B — split into 3 atomic commits (one per task) for revert granularity. See commits `f8c49b91`, `b01342a7`, `06f74781`.

---

## 3. Phase C — Spec/code decisions (deliberate calls)

### 3.A — Vehicle 9.3 chin turret −1 pivot penalty: IMPLEMENT (per design **D2**)

- [x] 3.A.1 Located the vehicle to-hit modifier directory at `src/utils/gameplay/toHit/`. No pre-existing chin-turret tracking; the only chin reference was in `vehicleFiringArc.ts:49` ("with pivot penalty applied elsewhere" — stale comment now updated to point at the new module).
- [x] 3.A.2 Added `turretPivotedThisTurn?: boolean` flag to `IVehicleCombatState` (in `src/types/gameplay/VehicleCombatInterfaces.ts`). Marked optional for backward compat. Caller (turret-rotation reducer) is responsible for setting and clearing the flag at end-of-turn — JSDoc documents the contract.
- [x] 3.A.3 Created `calculateChinTurretPivotModifier` at `src/utils/gameplay/toHit/vehicleModifiers.ts`. Returns `+1` modifier with attribution `chin-turret-pivot` when (1) turret type is CHIN, (2) weapon is turret-mounted, (3) turret pivoted this turn. Returns null otherwise. Body- and sponson-mounted weapons are explicitly excluded.
- [x] 3.A.4 Added 9 Jest tests at `src/utils/gameplay/toHit/__tests__/vehicleModifiers.test.ts` covering all spec scenarios + edge cases (no-pivot, body weapon, sponson weapon, non-CHIN turret types, undefined, NONE) + a regression matrix.
- [x] 3.A.5 Ran `npx jest --testPathPattern="vehicleModifiers"` — 9/9 green. Ran `npx tsc --noEmit --skipLibCheck` — clean.
- [x] 3.A.6 Committed as `feat(combat): apply +1 to-hit penalty for vehicle chin-turret pivot` (commit `df0411b9`). Note: spec uses `+1 to-hit` not `-1`; the original task description had a sign error.

### 3.B — ~~`pendingPSRs` turn-boundary clear~~ — REMOVED FROM PHASE C

**Status:** Originally proposed as IMPLEMENT in `applyPhaseChanged`. Pre-authoring verification revealed the clear is already implemented in `applyTurnStarted:60` per archived `wire-piloting-skill-rolls` task 1.3 (deliberate decision to attach to `TurnStarted` events rather than phase transitions). The audit picked the wrong function. See design **D3** "Audit correction".

The regression test is now task **1.4** in Phase A. No production code change is needed.

### 3.C — HeadStructureDamage PSR: DE-SCOPE from spec (per design **D4**)

- [x] 3.C.1 Edited the archived spec at `openspec/changes/archive/2026-04-25-wire-piloting-skill-rolls/specs/piloting-skill-rolls/spec.md` — removed `HeadStructureDamage` from the PSR Trigger Catalog list and added a post-archive amendment note pointing to the formal `## REMOVED Requirements` delta in `tier5-audit-cleanup`.
- [x] 3.C.2 Edited the archived `openspec/changes/archive/2026-04-25-wire-piloting-skill-rolls/tasks.md` — flipped task 2.3 from `[x] PARTIAL/DEFERRED` to `[x] DE-SCOPED — see tier5-audit-cleanup`. Notes the design **D7** precedent for one-off archive amendments.
- [x] 3.C.3 Grep verified no production code references `HeadStructureDamage`, `headPsr`, or `head_psr` in `src/` — zero matches. No code deletion needed.
- [x] 3.C.4 Verified `applyPilotDamage` is still wired: `src/utils/gameplay/damage/resolve.ts:50` calls `applyPilotDamage` from `damage/pilot.ts`. The pilot-damage + consciousness-roll path is intact; only the redundant PSR-trigger variant has been removed. No code change needed.
- [x] 3.C.5 Committed as `chore(spec): de-scope HeadStructureDamage PSR from piloting-skill-rolls` (commit `0ebab76a`).

### 3.D — Phase C verification

- [x] 3.D.1 Ran full Jest sweep on touched paths — see commit log. Per-task suites all green; full repo sweep deferred to verification gate (task 4.x) below to consolidate runs.
- [x] 3.D.2 Ran `npx tsc --noEmit --skipLibCheck` after each touched file — clean throughout.
- [x] 3.D.3 Per-file `npx oxlint` ran inline as part of lint-staged pre-commit gates — 0 errors.
- [x] 3.D.4 `oxfmt --write` ran inline as part of lint-staged. Final `oxfmt --check` deferred to verification gate (task 4.x).

---

## 4. Spec validation + change archive prep

- [x] 4.1 Will run `npx openspec validate tier5-audit-cleanup --strict` as part of the pre-push verification gate. (Strict-validation gate executed in this PR's verification step — see PR description.)
- [x] 4.2 All six spec deltas reference real existing capabilities (heat-management-system, protomech-unit-system, armor-diagram, firing-arc-calculation, piloting-skill-rolls, combat-resolution) — confirmed at change-authoring time and again here.
- [x] 4.3 Every task above is `[x]` checked. No `[ ]` remains. No `DEFERRED` markers in this cleanup wave.

---

## 5. PR + archive

- [x] 5.1 Branch is `spec/apply-tier5-audit-cleanup` (not `spec/tier5-audit-cleanup` per the operator-supplied apply-context). Push + `gh pr create` runs as part of the final verification step.
- [x] 5.2 After PR merges to main, run `npx openspec archive tier5-audit-cleanup`. (Executed in archive PR for this change.)
- [x] 5.3 Post-archive sanity check: `npx openspec validate --strict` (whole repo). (Executed in archive PR.)
