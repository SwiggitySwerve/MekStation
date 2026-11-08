## Why

`isStuck` is never cleared once set, so a bogged-down unit stays immobile for
the rest of the match. MegaMek frees stuck units two ways: a recovery roll
when the movement phase is prepared, and a jump when a failed ground-movement
bog-down granted jump eligibility. Only the standalone simulation runner can
make a unit stuck today; interactive play emits no terrain PSRs.

Recording either release needs replay shapes the combat physical schema pack
does not accept yet: a `swamp_unstuck` PSR reason code and an optional
`canUnstickByJumping` on `UnitStuck`.

## What Changes

This change lands in three sequential PRs.

1. Schema widening, no behaviour change (this PR):
   - Add `PSRTrigger.SwampUnstuck` (`swamp_unstuck`, category `recovery`).
   - Add optional `canUnstickByJumping` to `IUnitStuckPayload`.
   - Widen the four PSR-coded physical schemas in place at v1 and revise
     their schema ids to `combat.<type>.v1.swamp-unstuck-1`, following the
     #1947 pattern. No upcast transition: every earlier payload still parses.
   - Register the trigger in the runner catalog as a schema-only row until
     the runner lifecycle lands.
2. Runner and reducer lifecycle: movement-start recovery roll in the runner,
   jump eligibility from failed ground-movement bog-down, jump unstick, and
   the matching reducer transitions.
3. Interactive consistency: commit readiness, reachability projection and
   validator callers honour stuck state and jump eligibility.

## Impact

Affected capability: piloting-skill-rolls. Replay: old journals parse
unchanged and replay to identical digests. A checkpoint fingerprinted before
the widening is incompatible for any history holding `PSRTriggered`,
`PSRResolved`, `UnitFell` or `UnitStuck`, so those histories rebuild once by
full replay; other histories keep their fingerprint. An older build reading a
new journal that uses the new code or field fails closed into quarantine.
No projector version changes: the game reducer is not a registered replay
projector. Committed replay fixtures and golden digests must pass unchanged.

Rules: MegaMek 48fcb2f64, TWPhasePreparationManager.java:241,
TWGameManager.java:31368-31419, Terrain.java:656-682,
MovePathHandler.java:3524-3528 and 3918-3919.

## Non-goals

Interactive terrain PSRs, displacement clearing stuck, AI awareness of jump
eligibility, recovery rolls outside the runner, and PSR resolution changes.
