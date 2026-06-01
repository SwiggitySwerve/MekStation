# Source Hover Path Preview Badge

## Why

The map's normal movement badge exposes movement type, motive mode, MP cost,
terrain/elevation details, heat, and shared projection provenance. When the
player hovers a reachable destination, that badge is replaced by the path
preview MP badge. The hover badge kept the movement type visible, but it did
not carry the same cost breakdown or `movement:megamek` source references.

That weakens the tactical explanation layer at the exact moment the player is
previewing a movement commit.

## What Changes

- Expand the hovered path MP badge with terrain cost, elevation delta/cost,
  heat, movement source references, rule references, and projection
  explanation metadata.
- Include terrain/elevation/heat details in the hover badge accessible label.
- Add regression coverage proving the hover path preview badge remains tied to
  the shared rules-backed projection, including same-hex movement options.

## Impact

This is a display/provenance change only. It does not alter movement
pathfinding, destination legality, commit validation, combat, LOS, terrain
import, or parser behavior.
