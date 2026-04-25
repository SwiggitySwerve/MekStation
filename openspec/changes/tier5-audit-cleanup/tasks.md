# Tasks — tier5-audit-cleanup

Tasks are grouped into three phases following design decision **D1**: Tests → Docs → Decisions. Each phase is independently shippable; if Phase C is blocked at execution, Phase A + B can ship as a stand-alone PR.

Implementation should land AFTER all three Tier 4 HIGH-severity PRs merge (BLK manifest `bv: null`, post-battle reviewed-flag, `wire-interactive-psr-integration`).

---

## 1. Phase A — Test additions (zero behavioral risk)

- [ ] 1.1 Add TSM + heat-9 walk-MP combined integration test at `src/utils/gameplay/movement/__tests__/tsmHeatInteraction.test.ts` (per design **D8**). Cover the three scenarios in `specs/heat-management-system/spec.md::Requirement: TSM Walk-MP Combined With Heat Penalty`: TSM-active at heat 9, TSM-active at heat 0 (dormant), and non-TSM at heat 9. Use existing `getEffectiveWalkMP` (Grep for the function — likely in `src/utils/gameplay/movement/modifiers.ts`).
- [ ] 1.2 Add Quad ProtoMech location-remap test at `src/utils/gameplay/protomech/__tests__/quadLocationMapping.test.ts`. Cover the three scenarios in `specs/protomech-unit-system/spec.md::Requirement: Quad ProtoMech Hit-Location Remapping`: RightArm→FrontLegs, LeftArm→RearLegs, biped unchanged. Use the existing protomech location resolver (Grep for `resolveProtomechLocation` or similar in `src/utils/gameplay/protomech/`).
- [ ] 1.3 Add 40/20/20/10/10 ratio assertions to the vehicle-store auto-allocate test (per design **D9**). Locate `src/stores/__tests__/useVehicleStore.autoAllocate.test.ts` (or whichever existing test owns `autoAllocateArmor`). Add the three scenarios from `specs/armor-diagram/spec.md::Requirement: Vehicle Auto-Allocate Canonical Distribution Ratio`: turreted 40/20/20/10/10, turretless redistribution, VTOL rotor substitution.
- [ ] 1.4 Add `applyTurnStarted` PSR-clear regression test (per design **D3** correction). Add `src/utils/gameplay/gameState/__tests__/phaseManagement.turnStarted.test.ts` (or extend an existing phaseManagement test if one exists). Cover the two scenarios in `specs/piloting-skill-rolls/spec.md::Requirement: Pending PSR Queue Cleared At Turn Boundary (Regression Protection)`: (a) `applyTurnStarted` clears every unit's `pendingPSRs` array; (b) `applyPhaseChanged` (within the same turn) does NOT clear `pendingPSRs`. Cite `phaseManagement.ts:60` as the implementation site under test.
- [ ] 1.5 Run `npx jest --testPathPattern="tsmHeatInteraction|quadLocationMapping|useVehicleStore.autoAllocate|phaseManagement.turnStarted"` — all new tests pass; no regressions in adjacent suites.
- [ ] 1.6 Commit Phase A as a single conventional-commits commit: `test(audit): add TSM+heat-9, quad-protomech, vehicle-armor-ratio, applyTurnStarted-PSR-clear coverage`.

---

## 2. Phase B — Documentation backfills (low risk, accountability work)

- [ ] 2.1 Backfill `openspec/changes/archive/2026-04-25-add-aerospace-construction/notepad/decisions.md` (per design **D7**) — file does not currently exist. Open with the line: "Backfilled by `tier5-audit-cleanup` (Tier 1–4 audit follow-up). Original close-out lacked a decisions log." Document the PR #388 retroactive spec additions (`VAL-AERO-WING-HEAVY` and `VAL-AERO-BOMB-BAY`) — what triggered them (verifier feedback), what was fixed, file:line refs to the new SHALL blocks in `specs/aerospace-unit-system/spec.md`.
- [ ] 2.2 Add JSDoc `@remarks` block to `src/types/combat/CombatOutcome.ts` `ICombatOutcome.pilotState` field (per design **D6** + spec `combat-resolution`). Cite `src/lib/combat/outcome/combatOutcome.ts:128-133` as the derivation site and reference the Wave-5 pilot-event wiring change (or `wire-interactive-psr-integration` if pilot consciousness events are folded there) as the unblock dependency. Verify the JSDoc renders cleanly: `npx tsc --noEmit --skipLibCheck`.
- [ ] 2.3 Replace the bare `Body: 0` placeholder at `src/utils/construction/vehicle/armor.ts:164` with an explicit code-comment block (per design **D5**) — one-line comment citing the Wave 5 owner change (the support-vehicle customizer surface). No spec delta needed; the existing `aerospace-construction` spec already DEFERRED this.
- [ ] 2.4 Run `npx tsc --noEmit --skipLibCheck` and `npx oxlint <touched files>` — clean.
- [ ] 2.5 Commit Phase B: `docs(audit): backfill aerospace decisions, KIA JSDoc warning, body-armor placeholder cleanup`.

---

## 3. Phase C — Spec/code decisions (deliberate calls)

