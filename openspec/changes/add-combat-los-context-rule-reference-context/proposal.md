# Add Combat LOS Context Rule Reference Context

## Why

Combat hover tooltips already explain when line of sight is blocked or partial,
including the blocker hex, blocker kind, terrain, and reason. The shared
per-hex tactical projection now carries MegaMek-backed combat and LOS rule
references, but the LOS context row still exposes only local blocker metadata.
A player, test, or accessibility inspector should be able to connect the
visible blocker explanation to the same shared projection evidence that marks
the target as blocked.

## What Changes

- Pass the shared tactical projection into combat LOS context rows.
- Expose source and rule-reference metadata from combat/LOS projection
  references on LOS context rows.
- Mark LOS context rows as line-of-sight rule surfaces while preserving their
  existing blocker state, hex, kind, terrain, and reason attributes.

## Out Of Scope

- Recalculating LOS, blocker selection, cover, range, or target legality.
- Changing attack command validation or committed attack resolution.
- Adding new LOS or cover rules.
