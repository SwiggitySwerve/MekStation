# Surface Airborne Altitude-Control Context

## Why

Altitude-positive VTOL/WiGE vehicles are blocked from ordinary ground movement
projection because MegaMek treats their represented altitude state as airborne
and routes those units through altitude controls. The tactical map already
blocks those projections; players and tests also need the blocked hex itself to
carry the represented control mode and altitude that explain the rejection.

## What Changes

- Carry altitude-control required/mode/altitude context on blocked VTOL/WiGE
  movement projections.
- Expose that context through top-down hex metadata, movement badges, invalid
  badges, aria labels, tooltip reason rows, and same-hex option metadata.
- Keep the fields explanatory only; they do not add airborne pathing or
  altitude-transition commands.

## Source Pins

- MegaMek `Entity.java:12004-12022` treats VTOL and WiGE units with positive
  elevation as airborne unless they are on a building or bridge surface.
- MegaMek `MovePath.java:1699-1741` uses airborne WiGE state to decide
  automatic landing and hover handling after movement.
- MegaMek `MovementDisplay.java` routes airborne VTOL/WiGE handling through
  altitude/hover/takeoff/landing controls instead of ordinary ground projection.

## Out Of Scope

- Full airborne VTOL/WiGE pathing, hover, takeoff, landing, or altitude-change
  controls.
- Building/bridge-surface clearance modeling for represented vehicle altitude.
- Changing combat, LOS, token altitude rendering, or physical-attack altitude
  rules.
