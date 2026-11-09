## Why

Vehicle critical handlers currently add two rounds whenever the crew is stunned. MegaMek 48fcb2f64 `megamek/src/megamek/common/units/Tank.java:1065-1071` sets the first stun to two rounds and adds one round when already stunned. C14 deliberately deferred this increment rule while implementing the Initiative countdown.

## What Changes

Consolidate the four existing stun producers into `stunCrew` in `src/utils/gameplay/vehicleCrewStun.ts`, preserving behavior in the first commit. Then implement the pinned increment rule for direct critical effects and critical-event reduction, including commander/copilot effects. Replace C14's explicit old `2 -> 4` expectation with `2 -> 3`.

Affected capability: `openspec/specs/game-state-management/spec.md`. The existing countdown change, `decrement-vehicle-crew-stun`, remains intact.

## Non-goals

No terrain, piloting skill roll, motive damage, critical-table, crew casualty, or countdown changes. No event payload, persisted field, schema-pack, replay fixture, digest, or golden changes. Any committed replay/digest/golden drift is a STOP for Root, never a reason to regenerate.

## Impact

Interactive sessions, GameEngine phase helpers and runToCompletion, AI, multiplayer legacy dispatch and journal authority, P2P host translation, and standalone native vehicle simulation share these critical handlers. Replayed repeated-stun histories derive the corrected counter without changing their stored representation. Tech base and temporal availability do not affect this rule.
