# Gate ProtoMek WiGE Altitude Ceiling

## Why

The altitude-control command surface now honors ordinary VTOL/WiGE terrain
clearance, but ProtoMek Gliders are a represented combat state with their own
WiGE-style altitude envelope. MegaMek caps ProtoMek WiGE climb at 12 levels
above the surface, so MekStation should not leave Glider altitude changes as an
untracked UI-only gap.

## What Changes

- Surface selected ProtoMek Glider altitude into the movement command context.
- Let Glider Climb/Descend dispatch replayable runtime movement-state changes
  through the same altitude-control MP reserve path used by VTOL/WiGE vehicles.
- Cap ProtoMek Glider Climb at the MegaMek source-backed altitude 12 ceiling.
- Treat airborne Glider ground movement projection as altitude-control-owned so
  map highlights explain the blocked ground path before commit.

## Source Pins

- MegaMek `Entity.java:2561-2569` gives ProtoMek WiGE movement a maximum
  altitude of current hex level + 12.
- MegaMek `ProtoMek.java:947-952` identifies Glider WiGE altitude as a special
  elevation-down envelope.
- MegaMek `MovementDisplay.java:2276-2291` enables altitude controls from
  `canGoUp` / `canGoDown`.

## Out Of Scope

- Full ProtoMek Glider pathfinding while airborne.
- LAM AirMek altitude controls and the LandAirMek +25 ceiling.
- Full takeoff, landing, velocity, and automatic WiGE landing sequencing.
