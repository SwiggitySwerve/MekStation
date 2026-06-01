# Auto-Land Short WiGE Movement

## Why

The tactical map currently fails closed for positive-altitude WiGE-style units
instead of projecting the horizontal move and the automatic landing consequence
MegaMek applies when they move too short a distance. That keeps the UI safe, but
it leaves AirMek, WiGE vehicle, and Glider ProtoMek movement unexplained: a
player can see altitude controls, yet cannot preview the source-backed
minimum-distance landing rule from the map.

## What Changes

- Allow represented positive-altitude WiGE-style units to use the shared WiGE
  movement projection instead of the prior ground-projection block.
- Project the MegaMek short-distance automatic landing consequence on reachable
  non-jump WiGE paths.
- Replay automatic landing as runtime movement-state changes after the committed
  move so later map, combat, and replay consumers agree with the engine state.
- Preserve explicit altitude-control/takeoff and jump exemptions so a recent
  climb or jump does not get auto-landed by this slice.

## Source Notes

- MegaMek `MovePath.automaticWiGELanding(...)` requires airborne WiGE movement
  to land after moving fewer than five hexes, with Glider ProtoMeks exempt once
  they move four hexes, unless the path jumped, took off, or used hover-style
  movement.
- MekStation represents altitude through `vehicleAltitude`, `protoAltitude`, and
  `lamAirMekAltitude`; automatic landing should use the same replayable runtime
  state channel rather than a UI-only correction.
