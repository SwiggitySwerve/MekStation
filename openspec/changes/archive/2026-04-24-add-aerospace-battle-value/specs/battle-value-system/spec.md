# battle-value-system (delta)

## ADDED Requirements

### Requirement: Aerospace BV Dispatch

The BV calculator SHALL route `IAerospaceUnit` inputs to an aerospace-specific calculation path.

#### Scenario: ASF dispatch

- **GIVEN** an aerospace fighter
- **WHEN** `calculateBattleValue` is called
- **THEN** the aerospace calculator SHALL be invoked
- **AND** the return SHALL include an `IAerospaceBVBreakdown`

#### Scenario: Conventional fighter multiplier

- **GIVEN** a conventional fighter
- **WHEN** final BV is computed
- **THEN** `(defensive + offensive)` SHALL be multiplied by 0.8 before pilot adjustment

### Requirement: Aerospace Defensive BV

Aerospace defensive BV SHALL use Structural Integrity in place of the mech gyro term.

#### Scenario: SI BV

- **GIVEN** a 50-ton ASF with SI 5
- **WHEN** SI BV is computed
- **THEN** siBV SHALL equal `5 × 0.5 × 50 = 125`

#### Scenario: Defensive factor uses Max Thrust

- **GIVEN** an ASF with maxThrust 9
- **WHEN** defensive factor is computed
- **THEN** defensive factor SHALL equal `1 + (9 / 10) = 1.9`

### Requirement: Aerospace Offensive BV Arc Fire Pool

Aerospace offensive BV SHALL combine arc-weighted weapon contributions.

#### Scenario: Primary arc contributes 100%

- **GIVEN** an ASF whose Nose arc holds the highest-BV weapon pool
- **WHEN** offensive BV is computed
- **THEN** the Nose arc SHALL contribute at 100%
- **AND** the Aft arc SHALL contribute at 25%
- **AND** the LeftWing and RightWing SHALL each contribute at 50%
- **AND** Fuselage weapons SHALL always contribute at 100%

#### Scenario: Primary arc not Nose

- **GIVEN** an ASF whose LeftWing arc has higher BV than Nose
- **WHEN** fire-pool weighting is applied
- **THEN** LeftWing SHALL contribute at 100%
- **AND** RightWing (opposite arc) SHALL contribute at 25%
- **AND** Nose / Aft SHALL contribute at 50% each

### Requirement: Aerospace Speed Factor

Aerospace speed factor SHALL use the average of Safe and Max Thrust.

#### Scenario: Speed factor calculation

- **GIVEN** an ASF with safeThrust 5, maxThrust 7
- **WHEN** speed factor is computed
- **THEN** avgThrust SHALL equal 6
- **AND** speed factor SHALL equal `round(pow(1 + (6 − 5) / 10, 1.2) × 100) / 100 = 1.12`
