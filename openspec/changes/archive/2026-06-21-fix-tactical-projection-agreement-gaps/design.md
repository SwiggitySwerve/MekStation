# Design: Fix Tactical Projection Agreement Gaps

## Context

PR #801 (audit W1) hydrated the combat projection's to-hit through the shared engine state builders (`buildWeaponAttack*ToHitState`), aligned attack gates and minimum range with the commit path, and added `src/engine/InteractiveSession.attackProjectionAgreement.scenario.test.ts` (~40 cases). Three movement-side residuals were left:

1. **W1.3 deferral (tracked in `docs/audits/2026-06-09-remediation-tracker.md`):** `validateMovement` charges `calculateGroundPathTurningMpCost`; the reachability projection models no facing. Disagreement is surfaced via a `validatorDisagreement` diagnostic in `src/utils/gameplay/movement/commitValidation.ts` — projection stays authoritative, nothing fails when they drift.
2. **Jump candidate gate:** `deriveReachableHexes` (`src/utils/gameplay/movement/reachable.ts`) selects jump candidates with a flat `hexDistance <= jumpMP` filter ahead of per-hex derivation; engine jump legality (elevation gate fixed in W2 C-13) is enforced elsewhere, and no test proves the two agree.
3. **UI-local range math:** `CombatPlanningPanel.tsx` computes `rangeToTarget` from raw `hexDistance` instead of the projection's `combat.distance`/`rangeBracket` — the last second-source-of-truth in the combat planning surface.

The attack agreement suite has zero movement cases, so the existing `movement-system` requirement "Integrated Movement Projection Agreement" is unenforced by any executable evidence.

## Goals / Non-Goals

**Goals:**
- Movement projection and committed movement validation charge identical turning/facing MP for the same path.
- `validatorDisagreement` becomes a CI-failing condition (zero tolerance on represented modes), not advisory telemetry.
- Jump reachability shown on the map equals jump legality the engine enforces (no false-reachable, no false-blocked).
- All combat-planning range/bracket display values trace to the combat projection.
- A parametrized movement agreement suite mirrors the attack agreement suite across move modes and scenario fixtures.

**Non-Goals:**
- No new projection layer/façade (council decision 2026-06-12: #801/#802 already delivered the shared-state unification; this is residual-site repair).
- No new movement rules; no change to which modes are represented. Unsupported modes are enumerated, not implemented.
- No catalog/validation-suite rows (tracked by the archived
  `add-battlemech-combat-validation-suite` baseline and current validation accounting).

## Decisions

**D1 — Turning MP enters the projection via the shared path-cost helper, not a new facing dimension.**
`IMovementRangeHex` already carries the derived `path` per destination. The projection applies the same `calculateGroundPathTurningMpCost` (the function `validateMovement` charges) over that derived path and adds the result to `mpCost` before reachability/legality classification. Alternative considered: modeling facing as a search dimension in the A* (MegaMek `MovePath` style) — rejected for this change as a search-space rewrite with the same observable outcome for cost agreement; can be revisited if path-optimality bugs surface (the current path may be turn-suboptimal, but both sides price the *same* path, which is what agreement requires).

**D2 — `validatorDisagreement` promotion is test-level, not a production throw.**
Production commit behavior keeps projection-authoritative resolution (W1.3 decision stands — no player-facing hard failure). Promotion happens in the agreement suite: every scenario asserts the commit-path diagnostic list is empty. CI fails on any drift; players never see a crash. Alternative (throw in `validateCommittedMovement`): rejected — turns a consistency bug into a gameplay outage.

**D3 — Jump gate: keep the distance pre-filter as a superset optimization; final reachability comes from represented per-hex legality shared with the engine.**
The flat `hexDistance <= jumpMP` filter remains as the cheap candidate bound (jump range in BattleTech is hex distance), but each candidate then passes through the same represented jump legality checks the engine/sim-runner uses: out-of-bounds, occupancy/stacking, jump availability, posture/hull-down gates, reserved-cost budget, elevation rise, and path clearance. Investigation found no separate prohibited-terrain landing gate in the current jump runtime, so this change proves preview/commit agreement for represented gates and explicitly treats prohibited landing-terrain support as not represented rather than claiming it.

**D4 — `CombatPlanningPanel` consumes `ICombatRangeHex`.**
Replace local `hexDistance` calls with the projection lookup already available to the page (`buildTacticalMapHexProjectionLookup` output). Where the panel must show a value for a hex outside the current lookup (edge: target beyond max weapon range), it calls the same exported helper the projection uses — never an inline recomputation.

**D5 — Movement agreement suite lives beside the attack suite and reuses its fixtures.**
New `src/engine/InteractiveSession.movementProjectionAgreement.scenario.test.ts`, parametrized over the existing `src/testing/tactical-map.*` scenario fixtures × move modes (walk, run, jump + represented vehicle/VTOL/WiGE modes). Per (scenario, mode, destination): compare projection `{reachable, mpCost, terrainCost, elevationDelta, heatGenerated, blockedReason}` against committed-validation outcome for the same path. Modes not represented in fixtures are asserted against an explicit `UNSUPPORTED_AGREEMENT_MODES` list so silent skips are impossible (mirrors the validation suite's no-silent-gap doctrine).

## Risks / Trade-offs

- [Reachable sets shrink visibly: hexes that cost turning MP may flip from reachable to unreachable in the preview] → This is the correct rules outcome; release-notes the change; agreement suite pins the new truth.
- [Per-candidate jump legality + turning cost over the full reachable set adds compute on large maps] → Costs are computed on already-derived paths; memoize the turning-cost helper per path signature; perf budget asserted by existing overlay perf tests (3× widening rule if flaky).
- [Vehicle/VTOL fixture coverage may not exist for all modes] → D5's explicit unsupported-mode enumeration converts missing fixtures into visible, tracked gaps instead of silent ones.
- [Panel refactor could regress non-combat phases where projection lookup is empty] → Keep helper fallback path (same exported function), add panel render test for empty-lookup phase.

## Migration Plan

Single PR; no data migration. Rollback = revert. The agreement suite lands in the same PR as the fixes so the assertions are green at merge (red-first locally to prove they catch the pre-fix drift).

## Open Questions

- Does the per-hex jump derivation (post-gate) already apply the engine elevation gate? (Determines whether D3 is a fix or a proof; resolved in task 1.)
- Exact tactical-map-interface requirement heading for the panel-range scenario — "Weapon Command Preview Uses Combat Projection Impact" vs "Contextual Target Comparison"; pick at delta authoring after reading both (resolved in specs artifact).
