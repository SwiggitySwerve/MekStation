## MODIFIED Requirements

### Requirement: Safe vs Max Thrust

The unit's `safeThrust` SHALL be its construction-time thrust rating. `maxThrust` SHALL equal `ceil(safeThrust × 1.5)`. Spending more than safeThrust in a single turn SHALL trigger a control roll at end-of-turn. Spending more than maxThrust SHALL be forbidden — the movement declaration SHALL be rejected.

#### Scenario: Thrust within safeThrust — no control roll

- **GIVEN** an aero with `safeThrust = 6, maxThrust = 9`
- **WHEN** the pilot spends 6 thrust total this turn
- **THEN** no control roll SHALL be triggered

#### Scenario: Thrust > safeThrust triggers control roll

- **GIVEN** the same aero
- **WHEN** the pilot spends 8 thrust this turn (above safe, below max)
- **THEN** a control roll SHALL be triggered at end of turn
- **AND** the control roll SHALL include `+2` modifier (one per excess thrust above safe)

#### Scenario: Odd safeThrust rounds maxThrust upward

- **GIVEN** an aero with `safeThrust = 5`
- **WHEN** its `maxThrust` is derived
- **THEN** `maxThrust` SHALL be 8, the upward-rounded run MP of pinned MegaMek (`Entity.java:4004-4016`)

#### Scenario: Thrust > maxThrust rejected

- **GIVEN** the same aero
- **WHEN** the pilot attempts to spend 10 thrust (above max)
- **THEN** the movement declaration SHALL be rejected with reason `'Thrust exceeds max'`
