# Proposal: Select Map Movement Mode From Legend

## Why

The map MP legend already shows the active walk, run, or jump projection mode, but players must use a separate command surface to change that projection. The legend should be a direct, rules-backed control for changing the movement overlay because it is already adjacent to the reachable/blocked hex highlights.

## What Changes

- Make inactive, legal Walk/Run/Jump legend rows selectable when the game page provides a movement-mode handler.
- Route legend selections into the same selected-unit planned-movement seed shape used by movement command payloads.
- Keep active and disabled rows non-actionable while preserving accessible state metadata.
- Preserve map interaction behavior when the legend is rendered as a passive overlay.

## Out of Scope

- Changing movement costs, heat, terrain, elevation, jump validation, or committed movement rules.
- Adding new movement modes beyond Walk, Run, and Jump.
- Replacing tactical command dock movement actions.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: map MP legend, gameplay page movement planning bridge, layout prop forwarding
- Tests: focused legend interaction and movement planning helper coverage
