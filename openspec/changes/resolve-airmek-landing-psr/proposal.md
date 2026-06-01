# Resolve AirMek Landing PSRs

## Why

Required AirMek landing-control checks now enter MekStation as canonical
`airmek_landing` PSRs. MegaMek resolves those checks during movement:
`landAirMek(...)` calls `checkAirMekLanding()`, rolls immediately through
`doSkillCheckWhileMoving(...)`, and calls `crashAirMek(...)` only on failure.
Leaving the represented map landing PSR pending until a later phase keeps the
map/engine explanation out of step with the source behavior.

## What Changes

- Resolve required AirMek landing PSRs immediately after the runtime landing
  state event and `PSRTriggered` event.
- Clear the pending AirMek landing PSR with a following `PSRResolved` event.
- Convert failed represented landing checks into the current engine fall/pilot
  hit event sequence using the landing height from the runtime command.
- Carry landing fall height on the runtime movement-state payload for replay
  and explanation.

## Source Pins

- MegaMek `MovePathHandler.java:1079-1084` calls `landAirMek(...)` when an
  AirMek automatically lands from WiGE movement.
- MegaMek `TWGameManager.java:20848-20863` updates the landing position and
  elevation, checks `LandAirMek.checkAirMekLanding()`, and rolls the control
  check during movement.
- MegaMek `TWGameManager.java:20866-20880` resolves failed landing checks via
  `crashAirMek(...)`, which delegates into `doEntityFallsInto(...)`.

## Out Of Scope

- Full armor/internal damage application from AirMek landing crashes beyond the
  existing MekStation `UnitFell`/`PilotHit` fall event model.
- Automatic forced landing from higher WiGE elevations due to insufficient
  movement.
- Full airborne AirMek/WiGE pathing, hover, takeoff, and velocity handling.
