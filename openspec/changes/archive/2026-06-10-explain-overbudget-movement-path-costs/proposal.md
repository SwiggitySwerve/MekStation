# Proposal: Explain Over-Budget Movement Path Costs

## Why

Movement projections need to tell the player whether a highlighted destination
is impossible because the terrain itself blocks entry or because a terrain-legal
path simply costs more MP than the selected movement mode can spend. The old
destination projection collapsed some passable but over-budget ground paths to a
generic no-path state, hiding the path MP, terrain cost, and elevation cost that
the commit validator already uses.

## What Changes

- After normal legal ground path search fails, derive a diagnostic terrain-legal
  path without the active MP cap.
- Preserve direct terrain blockers, including abrupt tracked/wheeled elevation
  blocks, as `TerrainBlocked`.
- Return `InsufficientMP` for passable over-budget paths with total MP, final
  step terrain cost, elevation delta, and elevation cost.
- Update the LAM Mek-mode browser fixture to show a non-color `NO MP` badge and
  the same cost breakdown the commit validator rejects.

## Out of Scope

- Changing movement point rules, terrain entry legality, heat generation, or
  road-bonus eligibility.
- Adding LAM Fighter/aerodyne movement or AirMek clearance submodes.
- Replacing the pathfinder or adding player-facing path editing.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: movement range projection, movement projection fixtures,
  tactical-map browser smoke coverage
- Tests: focused movement Jest, tactical-map fixture Jest, targeted Playwright
  browser smoke, standard project gates
