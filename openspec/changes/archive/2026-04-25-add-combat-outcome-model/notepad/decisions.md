# 2026-04-25 apply

## Summary

Closing out Wave 1 of `add-combat-outcome-model`. The engine-side
`ICombatOutcome` schema, `deriveCombatOutcome` derivation, session
integration (`InteractiveSession.getOutcome()` + `CombatNotCompleteError`),
and version guard are all in place and verified by 25 unit tests in
`src/lib/combat/outcome/__tests__/combatOutcome.test.ts`. Kill-attribution
(task 7.4) and full 4-mech outcome shape (task 7.7) tests landed during this
session. Remaining open items are explicit Wave 4 (persistence) and Wave 5
(pilot-event derivation) deferrals.

## Wave 4 deferrals (persistence pipeline)

- **Tasks 4.1-4.4**: storage of `ICombatOutcome` to `/api/matches` deferred to
  Wave 4. No Wave 1 consumer reads persisted outcomes — in-memory
  `getOutcome()` on `InteractiveSession` (`src/engine/InteractiveSession.ts`)
  is sufficient for the tests in `src/__tests__/integration/phase3RoundTrip.test.ts`.
  Pickup: extend the matches POST handler when Wave 4 begins.

## Wave 5 deferrals (pilot-event pipeline)

- **Tasks 2.4, 3.3, 7.5**: pilot-event derivation (`PilotHit`,
  `PilotConsciousnessCheck`, kill attribution beyond the report-level
  `units[].kills`, plus the formal session-event-stream
  `CombatOutcomeReady` entry) is blocked on the pilot/personId roster
  pipeline that Wave 5 owns. Current `pilotState` derives from
  `IUnitGameState.pilotConscious` + `pilotWounds` only at
  `src/lib/combat/outcome/combatOutcome.ts:128-133`. The KIA branch is
  *coded* but unreachable today because no event flips
  `pilotConscious=false` — the test at line 527-532 of the test file
  intentionally only asserts that `pilotState` exists and `conscious` is a
  boolean to document this Wave 1 limitation without baking it into a
  brittle assertion.

## Test/doc deferrals

- **Task 7.8**: fuzz test out of scope for Wave 1 — needs a stable
  event-payload generator that doesn't exist yet; revisit after Wave 4
  pins the persistence schema.
- **Task 8.2**: user-facing `docs/combat/combat-outcome.md` deferred until
  Wave 5 persistence + pilot wiring lands so the worked example reflects
  the production pipeline rather than the in-memory Wave 1 shape.
- **Task 5.2**: migration doc deferred until first real migration is
  needed; JSDoc on `ICombatOutcome` and the `assertCombatOutcomeCurrent`
  guard at `src/types/combat/CombatOutcome.ts` cover the basic
  forward-compat story.

## Spec annotations

The verifier rejects bare task-level DEFERREDs, so each affected SHALL
block in the three delta specs now carries a `> PARTIALLY DEFERRED to
Wave N: ...` blockquote pointing at the implementation file:line and the
specific gap. See:

- `specs/after-combat-report/spec.md` — schema, per-location damage,
  destroyed components, ammo consumption, pilot XP-eligible events,
  pilot wounds/consciousness, final unit/pilot status classification
- `specs/combat-resolution/spec.md` — terminal outcome derivation,
  outcome carries scenario linkage
- `specs/game-session-management/spec.md` — session persists outcome

## Downstream impact

With Wave 1 of `add-combat-outcome-model` closed, the following Tier 4
specs are now unblocked:

- `add-post-battle-review-ui` — can read `outcome.report.*` directly
- `add-repair-queue-integration` — can read
  `outcome.unitDeltas[].destroyedLocations` /
  `destroyedComponents` / `internalsRemaining`

Wave 4/5 work that *modifies* `ICombatOutcome` should add new fields
(rather than reshape existing ones) and bump `COMBAT_OUTCOME_VERSION` so
the `assertCombatOutcomeCurrent` guard catches stale stored outcomes.
