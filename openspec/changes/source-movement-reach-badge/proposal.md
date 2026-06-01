# Source Movement Reach Badge

## Why

The tactical map's standing movement reach badge is one of the first places a
player checks destination legality, MP cost, movement mode, heat, terrain, and
elevation. The hover path preview now preserves shared movement projection
source evidence, but the non-hover reach badge still exposes its costs without
directly identifying the shared `movement:megamek` projection evidence on the
badge itself.

## What Changes

- Add shared movement projection source references, rule references, and
  explanation metadata to the normal reachable movement badge.
- Keep the current movement costs, same-hex option summary, terrain/elevation
  metadata, heat metadata, and command legality behavior unchanged.
- Add component coverage proving the visible movement reach badge carries the
  same projection provenance as the rendered hex and hover explanation layer.

## Out Of Scope

- Changing movement pathfinding, destination legality, MP cost math, movement
  commit validation, combat projection, LOS, terrain import, or isometric depth
  sorting.
