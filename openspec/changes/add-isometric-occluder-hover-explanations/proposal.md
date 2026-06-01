# Proposal: Add Isometric Occluder Hover Explanations

## Why

Isometric mode highlights tall terrain that may hide units, but the hover tooltip still only explains ordinary terrain. Players need the same readable context in the HTML tooltip that the SVG layer already knows: which unit ids may be hidden, from which camera rotation, and why the terrain is acting as an occluder.

## What Changes

- Thread existing isometric occluder projection data into map hover overlays.
- Add tooltip rows for terrain, movement, combat, unreachable, and combined tactical hover states when the hovered hex is an isometric occluder.
- Keep stale occluder rows out of the tooltip when camera rotation no longer marks that hex as an occluder.

## Out of Scope

- Changing occlusion geometry, line of sight, or combat legality.
- Changing top-down terrain tooltips.
- Adding new camera controls.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/*`
- Tests: focused render coverage for isometric terrain hover explanations and rotation cleanup
