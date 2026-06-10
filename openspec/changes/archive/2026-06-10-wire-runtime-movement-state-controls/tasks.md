# Tasks: Wire Runtime Movement State Controls

## 1. Command Surface

- [x] 1.1 Add contextual movement commands for infantry mount/dismount state.
- [x] 1.2 Add contextual movement commands for LAM and QuadVee conversion
  modes.
- [x] 1.3 Dispatch runtime state commands through the existing tactical action
  dock channel.

## 2. Store And Map Refresh

- [x] 2.1 Add a gameplay store action that calls
  `InteractiveSession.applyRuntimeMovementState`.
- [x] 2.2 Keep the selected unit in movement planning and refresh available
  movement after the event.
- [x] 2.3 Prove the store clears stale plans and keeps projection ready after a
  conversion event.

## 3. Verification

- [x] 3.1 Run focused tactical action dock command tests.
- [x] 3.2 Run focused gameplay store combat-flow tests.
- [x] 3.3 Run typecheck, format, and strict OpenSpec validation.
