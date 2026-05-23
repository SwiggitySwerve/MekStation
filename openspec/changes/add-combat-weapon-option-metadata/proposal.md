# Add Combat Weapon Option Metadata

## Why

Combat hexes currently expose aggregate weapon availability, but they do not
show why each selected weapon is or is not usable from that hex. That makes
range, arc, and environment failures harder to inspect from the map.

## What Changes

- Extend combat range projections with per-weapon range, arc, environment, and
  availability rows.
- Include those rows in tactical projection explanations without recalculating
  combat legality in the renderer.
- Surface stable rendered hex and combat badge metadata for weapon option range
  bands, arc state, availability state, and blocked reasons.

## Impact

Players and tests can inspect every selected weapon's combat option from a
target hex, including mixed cases where one weapon is legal and another is
blocked by range, arc, or represented water rules.
