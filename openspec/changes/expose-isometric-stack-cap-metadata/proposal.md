# Expose Isometric Stack Cap Metadata

## Why

Isometric elevation stacks intentionally cap visible layers to keep the 2.5D map readable. Very tall terrain still needs to communicate its full effective height so players can understand building-plus-elevation occlusion and depth without counting only the rendered layers.

## What Changes

- Expose effective stack height, rendered layer count, cap state, and overflow layer count on isometric stack hexes.
- Render a compact cap badge on capped stacks that shows the true effective height.
- Keep isometric stacks presentation-only; movement, combat, LOS, occlusion, and depth rules continue to use the existing terrain/elevation projection data.

## Out of Scope

- Changing movement, combat, LOS, or terrain-cost rules.
- Changing isometric depth sorting or occluder selection.
- Rendering an unlimited number of stack layers.
