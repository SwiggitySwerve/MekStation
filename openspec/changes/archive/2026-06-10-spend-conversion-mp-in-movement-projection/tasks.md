# Tasks: Spend Conversion MP in Movement Projection

## 1. Runtime State and Projection

- [x] 1.1 Replay conversion step count and MP cost as pending unit movement
  state.
- [x] 1.2 Add pending conversion MP to movement projection costs and remaining
  movement budget.
- [x] 1.3 Preserve conversion cost metadata through movement projection options
  and hover explanations.

## 2. Commit and Replay

- [x] 2.1 Include represented conversion steps on movement-declared payloads.
- [x] 2.2 Consume pending conversion MP during committed movement validation.
- [x] 2.3 Clear pending conversion cost after committed movement replay or a new
  movement phase reset.

## 3. Verification

- [x] 3.1 Add focused runtime-state tests for projection/commit parity.
- [x] 3.2 Add focused event-payload tests for conversion step emission.
- [x] 3.3 Run focused Jest tests and typecheck.
