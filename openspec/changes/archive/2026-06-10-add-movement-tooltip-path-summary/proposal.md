# Add Movement Tooltip Path Summary

## Why

Movement range entries already carry the path used to reach a destination, and the map renders numbered path badges. The hover tooltips show MP cost, terrain, elevation, heat, and stand-up rules, but they do not summarize how many path steps the projected destination uses.

That leaves the route context split between small on-hex badges and hidden projection metadata instead of the main map explanation surface.

## What Changes

- Show a path step summary in movement-only hover tooltips when movement projection includes a path.
- Show the same path summary in combined movement+combat hover tooltips.
- Preserve existing movement, combat, terrain, stand-up, and blocked-reason rows.

## Out of Scope

- Changing pathfinding, movement legality, MP calculation, or path rendering.
- Rendering the full coordinate list in the tooltip.
