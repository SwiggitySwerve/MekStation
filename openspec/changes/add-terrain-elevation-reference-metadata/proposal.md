# Add Terrain/Elevation Reference Metadata

## Why

Top-down and isometric hexes already render compact terrain and elevation badges, but the badge DOM only exposed formatted text. The broader tactical map goal needs terrain type and elevation to remain easy to reference while overlays, camera mode, and accessibility surfaces stack.

## What Changes

- Expose raw elevation value, sign, and projection mode on each elevation badge.
- Expose terrain feature count and projection mode on each terrain badge.
- Keep the visible badge layout unchanged so this remains a narrow readability/reference improvement.

## Out of Scope

- Changing movement, combat, LOS, or terrain-cost rules.
- Changing the visible terrain/elevation badge layout.
