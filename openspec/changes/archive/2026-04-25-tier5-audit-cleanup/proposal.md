## Why

The Tier 1–4 close-out audit (April 2026, plan at `~/.claude/plans/look-at-tiers-1-eventual-seahorse.md`) identified 12 follow-up items across 4 archived OpenSpec waves. Three HIGH-severity items are already in flight via parallel worktrees (BLK manifest `bv: null` fix, post-battle reviewed-flag, and the new `wire-interactive-psr-integration` change). This change bundles the remaining 9 MEDIUM and LOW severity items — test-coverage gaps, documentation backfills, and small spec/code decisions — into a single Tier 5 cleanup wave so they don't drift unnoticed.

## What Changes

Three execution phases, ordered by risk (zero-risk tests first, deliberate decisions last):

### Phase A — Test additions (zero behavioral risk)
- Add TSM + heat-9 walk-MP combined integration test (closes verifier PARTIAL on archived `wire-heat-generation-and-effects` task 7.2)
- Add ProtoMech Quad location-remap test (RightArm→FrontLegs and mirror, per `archive/2026-04-24-add-protomech-combat-behavior/notepad/learnings.md`)
- Add explicit 40/20/20/10/10 ratio assertions to vehicle armor diagram tests (TechManual pp.86-87 distribution; current tests check location *presence* only)

### Phase B — Documentation backfills (low risk, accountability work)
- Backfill `archive/2026-04-25-add-aerospace-construction/notepad/decisions.md` documenting the PR #388 retroactive spec additions (`VAL-AERO-WING-HEAVY`, `VAL-AERO-BOMB-BAY`)
- Add JSDoc warning on `ICombatOutcome.pilotState` documenting that `'KIA'` is unreachable in Wave 4 (no engine event flips `pilotConscious=false`)
- Replace `armor.ts:164` bare `Body: 0` placeholder with explicit policy comment OR add interim `VAL-VEHICLE-BODY-DISALLOWED` rule

### Phase C — Spec/code decisions (require deliberate calls)
- Resolve vehicle 9.3 chin turret −1 pivot penalty (currently half-implemented): land the penalty OR formally de-scope from `firing-arc-calculation` spec
- Resolve archived `wire-piloting-skill-rolls` task 2.3 HeadStructureDamage PSR (deferred with thin rationale): implement head-breach pilot damage + consciousness check OR delete from spec

(Originally proposed: `pendingPSRs` turn-boundary clear. Pre-authoring verification showed the clear is already implemented in `applyTurnStarted:60` per archived `wire-piloting-skill-rolls` task 1.3 — see design **D3** Audit Correction. Demoted to a Phase A regression test.)

## Capabilities

### New Capabilities

(none — this is a cleanup wave; all changes are deltas against existing specs)

### Modified Capabilities

- `heat-management-system`: Add explicit TSM + heat-9 walk-MP test scenario closing the verifier PARTIAL on the archived `wire-heat-generation-and-effects` change.
- `protomech-unit-system`: Add Quad ProtoMech location-remap requirement with test scenario (RightArm→FrontLegs and mirror).
- `armor-diagram`: Add scenario asserting vehicle auto-allocate distributes armor at the canonical 40/20/20/10/10 ratio (TechManual pp.86-87).
- `firing-arc-calculation`: Resolve vehicle chin-turret pivot rule — either add SHALL block enforcing the −1 penalty OR remove the deferred-penalty reference if formally de-scoped.
- `piloting-skill-rolls`: (1) Add `pendingPSRs` turn-boundary clear semantics to the queue lifecycle requirement; (2) Resolve HeadStructureDamage PSR — add SHALL block for head-breach pilot damage + consciousness PSR OR remove the orphaned task reference from the historical spec.
- `combat-resolution`: Document `ICombatOutcome.pilotState === 'KIA'` Wave-4 unreachability so consumers (post-battle-review, repair-queue, roster processors) plan around it.

## Impact

- **Code touched (Phase A + B):**
  - `src/utils/gameplay/movement/__tests__/` (new TSM+heat test file)
  - `src/utils/gameplay/protomech/__tests__/` (new Quad location-remap test file)
  - `src/components/customizer/vehicle/__tests__/VehicleArmorDiagram.test.tsx` and/or `src/stores/__tests__/useVehicleStore.autoAllocate.test.ts` (ratio assertions)
  - `src/types/combat/CombatOutcome.ts` (JSDoc on `pilotState`)
  - `src/utils/construction/vehicle/armor.ts:164` (Body BAR placeholder cleanup)

- **Code touched (Phase C, depends on per-item decision):**
  - Vehicle chin turret penalty: potentially `src/utils/gameplay/firingArc/` and `src/utils/gameplay/toHit/` (if landing) OR spec-only delta (if de-scoping)
  - `pendingPSRs` clear: potentially `src/engine/applyPhaseChanged*` (if implementing) OR spec-only policy note (if documenting)
  - Head-breach PSR: potentially `src/utils/gameplay/psr/` + `src/utils/gameplay/damage/` (if landing) OR spec-only removal (if de-scoping)

- **Documentation:**
  - `openspec/changes/archive/2026-04-25-add-aerospace-construction/notepad/decisions.md` (new file in archived change directory — write through to archive)

- **Out of scope (handled by parallel `tier4-followups` team workers):**
  - BLK manifest `bv: null` field
  - Post-battle review-UI reviewed-flag
  - Interactive-combat PSR queue integration (`wire-interactive-psr-integration` is a separate authored change)

- **Dependencies:** This change should LAND AFTER the three Tier 4 HIGH-severity PRs merge, so that any spec updates here build on the post-Tier-4 baseline.

## Non-goals

- No new combat features, no new unit types, no new construction rules.
- No refactoring outside the audit findings — single-purpose cleanup wave.
- No coordination with the in-flight HIGH-severity workers — those are tracked separately.
