# Change: Add Terrain Rendering

## Why

The Phase 1 MVP draws hexes as flat colored polygons with a label. The
terrain engine already models woods density, building hardness, water
depth, rough/rubble/pavement, and elevation — but none of that shows on
the map. A player currently has no visual cue that a hex is a heavy
woods hex with +2 movement cost until they read the overlay tooltip. For
a Civilization-grade presentation, each terrain type needs a recognizable
illustrative style, and elevation needs gradient shading that the eye
can read at a glance.

## What Changes

- Render illustrative terrain art per hex type: light woods, heavy woods,
  light / medium / heavy / hardened buildings, shallow / deep water,
  rough, rubble, pavement, clear
- Shade hexes by elevation using a gradient (level 0 default, +N lighter,
  -N darker) with a subtle contour edge at elevation transitions
- Stack terrain: woods sit on top of a clear base; buildings sit on top
  of pavement where present; depth shading applies beneath terrain art
- All terrain art is homemade (not licensed) and consistent in style with
  the mech silhouettes
- Terrain tooltips and overlays continue to surface movement cost,
  to-hit modifier, cover — layered over the new art

## Dependencies

- **Requires**: `add-interactive-combat-core-ui` (Phase 1 MVP shipped),
  `tactical-map-interface`, `terrain-system` (terrain model), existing
  `renderHelpers.ts` hex path generation
- **Related**: `add-mech-silhouette-sprite-set` (same art style),
  `add-los-and-firing-arc-overlays` (renders on top of terrain)
- **Required By**: none — Phase 7 presentation layer

## Impact

- Affected specs: `terrain-system` (MODIFIED — add visual rendering
  contract; terrain types now declare a visual style key),
  `tactical-map-interface` (MODIFIED — hex render now composes a terrain
  art layer + elevation shading layer beneath the token layer), new
  `terrain-rendering` (ADDED — art catalog keys, elevation gradient
  formula, layer stacking order)
- Affected code: `src/components/gameplay/HexMapDisplay/HexCell.tsx`
  (render terrain art under the hex polygon), new
  `src/components/gameplay/terrain/` directory housing
  `TerrainArtLayer.tsx` and SVG assets, new
  `src/utils/terrain/elevationShading.ts` for the gradient formula
- Non-goals: animated terrain (wind in trees, rippling water — future),
  destructible building art (buildings change state through
  existing damage overlays, not separate animations), weather overlays,
  3D terrain height (explicitly shelved)
- Assets: new SVG files under `public/sprites/terrain/` — homemade
