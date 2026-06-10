# Add Isometric Occlusion Rotation Sweep

## Why

Isometric mode already computes camera-dependent tall-terrain occlusion and can
rotate the battlefield. The follow-up tracker still needs rendered interaction
evidence that rotating the actual map surface recalculates which elevated hexes
may hide units. Without that proof, helper-level coverage can drift from what
players see when they rotate around stacked terrain.

## What Changes

- Expose the isometric camera rotation step on rendered occlusion metadata for
  scene tokens, occluder highlights, and elevation stacks.
- Include the camera step in the scene token accessibility label when terrain
  occlusion is present.
- Add focused rendered coverage that rotates the isometric camera 180 degrees
  and verifies the active occluder moves from one tall hex to the opposite tall
  hex.
- Update rule-trust tracking to distinguish this rendered occlusion-rotation
  sweep from the broader mobile/device gesture matrix that remains follow-up
  work.

## Out Of Scope

- Full mobile device gesture-matrix validation.
- Changing movement, combat, terrain, elevation, LOS, or fog projection rules.
- Replacing the current 2.5D projection with a full 3D camera.
