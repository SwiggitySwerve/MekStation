# combat-resolution (delta)

## ADDED Requirements

### Requirement: Aerospace Combat Dispatch

The combat resolution engine SHALL route aerospace targets to an aerospace-specific damage pipeline distinct from the BattleMech and Vehicle paths.

#### Scenario: Aerospace target routing

- **GIVEN** an attack whose target has `unitType === UnitType.AEROSPACE_FIGHTER`, `CONVENTIONAL_FIGHTER`, or `SMALL_CRAFT`
- **WHEN** the engine resolves the hit
- **THEN** `aerospaceResolveDamage()` SHALL be invoked
- **AND** aerospace-specific hit-location and critical-hit tables SHALL be used

### Requirement: Aerospace Damage Chain

The system SHALL apply aerospace damage to arc armor first, then reduce Structural Integrity.

#### Scenario: Damage absorbed by armor

- **GIVEN** an ASF whose Nose arc has 20 armor and the current SI is 6
- **WHEN** 15 damage hits the Nose
- **THEN** Nose armor SHALL be reduced to 5
- **AND** SI SHALL remain 6

#### Scenario: Damage reduces SI

- **GIVEN** the same ASF after Nose armor has dropped to 0
- **WHEN** 20 additional damage hits the Nose
- **THEN** SI SHALL be reduced by `floor(20 / 10) = 2`
- **AND** SI SHALL equal 4

#### Scenario: SI destruction destroys unit

- **GIVEN** an aerospace unit with SI 1
- **WHEN** damage reduces SI to 0 or below
- **THEN** the unit SHALL be destroyed
- **AND** a `UnitDestroyed` event SHALL fire

### Requirement: Aerospace Control Roll

Damage exceeding 10% of current SI SHALL trigger a Control Roll.

#### Scenario: Control roll trigger

- **GIVEN** an ASF with SI 10 that takes 3 damage in a single hit
- **WHEN** damage is applied
- **THEN** a Control Roll SHALL be required (3 > 10 × 0.1 = 1.0)
- **AND** a `ControlRoll` event SHALL fire with its pass/fail result

#### Scenario: Control roll failure penalty

- **GIVEN** a failed Control Roll
- **WHEN** effects are applied
- **THEN** the unit SHALL take 1 additional SI damage
- **AND** the next movement phase SHALL begin with a −1 thrust penalty

## MODIFIED Requirements

### Requirement: Damage Distribution

The system SHALL distribute damage across units based on battle intensity and outcome.

#### Scenario: Victory results in light damage

- **GIVEN** a battle with outcome VICTORY and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 0-30% damage on average

#### Scenario: Defeat results in heavy damage

- **GIVEN** a battle with outcome DEFEAT and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 40-80% damage on average

#### Scenario: Draw results in moderate damage

- **GIVEN** a battle with outcome DRAW and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 20-50% damage on average

#### Scenario: Aerospace fly-off counts as surviving

- **GIVEN** a battle where an aerospace unit exited the map before destruction
- **WHEN** distributeDamage is called
- **THEN** the aerospace unit SHALL be treated as surviving (not wrecked)
- **AND** only actual SI/arc damage SHALL be recorded
