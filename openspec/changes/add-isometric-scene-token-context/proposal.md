# Proposal: Add Isometric Scene Token Context

## Why

Isometric mode depth-sorts tokens separately from their nested token renderer.
The nested token already exposes unit type, altitude, visibility, target, and
occlusion context, but the depth-sorted scene wrapper is the surface used to
prove ordering and foreground boosts. That wrapper should be inspectable without
recalculating rules or requiring a test/user to drill into the child token SVG.

## What Changes

- Add a title and accessible label to each isometric scene token wrapper.
- Summarize the displayed map position, source position, facing, unit type,
  represented altitude/velocity or VTOL altitude where present.
- Include combat-projection target state, terrain-occlusion foreground boost,
  fog/last-known state, and terrain-occlusion reason from existing inputs.

## Out of Scope

- Changing isometric depth sorting, foreground-boost rules, LOS, fog, or combat
  target legality.
- Adding new token chrome.
- Reworking unit token renderers.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/HexMapDisplay.tsx`
  and `src/components/gameplay/HexMapDisplay/HexMapDisplay.isometricSceneLabels.ts`
- Tests: focused isometric render coverage for token wrapper labels
