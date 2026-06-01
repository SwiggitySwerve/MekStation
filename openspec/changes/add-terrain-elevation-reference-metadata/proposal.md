# Add Terrain/Elevation Reference Metadata

## Why

Top-down and isometric hexes already render compact terrain and elevation badges, but the badge DOM only exposed formatted text. The broader tactical map goal needs terrain type and elevation to remain easy to reference while overlays, camera mode, and accessibility surfaces stack.

## What Changes

- Expose raw elevation value, sign, and projection mode on each elevation badge.
- Expose terrain feature count, feature level/depth/intensity, and projection
  mode on each terrain badge.
- Include terrain feature level/depth/intensity in the hex reference label so
  stacked terrain remains understandable without relying only on color.
- Keep the visible badge layout unchanged so this remains a narrow readability/reference improvement.

## Out of Scope

- Changing movement, combat, LOS, or terrain-cost rules.
- Changing the visible terrain/elevation badge layout.
