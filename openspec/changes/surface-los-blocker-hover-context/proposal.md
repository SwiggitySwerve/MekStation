# Surface LOS Blocker Hover Context

## Why

The combat projection already carries the exact intervening LOS blocker or
partial-cover hex selected by the shared MegaMek-aligned classifier. Hex badges
and metadata expose that evidence, but combat and combined tactical hovers still
collapse it into a generic reason line. Players need the hover itself to answer
which hex, blocker kind, terrain/elevation context, and source reason caused a
blocked or partial line of sight.

## What Changes

- Surface projection-provided LOS blocker context in combat-only hovers.
- Surface the same context in combined movement+combat tactical hovers.
- Expose stable machine-readable hover attributes for LOS state, blocker hex,
  blocker kind, blocker terrain/unit, and blocker reason.
- Keep rendering source-of-truth aligned with `ICombatRangeHex`; do not
  reclassify LOS in the map renderer.

## Out Of Scope

- Changing LOS classification, to-hit modifier, indirect-fire, or commit rules.
- Expanding the water/TacOps/elevation LOS fixture matrix.
