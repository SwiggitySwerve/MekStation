# Surface Movement Option Source Details

## Why

The tactical map already renders same-hex walk/run/jump movement options in
badges, hover rows, and projection explanations, but the shared source
reference still compressed movement legality to a coarse `walk projection` /
`run projection` label. That left downstream top-down and isometric surfaces
with source metadata that did not independently explain which movement modes
were legal, blocked, costly, or heat-generating.

## What Changes

- Expand the shared movement projection source detail so it includes each
  represented same-hex movement option, its legal/blocked state, MP cost,
  terrain/elevation cost details, heat, and blocked reason when present.
- Keep the existing source channel and MegaMek rule references intact so UI
  consumers can continue filtering on `movement:megamek`.
- Add regression coverage proving mixed walk/run/jump options are represented
  in the source reference, not only in the visible badge text.

## Impact

This is a tactical map explanation-layer change only. It does not alter
movement pathfinding, movement commit validation, combat, LOS, terrain import,
or parser behavior.
