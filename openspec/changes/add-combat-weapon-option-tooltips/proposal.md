# Add Combat Weapon Option Tooltips

## Why

Per-weapon combat option rows are now available in the shared projection, but a
player still needs to hover the map and see those details in plain text. Stable
metadata is useful for tests; the tooltip is where the tactical explanation
becomes playable.

## What Changes

- Render per-weapon range, arc, environment, availability, and blocked-reason
  summaries in combat hover tooltips.
- Render the same summary in combined movement/combat tactical hover tooltips.
- Keep the tooltip content sourced from `ICombatRangeHex.weaponRangeOptions`.

## Impact

Players can hover mixed combat hexes and immediately see why each selected
weapon is available or blocked, including out-of-range, out-of-arc, and
represented environment failures.
