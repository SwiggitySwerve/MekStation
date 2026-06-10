# Tasks: Apply Runtime Movement State Events

## 1. Event And Reducer

- [x] 1.1 Add a replayable runtime movement-state event payload for conversion
  and infantry mount-state fields.
- [x] 1.2 Replay the event into `IUnitGameState`, including null-clearing stale
  runtime fields when a conversion action replaces them.
- [x] 1.3 Expose the event through the interactive session action surface.

## 2. Projection And Commit Proof

- [x] 2.1 Add reducer coverage for infantry dismount state and conversion
  height-clearing.
- [x] 2.2 Prove the post-event infantry dismount state feeds movement
  projection and committed movement validation.
- [x] 2.3 Update tactical-map follow-up tracking so gameplay-event mutation is
  no longer grouped with the remaining UI/action-timing gap.

## 3. Verification

- [x] 3.1 Run focused runtime movement-state tests.
- [x] 3.2 Run focused tactical-map movement scenario tests.
- [x] 3.3 Run typecheck and OpenSpec validation.
