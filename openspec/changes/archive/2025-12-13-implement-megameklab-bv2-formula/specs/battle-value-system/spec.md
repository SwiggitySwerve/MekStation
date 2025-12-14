# battle-value-system Spec Delta

## MODIFIED Requirements

### Requirement: Defensive Battle Value

The system SHALL calculate defensive BV from armor, structure, gyro, and defensive speed factor.

#### Scenario: Defensive BV calculation
- **WHEN** calculating defensive BV
- **THEN** armor BV SHALL be calculated as total armor points × 2.5
- **AND** structure BV SHALL be calculated as total structure points × 1.5
- **AND** gyro BV SHALL be calculated as tonnage × 0.5
- **AND** base defensive BV SHALL equal armorBV + structureBV + gyroBV
- **AND** defensive speed factor SHALL be looked up from TMM
- **AND** final defensive BV SHALL equal base × defensive speed factor

#### Scenario: Gyro BV contribution
- **WHEN** calculating gyro BV
- **THEN** gyro BV SHALL equal mech tonnage × 0.5
- **AND** a 75-ton mech SHALL contribute 37.5 gyro BV

### Requirement: Offensive Battle Value

The system SHALL calculate offensive BV using incremental weapon heat tracking.

#### Scenario: Offensive BV calculation
- **WHEN** calculating offensive BV
- **THEN** running heat (2) SHALL be added to initial heat pool
- **AND** weapons SHALL be sorted by BV in descending order
- **AND** each weapon SHALL be added incrementally
- **AND** weapon heat SHALL be tracked cumulatively
- **AND** weapons exceeding dissipation threshold SHALL receive 50% BV penalty
- **AND** ammo BV SHALL be added to weapon BV
- **AND** tonnage weight bonus SHALL be added
- **AND** offensive speed factor SHALL be applied to total

#### Scenario: Running heat contribution
- **WHEN** calculating heat pool for offensive BV
- **THEN** running heat of 2 SHALL be added before weapon heat
- **AND** this represents the heat cost of running movement

#### Scenario: Weapon heat penalty application
- **WHEN** adding a weapon to offensive BV
- **AND** cumulative heat (running + weapons so far) exceeds dissipation
- **THEN** the weapon BV SHALL be multiplied by 0.5
- **AND** subsequent weapons also exceeding dissipation SHALL receive 50% penalty

#### Scenario: Weight bonus
- **WHEN** calculating offensive BV
- **THEN** mech tonnage SHALL be added as weight bonus
- **AND** a 75-ton mech SHALL add 75 to offensive BV

### Requirement: Speed Factor

Movement capability SHALL modify defensive and offensive BV using separate TMM-based speed factors.

#### Scenario: Speed factor from TMM
- **WHEN** calculating speed factor for BV2
- **THEN** TMM SHALL be calculated from the higher of run MP or jump MP
- **AND** speed factor SHALL be looked up from TMM-based table
- **AND** TMM 0 gives factor 1.0
- **AND** TMM 2 (Run 6 MP) gives factor 1.2
- **AND** factor increases by 0.1 per TMM level

#### Scenario: Defensive speed factor
- **WHEN** calculating defensive speed factor
- **THEN** TMM SHALL be calculated from run MP and jump MP
- **AND** speed factor SHALL be looked up from TMM-based table
- **AND** TMM 2 SHALL give defensive factor 1.2

#### Scenario: Offensive speed factor
- **WHEN** calculating offensive speed factor
- **THEN** a modified speed factor SHALL be used
- **AND** TMM 2 SHALL give offensive factor 1.12
- **AND** offensive factor SHALL be slightly lower than defensive factor

#### Scenario: TMM calculation from movement
- **WHEN** calculating Target Movement Modifier
- **THEN** effective MP SHALL be the higher of run MP or jump MP
- **AND** 0-2 MP SHALL give TMM 0
- **AND** 3-4 MP SHALL give TMM 1
- **AND** 5-6 MP SHALL give TMM 2
- **AND** 7-9 MP SHALL give TMM 3
- **AND** 10-17 MP SHALL give TMM 4
- **AND** 18-24 MP SHALL give TMM 5
- **AND** 25+ MP SHALL give TMM 6

## REMOVED Requirements

### Requirement: Heat Efficiency Adjustment

Offensive BV no longer uses a global heat adjustment factor. Instead, incremental heat tracking per weapon is used in the Offensive Battle Value calculation.
