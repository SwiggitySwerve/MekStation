# Add Isometric Touch Camera Gesture

## Why

Isometric mode already supports button and keyboard rotation, plus touch pan and
pinch zoom. Touch-first play still has to find the small rotate buttons to see
behind tall elevation stacks. A direct two-finger twist should rotate the same
discrete isometric camera heading while continuing to use the shared projection
state that drives top-down terrain, movement, combat, LOS, and visibility
highlights.

## What Changes

- Add a two-finger touch rotation gesture for isometric mode.
- Keep the gesture discrete: each 60-degree twist maps to one isometric camera
  heading step.
- Preserve existing touch pan and pinch zoom behavior on the same map surface.
- Expose the touch rotation contract in isometric camera metadata for browser
  and accessibility verification.
- Add focused render coverage for mouse pan, touch pan, pinch zoom, and touch
  rotation sharing the isometric camera surface.

## Out Of Scope

- Full mobile device gesture-matrix validation.
- Changing movement, combat, terrain, elevation, LOS, or visibility projection
  rules.
- Replacing the current 2.5D projection with a full 3D camera.
