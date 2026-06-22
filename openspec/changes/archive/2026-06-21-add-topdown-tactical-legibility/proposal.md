# Change: Add Top-Down Tactical Legibility

## Why

The spec already requires elevation to be "visible as a readable number on or near the hex" (tactical-map-interface -> Top-Down Terrain And Elevation Readability). Current code now has an `ElevationBadge` path, but it is always-on, renders noisy elevation-0 badges, lacks a layer toggle and zoom readability threshold, and is not constrained to top-down mode. Players still need a controllable, playable-zoom elevation layer that reads cleanly on dense maps. Movement overlay states also lean on color tints alone for the walk/run and blocked distinctions, which fails the goal that overlays communicate "without relying only on color."

## What Changes

- Refine the existing per-hex elevation badge into a persistent, toggleable top-down layer that renders only non-zero elevations at playable zoom levels, fed by the same terrain seed the projection uses (no new data source).
- Add non-color-only encodings to the movement overlay: a distinct hatch/icon for blocked tiles and a secondary (non-hue) encoding distinguishing walk from run reach, complementing the existing jump diagonal pattern and MP cost text.
- Keep terrain glyphs/labels distinguishable under the new badge layer (legibility constraint, not a redesign).

## Capabilities

### New Capabilities

(none)

## Modified Capabilities

- `tactical-map-interface`: "Top-Down Terrain And Elevation Readability" gains persistent elevation-badge scenarios (visibility, zoom behavior, toggle, single data source); "Reachable Hex Overlay by MP Type" gains non-color-only encoding scenarios for blocked tiles and the walk/run distinction.

## Impact

- `src/components/gameplay/HexMapDisplay/HexCell.labels.tsx`, `HexCell.tsx` (badge layer), `HexMapDisplay.layers.tsx` / `Overlays.tsx` (movement overlay encodings), overlay legend components.
- Visual smoke (`tactical-map-visual-smoke`) and Storybook stories for HexMapDisplay states.
- No engine, projection, or rules changes; no combat-resolution delta - does not change the
  archived `add-battlemech-combat-validation-suite` baseline or the current `validate:combat` /
  `validate:combat:gaps` accounting.

## Non-goals

- No isometric work (separate change: `add-isometric-elevation-extrusion`).
- No projection/engine agreement work (separate change: `fix-tactical-projection-agreement-gaps`).
- No new per-hex to-hit surfacing - combined hover explanation and combat tooltip requirements already cover combat context per hex.
- No terrain art overhaul; existing terrain visuals stay, badges layer on top.
