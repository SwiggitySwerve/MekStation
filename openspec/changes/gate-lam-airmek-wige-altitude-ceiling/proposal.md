# Gate LAM AirMek WiGE Altitude Ceiling

## Why

The tactical map already resolves represented LAM AirMek conversion as WiGE
movement, and VTOL/WiGE-style altitude controls now reserve MP before later map
movement. MegaMek gives Land-Air 'Mechs in AirMek/WiGE mode a distinct +25
elevation envelope while keeping that elevation separate from aerospace
altitude, so MekStation needs the same replayable command path before the map
can truthfully explain elevated AirMek movement states.

## What Changes

- Track selected LAM AirMek WiGE elevation separately from aerospace altitude.
- Let AirMek Climb/Descend dispatch replayable runtime movement-state changes
  through the same altitude-control MP reserve path used by VTOL/WiGE vehicles
  and ProtoMek Gliders.
- Cap AirMek Climb at the MegaMek source-backed +25 WiGE elevation ceiling.
- Treat elevated AirMek ground movement projection as altitude-control-owned so
  map highlights explain the blocked ground path before commit.

## Source Pins

- MegaMek `Entity.java:2561-2573` gives LandAirMek WiGE movement a maximum of
  current hex level + 25 while ordinary WiGE movement remains level + 1 and
  ProtoMek WiGE remains level + 12.
- MegaMek `Entity.java:2426-2518` uses the same UP/DOWN elevation gate for
  WIGE and VTOL-style movement, with WIGE water descent allowed down to the
  current hex level.
- MegaMek `LandAirMek.java:1806-1812` documents that aerospace altitude is not
  the same as ground-map elevation; grounded AirMeks use normal elevation until
  full airborne aerospace state takes over.

## Out Of Scope

- Full elevated AirMek/WiGE pathfinding while altitude-control elevation is
  positive.
- Full takeoff, landing, velocity, automatic WiGE landing, and airborne
  aerospace sequencing.
- New isometric rendering affordances for elevated AirMeks beyond the existing
  blocked-projection altitude metadata.
