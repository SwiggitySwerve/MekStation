# Tasks: Reserve Altitude-Control MP in Movement Projection

## 1. Runtime State and Projection

- [x] 1.1 Replay altitude-control step count and MP cost as pending unit
  movement state.
- [x] 1.2 Add pending altitude-control MP to movement projection costs and
  remaining movement budget.
- [x] 1.3 Preserve altitude-control reserve metadata through movement options,
  hover context rows, badges, and shared tactical projection explanations.

## 2. Commit and Replay

- [x] 2.1 Include represented altitude-control metadata on the movement-declared
  payload that consumes the reserve.
- [x] 2.2 Consume pending altitude-control MP during committed movement
  validation.
- [x] 2.3 Clear pending altitude-control cost after committed movement replay.

## 3. Verification

- [x] 3.1 Add focused runtime-state tests for altitude-control projection and
  commit parity.
- [x] 3.2 Add focused event-payload and command-payload tests for altitude
  control MP metadata.
- [x] 3.3 Run focused Jest tests, OpenSpec validation, and typecheck.
