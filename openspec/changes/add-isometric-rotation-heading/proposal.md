# Add Isometric Rotation Heading

## Why

Isometric mode already supports discrete rotation, but the map controls only expose rotate-left and rotate-right actions. Players can click through camera angles without an explicit current heading, which makes it harder to compare views of tall terrain and occluded units.

## What Changes

- Add a compact visible heading label to the isometric rotation controls.
- Expose the current rotation step and degree value as machine-readable attributes.
- Keep rotation render-only: axial coordinates, click targets, movement legality, and combat projection remain unchanged.

## Out of Scope

- Changing isometric projection math, depth sorting, or terrain occlusion rules.
- Adding a full minimap/compass widget or free-camera controls.
