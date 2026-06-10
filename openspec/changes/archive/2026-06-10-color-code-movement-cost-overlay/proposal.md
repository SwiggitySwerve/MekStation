## Why

The movement-cost overlay already exposes a readable `T#` label and terrain
metadata, but it draws every cost with the same dark marker. The tactical-map
interface requirement calls for low, medium, and high movement costs to be
visually distinguishable so players can scan difficult terrain without reading
every number.

## What Changes

- Color-code movement-cost overlay markers from the shared terrain movement
  cost value.
- Expose the derived cost band and fill color as metadata for tests and
  inspection.
- Preserve the existing `T#` label, terrain feature metadata, elevation
  metadata, and accessible title.

## Non-Goals

- Change terrain movement-cost calculation.
- Change movement reachability/pathfinding rules.
- Add impassable terrain handling beyond the current terrain-cost data model.
