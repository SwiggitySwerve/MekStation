# Add Terrain Elevation Hover Provenance

## Why

Terrain and elevation hover rows are the player's local explanation for why a
hex matters during movement and combat planning. The visible labels already
come from the shared tactical projection, but the hover rows should expose the
same terrain/elevation source and rule references instead of relying on nearby
aggregate projection metadata.

## What Changes

- Surface terrain/elevation projection source and rule references on
  terrain-only, unreachable, movement-only, combat-only, and combined tactical
  hover rows.
- Expose stable terrain/elevation attributes for primary terrain, feature
  levels, elevation, projection intent/status, source references, and rule
  references on those rows.
- Reuse the same terrain context row component for combined movement+combat
  hovers so combined tooltips do not maintain a separate terrain display path.

## Out Of Scope

- Changing terrain generation, terrain labels, elevation labels, movement
  reachability, combat legality, LOS classification, or action resolution.
