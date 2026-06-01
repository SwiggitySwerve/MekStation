# Block Airborne Vehicle State Mismatch

## Why

Represented altitude-positive VTOL/WiGE vehicles must not fall back to ordinary
ground movement just because the movement capability map is stale or missing a
matching motive mode. The vehicle combat state already carries the represented
motion type and altitude, so the movement projection should fail closed from
that runtime state before trusting capability-derived pathing.

## What Changes

- Derive airborne VTOL/WiGE ground-projection blockers from represented vehicle
  combat-state motion type when altitude is positive.
- Preserve the existing landed behavior when represented altitude is zero.
- Keep preview and commit validation aligned for stale-capability VTOL/WiGE
  cases.

## Source Pins

- MegaMek `Entity.java:12004-12022` treats VTOL and WiGE movement with positive
  elevation as airborne unless the unit is on a building/bridge surface.
- MegaMek `MovePath.java:1699-1741` uses airborne WiGE state to determine
  automatic landing/hover handling at the end of movement.

## Out Of Scope

- Full airborne VTOL/WiGE pathing or altitude transition controls.
- Modeling building/bridge-surface clearance for represented vehicle altitude.
- Changing token rendering, LOS, combat, or physical-attack altitude rules.
