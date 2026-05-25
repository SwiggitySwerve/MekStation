# Proposal: Add Movement Option Tooltip Details

## Why

The shared tactical projection preserves same-hex Walk, Run, Jump, and motive-mode options, including per-option costs and blocked reasons. The movement badge exposes that metadata, but the hover tooltip still reads like a single primary movement option. Players need the tooltip to spell out every available or blocked movement option when a hex can be reached or rejected in different ways.

## What Changes

- Render per-mode movement option rows in movement hover tooltips.
- Render the same rows in combined movement/combat tactical hover tooltips.
- Expose blocked option invalid reason/detail metadata on each option row.
- Source rows from `IMovementRangeHex.movementModeOptions` and existing movement projection fields rather than recalculating reachability.

## Out of Scope

- Changing pathfinding, MP costs, elevation costs, or jump legality.
- Changing movement command commit validation.
- Adding new movement modes.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/*`
- Tests: focused tooltip coverage for reachable and blocked same-hex movement options, including per-row invalid reason/detail metadata
