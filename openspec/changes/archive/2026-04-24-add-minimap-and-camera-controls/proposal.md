# Change: Add Minimap And Camera Controls

## Why

Large battlefields (30x30+ hex maps) already exceed the viewport, and
Phase 1 ships a basic pan zoom hook but no overview. Players lose their
orientation, have to zoom out to find their force, then zoom in again.
Phase 7 adds a minimap in the corner with full-map context, proper
camera controls (click-drag pan, wheel zoom, double-click unit focus)
and documented keyboard shortcuts so experienced players can drive the
map without reaching for the mouse.

## What Changes

- Minimap in the corner (top-right) showing the full map at a fixed
  small scale with unit positions colored by side
- Current camera viewport renders as a rectangle on the minimap
- Click-drag on the minimap rectangle pans the main camera
- Camera pan on the main map: click-drag on empty hex
- Camera zoom: scroll wheel (zoom-to-cursor behavior)
- Unit focus: double-click a unit token to center camera on it
- Keyboard shortcuts: WASD / arrow pan, +/- zoom, Space = recenter on
  selected unit, M = toggle minimap
- Shortcuts surfaced in an in-app help overlay (hotkey: ?)

## Dependencies

- **Requires**: `add-interactive-combat-core-ui` (Phase 1 MVP),
  `tactical-map-interface`, existing `useMapInteraction` hook
- **Related**: `add-mech-silhouette-sprite-set` (sprite glyphs feed the
  minimap dots), `add-terrain-rendering` (minimap renders a simplified
  terrain color palette)
- **Required By**: none — Phase 7 presentation layer

## Impact

- Affected specs: `tactical-map-interface` (MODIFIED — minimap panel,
  unit-focus double-click, keyboard shortcut contract), new
  `camera-controls` (ADDED — pan / zoom / focus behavior contract,
  hotkey list, in-app help overlay)
- Affected code: new `src/components/gameplay/minimap/Minimap.tsx`,
  new `src/hooks/useCameraControls.ts` that extends the existing
  `useMapInteraction` pan/zoom state, new
  `src/components/gameplay/help/HotkeyHelpOverlay.tsx`, extensions to
  `useMapInteraction.ts` for zoom-to-cursor and unit-focus actions
- Non-goals: multi-viewport layouts, picture-in-picture of another
  unit, cinematic camera paths, 3D perspective controls (shelved)
- Database: none
