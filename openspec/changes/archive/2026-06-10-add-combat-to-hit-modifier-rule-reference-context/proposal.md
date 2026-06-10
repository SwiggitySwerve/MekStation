# Add Combat To-Hit Modifier Rule Reference Context

## Why

Combat hover tooltips already list the to-hit modifier stack that produced a
target number, including modifier names, values, sources, and descriptions. The
shared combat projection now carries MegaMek-backed rule-reference evidence, but
the per-modifier rows do not expose that evidence directly. Players, tests, and
accessibility tooling should be able to inspect a modifier row and connect it to
the same combat projection rule surface as the aggregate hex.

## What Changes

- Pass the shared tactical projection into combat to-hit modifier rows.
- Expose combat-channel source and rule-reference metadata on the modifier row
  group.
- Expose the same combat-channel rule-reference metadata on each individual
  to-hit modifier row while preserving the existing modifier name, value,
  source, and description metadata.

## Out Of Scope

- Recalculating target numbers or modifier values.
- Changing combat preview, attack validation, or committed attack resolution.
- Adding new combat modifier rules.
