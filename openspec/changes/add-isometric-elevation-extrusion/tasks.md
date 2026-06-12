# Tasks: Add Isometric Elevation Extrusion

## 1. Verification of shipped rotation surface

- [ ] 1.1 Verify whether a player-facing isometric rotation control/hotkey exists (search camera controls, tactical shell command registry, keyboard handlers); record the finding in the PR description — decides whether task 3.2 is verification or implementation.
- [ ] 1.2 Confirm current `isometricDepthKey` ordering semantics and the six-step rotation lookup with a characterization test (pins pre-extrusion behavior before scene-builder changes).

## 2. Extrusion rendering

- [ ] 2.1 Add the per-step camera-facing face-selection lookup (pure function, six cases) with unit tests for all six headings.
- [ ] 2.2 Emit extrusion face polygons for elevation > 0 hexes in `buildIsometricSceneItems` with height `elevation × ISO_ELEVATION_UNIT`, darkened terrain tint per face, `pointer-events: none`, memoized for referential stability.
- [ ] 2.3 Rank faces immediately beneath their owner hex's top face in the shared depth ordering; assert token-vs-top ordering unchanged.
- [ ] 2.4 Full-rotation-cycle test: no lower hex paints over a nearer higher hex's faces at any heading; occluder metadata byte-identical with extrusion on/off.

## 3. Camera-controls rotation retro-spec

- [ ] 3.1 Add camera-controls Jest coverage for: six-heading cycle, centerOn preservation under active heading, reduced-motion instant heading change.
- [ ] 3.2 Implement (or verify, per 1.1) the player-facing rotate control + hotkey next to existing camera controls; hidden/disabled in top-down; restores last heading on isometric re-entry.
- [ ] 3.3 (Stretch, droppable) Interpolated rotation transition between headings, fully disabled under reduced motion.

## 4. Stories, smoke, verification

- [ ] 4.1 Storybook stories: adjacent cliffs, unit in a pit behind a wall, six-heading rotation cycle on a mountainous fixture.
- [ ] 4.2 Update tactical-map visual smoke baselines for isometric scenes.
- [ ] 4.3 `npx tsc --noEmit --skipLibCheck`, lint, affected Jest suites, Storybook build green; pan/zoom perf on a mountainous 30×34 map shows no regression vs the W5 baseline; `npx openspec validate add-isometric-elevation-extrusion --strict`.
