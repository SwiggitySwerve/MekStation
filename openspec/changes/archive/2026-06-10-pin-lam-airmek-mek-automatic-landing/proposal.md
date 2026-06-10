# Pin LAM AirMek-to-Mek Automatic Landing

## Why

MekStation now tracks represented AirMek WiGE elevation separately from
aerospace altitude. MegaMek treats a LAM that converts from AirMek mode to Mek
mode as automatically landing at the end of movement, so MekStation should not
leave positive `lamAirMekAltitude` state behind after the map command converts
the unit into Mek mode.

Without this slice, a tactical-map preview can enter a contradictory state:
the unit is represented as Mek-mode for movement projection, while stale
AirMek elevation still remains on the unit state. The map should keep the
conversion command, replay state, and later projection state aligned.

## What Changes

- Add a replayable `lamAirMekAltitude: 0` patch when the player converts an
  elevated LAM from AirMek mode to Mek mode.
- Preserve the existing source-backed two conversion steps and zero conversion
  MP for AirMek-to-Mek conversion.
- Keep AirMek-to-Fighter conversion from implicitly clearing AirMek elevation.
- Prove replayed AirMek-to-Mek conversion state no longer leaves a stale
  altitude-control blocker for the converted Mek-mode unit.

## Source Pins

- MegaMek `MovePath.java:1699-1712` marks a LAM converting from AirMek to Mek
  mode as automatic WiGE landing when the unit has positive clearance.
- MegaMek `MovePathHandler.java:1493-1503` routes a WiGE DOWN step with
  clearance 0 through LAM landing resolution and treats landing as ending
  movement.

## Out Of Scope

- Full airborne AirMek/WiGE pathfinding.
- Landing PSR/damage resolution, velocity, and hover/takeoff sequencing.
- Automatic WiGE landing for non-conversion movement paths that fail minimum
  airborne movement distance.
