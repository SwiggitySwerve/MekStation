# Apply Runtime Movement State Events

## Why

Runtime movement projection already understands represented LAM/QuadVee
conversion state and conventional-infantry mount state, but those fields need a
replayable gameplay-event path. Without one, UI or scenario logic can mutate
ad-hoc unit objects while replay, recovery, projection, and commit validation
drift apart.

## What Changes

- Add a `RuntimeMovementStateChanged` session event for conversion and
  infantry mount-state updates.
- Replay that event into `IUnitGameState` so movement projection and commit
  validation consume the same post-event state.
- Allow conversion events to clear stale generic `unitHeight` when the
  conversion mode becomes the height source.
- Prove an infantry dismount event changes a height-sensitive map projection
  and committed movement result from blocked to legal.

## Out Of Scope

- Full LAM/QuadVee conversion action timing and phase sequencing.
- Final UI controls for choosing mount/dismount or conversion actions.
- External MegaMek oracle sweeps beyond the source-pinned runtime-state
  projection fixture.
