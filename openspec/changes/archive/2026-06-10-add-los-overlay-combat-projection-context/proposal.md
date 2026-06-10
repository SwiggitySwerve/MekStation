# Add LOS Overlay Combat Projection Context

## Why

The LOS overlay draws the visible line and blocker icon from the shared LOS
classifier, while the combat hover and hex badges read attack legality from
`ICombatRangeHex`. When a player hovers a target, the line should be able to
explain the combat projection that made that target legal, partial, or blocked:
range bracket, distance, target ids, blocker hex, blocker kind, terrain, and
reason. This keeps the visible overlay tied to the same rules-backed combat
projection as the rest of the tactical map.

## What Changes

- Pass the hovered combat projection into `LineOfSightOverlay`.
- Expose combat LOS projection metadata on the overlay group, LOS line, and LOS
  state badge.
- Extend the overlay announcement/title with the combat projection LOS summary
  when projection data is available.
- Add focused UI tests for direct overlay rendering and the `HexMapDisplay`
  hover path.

## Out Of Scope

- Changing LOS geometry, blocker classification, firing arc rules, to-hit
  rules, indirect-fire legality, or attack commit behavior.
- Replacing the existing overlay geometry classifier; this change only makes the
  overlay carry the combat projection evidence already computed for the hover.
