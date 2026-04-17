# Change: Add LOS and Firing Arc Overlays

## Why

Players need two tactical answers constantly: "what can I shoot from
here?" and "can I actually see that target?" The engine has both firing
arcs and line-of-sight math, but the UI exposes neither. Players guess,
click, get an unexpected to-hit modifier, and then backtrack. Phase 7
surfaces this as visible overlays: when a unit is selected, the three
firing arcs shade the map; when a target is hovered, a colored LOS line
shows clear / partial / blocked.

## What Changes

- When a friendly unit is selected, render hex-shading for its firing
  arcs: front 60 degrees green, left/right side 60 degrees yellow, rear
  60 degrees red-pink
- Arc shading only shows for hexes within weapon range + with any
  eligible weapon
- When hovering a target hex, draw an LOS line from selected unit to
  target
  - Solid green: clear LOS (no cover)
  - Dashed yellow: partial cover (woods, hull-down target)
  - Red: fully blocked (wall, height, heavy woods occlusion)
- LOS line annotates the blocking hex(es) when partial or blocked
- Arc / LOS overlays toggle off when no unit is selected or during an
  animation

## Dependencies

- **Requires**: `add-interactive-combat-core-ui` (selection + phase
  HUD), `firing-arc-calculation`, `tactical-map-interface`, existing
  LOS logic in the engine
- **Related**: `add-attack-phase-ui` (attacker selection consumes the
  same arcs), `add-terrain-rendering` (LOS blocking logic depends on
  terrain states)
- **Required By**: none — Phase 7 presentation layer

## Impact

- Affected specs: `firing-arc-calculation` (MODIFIED — expose UI-ready
  per-hex arc classification), `tactical-map-interface` (MODIFIED —
  new arc shading + LOS line overlay), new `line-of-sight-visualization`
  (ADDED — LOS line states, blocking annotations, color grammar)
- Affected code: new
  `src/components/gameplay/overlays/FiringArcOverlay.tsx`, new
  `src/components/gameplay/overlays/LineOfSightOverlay.tsx`, new
  `src/utils/overlays/arcClassifier.ts` that labels each hex as
  front/side/rear for the selected unit, new `losClassifier.ts`
  returning clear/partial/blocked with blocking hex refs
- Non-goals: multi-target LOS preview (single hover at a time),
  indirect-fire arcs (separate change in future), 3D LOS visualization
  (shelved)
- Database: none