### 3.A — Vehicle 9.3 chin turret −1 pivot penalty: IMPLEMENT (per design **D2**)

- [ ] 3.A.1 Locate the vehicle to-hit modifier accumulator. Grep for `chinTurret` and existing vehicle-specific to-hit modifiers (likely in `src/utils/gameplay/toHit/` or `src/utils/gameplay/firingArc/`).
- [ ] 3.A.2 Detect chin-turret pivot during the current turn. Grep for an existing turret-facing tracker on `IVehicleUnit` or its game-state companion. If absent, add a `turretPivotedThisTurn: boolean` flag and clear it at end-of-turn alongside other per-turn flags.
- [ ] 3.A.3 Add `+1 to-hit` modifier with attribution `chin-turret-pivot` when `weapon.location === ChinTurret && unit.turretPivotedThisTurn`. Do NOT apply to body- or sponson-mounted weapons.
- [ ] 3.A.4 Add three Jest tests covering the scenarios in `specs/firing-arc-calculation/spec.md::Requirement: Vehicle Chin Turret Pivot Penalty` (pivot+chin+penalty applies, no-pivot=no-penalty, body-weapon unaffected).
- [ ] 3.A.5 Run `npx jest --testPathPattern="toHit|firingArc|chinTurret"` — green.
- [ ] 3.A.6 Commit: `feat(combat): apply -1 to-hit penalty for vehicle chin-turret pivot`.

### 3.B — ~~`pendingPSRs` turn-boundary clear~~ — REMOVED FROM PHASE C

**Status:** Originally proposed as IMPLEMENT in `applyPhaseChanged`. Pre-authoring verification revealed the clear is already implemented in `applyTurnStarted:60` per archived `wire-piloting-skill-rolls` task 1.3 (deliberate decision to attach to `TurnStarted` events rather than phase transitions). The audit picked the wrong function. See design **D3** "Audit correction".

The regression test is now task **1.4** in Phase A. No production code change is needed.

### 3.C — HeadStructureDamage PSR: DE-SCOPE from spec (per design **D4**)

- [ ] 3.C.1 Edit `openspec/changes/archive/2026-04-25-wire-piloting-skill-rolls/specs/piloting-skill-rolls/spec.md` — remove the head-PSR scenario/requirement (whichever block originally encoded the deferred head-PSR concept).
- [ ] 3.C.2 Edit `openspec/changes/archive/2026-04-25-wire-piloting-skill-rolls/tasks.md` — flip task 2.3 from `[x] DEFERRED — pickup: <ref>` to `[x] DE-SCOPED — see tier5-audit-cleanup`. Acknowledge the design **D7** precedent that we are intentionally editing an archived change for audit-trail integrity (one-off, not a new norm).
- [ ] 3.C.3 Verify no production code currently emits head-PSR factories or queue entries (Grep `head_psr`, `HeadStructureDamage`, `headPsr` across `src/`). If found, delete it.
- [ ] 3.C.4 Confirm the `applyPilotDamage` + consciousness-roll path is intact (Grep for `applyPilotDamage` — should already be wired per audit). No code change needed if intact.
- [ ] 3.C.5 Commit: `chore(spec): de-scope head-PSR from piloting-skill-rolls (Tier 5 cleanup, design D4)`.

### 3.D — Phase C verification

- [ ] 3.D.1 Run full Jest sweep on touched paths: `npx jest --testPathPattern="movement|protomech|vehicle|toHit|firingArc|psr|phase|engine"` — green.
- [ ] 3.D.2 Run `npx tsc --noEmit --skipLibCheck` — clean.
- [ ] 3.D.3 Run `npx oxlint` on all touched files — 0 errors.
- [ ] 3.D.4 Run `npx oxfmt --write` on all touched files; verify `npx oxfmt --check` passes.

---

## 4. Spec validation + change archive prep

- [ ] 4.1 Run `npx openspec validate tier5-audit-cleanup --strict` — must pass with no errors.
- [ ] 4.2 Verify each spec delta in `specs/` references a real existing capability under `openspec/specs/` (heat-management-system, protomech-unit-system, armor-diagram, firing-arc-calculation, piloting-skill-rolls, combat-resolution — all confirmed present).
- [ ] 4.3 Re-confirm every task above is `[x]` checked. If any `[ ]` remains at archive time, it MUST be either resolved or explicitly DE-SCOPED with rationale (no `DEFERRED` markers in this cleanup wave — this is the last-mile change).

---

## 5. PR + archive

- [ ] 5.1 Push branch `spec/tier5-audit-cleanup` and open PR via `gh pr create`. Title: `chore(openspec): tier5-audit-cleanup — Tier 1–4 audit follow-ups (MED + LOW severity)`. Body should call out the three phases, link the audit plan, and note the change MUST land after the three Tier 4 HIGH PRs merge.
- [ ] 5.2 After PR merges to main, run `npx openspec archive tier5-audit-cleanup` — this moves the change to `openspec/changes/archive/<YYYY-MM-DD>-tier5-audit-cleanup/` and merges deltas into source-of-truth specs.
- [ ] 5.3 Post-archive sanity check: `npx openspec validate --strict` (whole repo) — clean.
