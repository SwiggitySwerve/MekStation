# Proposal: Add Projection Camera Control Context

## Why

The tactical map's top-down and isometric layers expose projection mode,
rotation step, depth ordering, and occluder metadata, but the controls that
switch views and rotate the isometric camera still expose only generic button
labels. Browser and accessibility checks should be able to inspect the control
surface that changes presentation state before interpreting the highlighted
isometric battlefield behind it.

Projection and rotation controls should advertise their presentation channel,
current/target mode, current/next camera heading, and shared tactical projection
source. This keeps camera controls explainable without adding a separate
rules-calculation path.

## What Changes

- Add projection-source, channel, rules-surface, current-mode, target-mode, and
  camera-heading metadata to the top-down/isometric projection toggle.
- Add projection-source, camera-channel, current-heading, and next-heading
  metadata to isometric rotation controls.
- Expand component and browser smoke coverage for the control metadata.

## Out of Scope

- Changing movement, combat, LOS, terrain, or elevation calculations.
- Changing isometric depth sorting, occluder selection, or rotation behavior.
- Adding pointer gesture rotation.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `HexMapDisplay.controls`
- Tests: focused visual-layer control assertions and tactical-map browser smoke
