# Wire VTOL/WiGE Altitude Controls

## Why

Blocked airborne VTOL/WiGE ground projections now explain that altitude controls
own the action, but the command surface still needs a replayable way to change
represented vehicle altitude so the map can recalculate the movement overlay
from engine state. Without that event path, altitude remains visible but not
actionable.

## What Changes

- Add movement-phase Climb/Descend commands for represented VTOL/WiGE vehicle
  combat state.
- Dispatch altitude changes through `RuntimeMovementStateChanged` with
  `source: "altitude_control_action"`.
- Replay altitude changes into the vehicle combat-state envelope so movement
  projection, token altitude context, and commit validation read the same
  altitude.

## Source Pins

- MegaMek `MovementDisplay.java:2276-2291` uses altitude controls instead of
  elevation controls for airborne entities.
- MegaMek `MovementDisplay.java:5268-5286` handles raise/lower altitude actions
  by adding `UP`/`DOWN` movement steps.
- MegaMek `Entity.java:2433-2540` gates whether VTOL/WiGE units can move down
  or up at the current position.
- MegaMek `Entity.java:12004-12022` treats positive-elevation VTOL/WiGE units
  as airborne unless building/bridge clearance grounds them.

## Out Of Scope

- Modeling complete UP/DOWN MP accounting or a full multi-step airborne path.
- Building/bridge/woods/water clearance-specific altitude gates beyond the
  existing conservative command bounds.
- Automatic WiGE landing, hover/takeoff/landing sequencing, or LAM airborne
  flight pathing.
