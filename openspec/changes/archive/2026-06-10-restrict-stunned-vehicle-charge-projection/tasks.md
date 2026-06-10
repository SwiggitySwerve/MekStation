## Implementation

- [x] Add a represented vehicle crew-stun input to physical attack projection.
- [x] Derive the input from live `IUnitGameState.combatState` for map options
  and session declaration validation.
- [x] Block stunned vehicle charge rows with `AttackerCannotCharge` while
  preserving non-stunned vehicle charge behavior.
- [x] Add focused projection and commit-validation tests.
- [x] Validate OpenSpec and focused tests.
