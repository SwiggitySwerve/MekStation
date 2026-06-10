# Block Airborne VTOL/WiGE Ground Projection

## Why

MekStation has ground-cost projection for VTOL and WiGE motive modes, but it
does not yet model the full altitude-aware path controls for represented
airborne VTOL/WiGE states: climb, descend, hover, landing, clearance, and
automatic WiGE landing. When a represented vehicle already has positive
altitude, showing ordinary ground movement as legal would make the map less
trustworthy than the engine/source rules.

## What Changes

- Detect altitude-tracked vehicle/protomech/aero states when the active
  projection mode is VTOL or WiGE.
- Block ground movement projection for represented airborne VTOL/WiGE movement
  with a player-visible altitude-control reason.
- Preserve current landed/hover VTOL/WiGE ground projection behavior when
  altitude is zero or not represented.
- Prove projection and commit validation return the same blocked result.

## Source Pins

- MegaMek `Entity.java:12004-12022` defines airborne VTOL/WiGE state from
  VTOL/WiGE movement, elevation, and building/bridge clearance.
- MegaMek `MovementDisplay.java:2276-2291` switches airborne entities to
  altitude controls and keeps grounded WiGE elevation controls separate.
- MegaMek `MovePath.java:1689-1741` represents airborne WiGE landing/hover
  behavior separately from ordinary ground movement.

## Out Of Scope

- Full airborne VTOL/WiGE altitude pathing, hover-step sequencing, takeoff,
  landing, velocity, clearance, or automatic landing resolution.
- Changing landed/hover VTOL/WiGE terrain and elevation-cost behavior.
- Broad external oracle differential sweeps.
