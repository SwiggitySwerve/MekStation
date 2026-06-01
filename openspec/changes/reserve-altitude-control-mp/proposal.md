# Reserve Altitude-Control MP in Movement Projection

## Why

VTOL/WiGE Climb and Descend controls are now replayable runtime movement-state
actions, but the following ground movement overlay must spend the represented
UP/DOWN step MP before showing reachable hexes. Without that reserve, a player
can descend or climb and still see a full ground movement budget even though
MegaMek models UP/DOWN as movement steps.

## What Changes

- Replay altitude-control action metadata into unit movement state as pending
  altitude-control steps and MP.
- Include pending altitude-control MP in movement projection, movement option
  metadata, hover/badge context, and committed movement validation.
- Emit pending altitude-control metadata on the movement declaration that
  consumes it, then clear the pending reserve from replayed unit state.

## Source Pins

- MegaMek `MoveStep.java`: movement steps default to 1 MP before special-case
  overrides, and VTOL UP/DOWN steps preserve that cost.
- MegaMek `MovementDisplay.java`: Climb/Descend add `MoveStepType.UP` and
  `MoveStepType.DOWN` before later movement.
- MegaMek `Entity.java`: `canGoUp` / `canGoDown` gate whether represented
  VTOL/WiGE altitude controls are legal.

## Out Of Scope

- Full multi-step airborne pathfinding.
- Terrain-clearance-specific UP/DOWN legality for buildings, bridges, woods,
  water, and WiGE landing edge cases beyond the existing altitude command
  bounds.
- Replacing the existing ground movement event path with a full MegaMek
  movement-step replay model for all vehicle flight.
