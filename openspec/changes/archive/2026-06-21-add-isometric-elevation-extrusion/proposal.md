# Change: Add Isometric Elevation Extrusion

## Why

Isometric mode already ships discrete six-step camera rotation, depth sorting (`isometricDepthKey`), occlusion ghosting, and a corrected rotate-before-shear projection (audit W2 C-15, W5 centerOn fix) — but elevated hexes still render as flat tiles, so stacked elevation is hard to read as a 2.5D battlefield, and none of the shipped rotation behavior is specced in `camera-controls` (the spec has zero isometric requirements, so regressions there are invisible to spec validation). Council decision 2026-06-12: extrusion is the one remaining isometric item with legibility payoff; the shipped rotation behavior needs retro-speccing.

## What Changes

- Render stacked elevation extrusion in isometric mode: per-hex elevation skirts/walls keyed off hex elevation so height reads visually, depth-sorted with the existing `isometricDepthKey` ordering and compatible with the occlusion ghosting sweep.
- Retro-spec the shipped isometric camera rotation into `camera-controls`: six discrete headings, player-facing rotation control, center-preservation under rotation, reduced-motion behavior. Implement any part of the control surface found missing during verification.
- Optional polish (only if cheap after the above): animated rotation transition honoring reduced motion.

## Capabilities

### New Capabilities

(none)

## Modified Capabilities

- `tactical-map-interface`: "Isometric Presentation" gains stacked elevation extrusion scenarios (skirt rendering, depth ordering, occlusion interplay).
- `camera-controls`: gains an ADDED "Isometric Camera Rotation" requirement retro-speccing the shipped discrete rotation behavior and its control surface.

## Impact

- `src/components/gameplay/HexMapDisplay/HexMapDisplay.isometric.ts` (scene items + depth keys), `HexCell` isometric render path (skirt polygons), `projection.ts` (no math changes expected — consumes existing transform), camera/rotation control components.
- Isometric Jest suites, Storybook isometric stories, tactical-map visual smoke.
- No engine/projection-data changes; no combat-resolution delta — does not change the archived
  `add-battlemech-combat-validation-suite` baseline or the current `validate:combat` /
  `validate:combat:gaps` accounting.

## Non-goals

- No three.js/WebGL rewrite — the SVG substrate stays (council decision: extrusion in SVG, effort M).
- No top-down work (sibling change: `add-topdown-tactical-legibility`).
- No new occlusion semantics — existing occluder metadata/highlight requirements stand; extrusion must not change which hexes count as occluders.
- No continuous/free camera rotation; headings stay discrete.
