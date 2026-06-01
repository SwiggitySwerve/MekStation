# Gate Movement Commands By Projection

## Why

The tactical map already paints blocked movement destinations with
rules-backed terrain, elevation, MP, heat, and illegal-destination reasons.
The command surfaces should consume that same projection so players do not see a
blocked destination on the map while walk, run, or jump still appears
commit-ready.

## What Changes

- Add movement projection fields to the tactical command context.
- Disable matching walk/run/jump commands when the selected destination
  projection is blocked.
- Let the action dock consume hovered movement projection inputs and let hex
  context menus consume keyed map projections.

## Impact

- UI command availability and disabled reasons only.
- No changes to movement pathfinding, MP, terrain, elevation, heat, or commit
  validation rules.
