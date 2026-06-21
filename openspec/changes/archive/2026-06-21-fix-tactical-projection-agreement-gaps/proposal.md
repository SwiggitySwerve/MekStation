# Change: Fix Tactical Projection Agreement Gaps

## Why

The 2026-06-09 audit remediation (PRs #801/#802) unified the combat projection with the engine commit path and added a 544-line attack-side agreement suite, but it explicitly deferred the movement side: turning-MP/facing divergence is only surfaced as a `validatorDisagreement` diagnostic (remediation tracker W1.3), the jump reachability candidate gate is a flat `hexDistance <= jumpMP` filter ahead of per-hex legality, and `CombatPlanningPanel` still computes `rangeToTarget` from raw `hexDistance` instead of the projection. The agreement test suite contains zero movement cases, so the spec's existing "Integrated Movement Projection Agreement" requirement has no executable enforcement — the exact gap class that let UI/engine drift accumulate before the audit.

## What Changes

- Unify turning/facing MP between movement projection and committed movement validation: the reachability projection accounts for the same `calculateGroundPathTurningMpCost` charges that `validateMovement` enforces, and the `validatorDisagreement` diagnostic is promoted from advisory telemetry to a CI-failing assertion (zero disagreements on represented movement modes).
- Keep the flat jump distance pre-gate in `deriveReachableHexes` as a proven superset and prove each represented per-hex gate agrees with engine jump legality (elevation, clearance, occupancy/stacking, posture, and availability). Prohibited landing-terrain support remains not represented by the current runtime and is called out rather than claimed.
- Consolidate `CombatPlanningPanel` range/bracket display onto the combat projection (`combat.distance` / `rangeBracket`) — removing the last UI-local range computation.
- Extend the preview↔commit agreement suite with a parametrized movement channel: reachability, MP cost, terrain cost, elevation delta, heat, blocked reason, and destination legality compared between projection and commit across move modes (walk, run, jump, and represented vehicle/VTOL/WiGE modes) on fixed scenarios; unsupported modes are explicitly enumerated rather than silently skipped.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `movement-system`: "Integrated Movement Projection Agreement" gains turning/facing MP parity, jump candidate-gate parity, and an executable-agreement-coverage requirement (the `validatorDisagreement` zero-tolerance assertion).
- `tactical-map-interface`: "Rules-Backed Movement Projection" gains turning-cost projection scenarios; the combat-side requirement governing weapon range display gains a scenario pinning panel range/bracket values to the combat projection rather than independent distance math.

## Impact

- `src/utils/gameplay/movement/reachable.ts` (jump candidate gate, turning MP in projection), `src/utils/gameplay/movement/commitValidation.ts` (`validatorDisagreement` promotion), `src/utils/gameplay/movement/validation.ts` (shared turning-cost entry point).
- `src/components/gameplay/CombatPlanningPanel.tsx` (consume projection range).
- `src/engine/InteractiveSession.attackProjectionAgreement.scenario.test.ts` (or sibling movement agreement suite) — new parametrized movement agreement cases over the existing `src/testing/tactical-map.*` scenario fixtures.
- No combat-resolution delta — does not change the archived
  `add-battlemech-combat-validation-suite` baseline.

## Non-goals

- No new projection layer or façade — PRs #801/#802 already routed projection through shared engine state builders; this change repairs the named residual sites only.
- No isometric/legibility UI work (separate changes: `add-topdown-tactical-legibility`, `add-isometric-elevation-extrusion`).
- No expansion of combat validation catalog rows (tracked by the archived combat-validation
  baseline and current `validate:combat` / `validate:combat:gaps` accounting).
- Full airborne VTOL/WiGE altitude pathing controls remain out of scope (existing spec boundary stands); their *agreement* status is enumerated, not implemented.
