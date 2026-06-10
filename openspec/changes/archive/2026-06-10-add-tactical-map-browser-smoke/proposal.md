# Add Tactical Map Browser Smoke

## Why

The tactical map has focused unit coverage for top-down labels, movement/combat
metadata, isometric stacking, rotation, and occlusion. The source matrix still
needs browser-level evidence that those surfaces render together as a real SVG
map instead of only as isolated component assertions.

## What Changes

- Add a development/test-only `/e2e/tactical-map` harness rendering a compact
  tactical map with terrain, elevation, movement, combat, and an isometric
  occluder case.
- Add a Playwright smoke that verifies top-down terrain/elevation/movement/
  combat metadata, switches to isometric mode, checks occlusion/stack metadata,
  rotates the camera, and confirms rendered pixels are nonblank.
- Keep tactical rules, map state, and gameplay routes unchanged.

## Out of Scope

- Adding a player-facing map route.
- Replacing existing focused Jest coverage.
- Introducing screenshot baselines or visual diff review in this change.
