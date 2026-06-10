# Proposal: Summarize Isometric Token Occluders

## Why

Isometric terrain occlusion can identify more than one elevated terrain hex that
may hide the same unit from the current camera heading. The map already renders
each occluding hex, but the depth-sorted token wrapper only exposes one
representative occluder. That makes the token surface less useful when a player
or test inspects why a unit was boosted in front of stacked terrain.

## What Changes

- Preserve the existing first-occluder token metadata for compact compatibility.
- Add aggregate token-wrapper metadata for every active occluder hex,
  effective elevation, and occlusion reason.
- Feed the same aggregate reason into the nested token visibility context.
- Add focused component/browser coverage for a unit hidden by multiple
  isometric occluders.

## Out of Scope

- Changing movement, combat, LOS, fog, or attack legality.
- Changing the terrain-occlusion heuristic or camera depth ordering.
- Adding new player commands or a full 3D camera.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/*`
- Tests: focused isometric helper/component coverage plus tactical-map browser
  smoke metadata
