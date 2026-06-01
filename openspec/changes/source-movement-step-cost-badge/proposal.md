# Source Movement Step Cost Badge

## Why

Reachable movement hexes can render a separate terrain/elevation step-cost
badge such as `T+1 E+2 UP2`. That badge explains why a destination costs more
MP, so it should identify the same shared movement projection evidence as the
standing movement reach badge and hover path preview.

## What Changes

- Add movement-channel projection source references, MegaMek rule references,
  and projection explanation metadata to the visible step-cost badge.
- Keep the existing terrain cost, elevation cost, elevation delta, MP cost, and
  movement legality behavior unchanged.
- Add component coverage proving the cost badge is tied to the shared
  `movement:megamek` projection.

## Out Of Scope

- Changing terrain/elevation MP math, movement pathfinding, destination
  legality, movement commit validation, combat projection, terrain import, LOS,
  or isometric rendering.
