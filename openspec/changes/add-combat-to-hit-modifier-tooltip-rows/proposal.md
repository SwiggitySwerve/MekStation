# Proposal: Add Combat To-Hit Modifier Tooltip Rows

## Why

Combat projection already carries the engine-style to-hit number and modifier stack, but hover tooltips currently compress the modifier stack into one text line. Players need a readable breakdown of why an attack is TN5, TN7, or worse without reverse-engineering a sentence.

## What Changes

- Render per-modifier to-hit rows in combat hover tooltips.
- Render the same to-hit modifier rows in combined movement/combat tactical tooltips.
- Expose stable metadata for modifier count, names, values, and sources.
- Keep all rows sourced from `ICombatRangeHex.toHitModifiers`.

## Out of Scope

- Changing to-hit calculation, combat legality, or attack resolution.
- Changing weapon selection or damage projection.
- Adding new to-hit modifier sources.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/*`
- Tests: focused combat tooltip coverage for terrain and combined tactical modifier rows
