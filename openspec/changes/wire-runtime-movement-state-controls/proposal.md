# Wire Runtime Movement State Controls

## Why

The map projection now trusts replayed runtime movement state for LAM/QuadVee
conversion and conventional-infantry mount state, but the player-facing command
surface still needs to route mode and mount changes through that event path.
Without UI controls, map projection can be correct in tests while live play
still lacks a rules-backed way to mutate the state that drives it.

## What Changes

- Add movement-phase command controls for represented LAM/QuadVee conversion
  modes and conventional-infantry mount/dismount state.
- Dispatch those controls through `RuntimeMovementStateChanged` rather than
  ad-hoc unit mutation.
- Keep the selected unit in movement planning after a runtime state change so
  the map immediately recalculates reachable hexes, MP costs, height, and
  blocked reasons from the replayed state.

## Out Of Scope

- Full source-specific timing costs for conversion or mount/dismount actions.
- Airborne aerospace flight pathing for Fighter/AirMek submodes.
- External MegaMek oracle sweeps beyond the source-backed projection fixtures.
