## Why

The event reducer never clears active MASC/supercharger or advances their
prior-use counters. The simulation runner leaves prior movement and pending
MP accounting behind when a unit skips movement, causing stale heat and
to-hit modifiers. Both paths need one movement lifecycle owner.

## What Changes

- Extract the existing runner booster lifecycle into the movement module.
- Share `resetPerTurnMovementState` between phaseManagement and
  SimulationRunnerState, clearing movement flags and pending costs.
- Advance booster counters once at a turn boundary, preserving the current
  0–6 normalization and first-idle-turn extra decay. Movement entry alone
  must not advance the counters again.
- Add two-turn regressions through both paths, plus a skipped-call mutant.

## Impact

Affected capability: movement-system. No event payload, replay schema pack,
or persisted-format changes. Affected historical logs can derive corrected
unit state and different server post-state digests. Existing committed replay
fixtures and golden digests must pass unchanged; any required fixture change
stops this work for Root review. Checkpoint digests are not rewritten.

Rules reference: MegaMek 48fcb2f64,
`megamek/src/megamek/common/units/Entity.java:16388–16414` and
`megamek/src/megamek/common/units/Mek.java:1240`.

## Non-goals

PSR/posture changes (C6), declaration locking (C4), full per-turn unit-state
consolidation (C7), construction, catalogs, BV, and replay migrations.
