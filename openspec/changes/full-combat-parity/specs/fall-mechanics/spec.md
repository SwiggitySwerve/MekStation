## ADDED Requirements

### Requirement: Fall Damage Calculation

Fall damage SHALL be calculated as `ceil(weight / 10) × (fallHeight + 1)` and applied in 5-point damage clusters to hit locations determined by fall direction.

#### Scenario: 80-ton mech falls from standing (height 0)

- **WHEN** an 80-ton BattleMech falls from standing height (fallHeight = 0)
- **THEN** fall damage SHALL be `ceil(80 / 10) × (0 + 1) = 8 × 1 = 8`
- **AND** damage SHALL be applied as one 5-point cluster and one 3-point cluster

#### Scenario: 60-ton mech falls from elevation 2

- **WHEN** a 60-ton BattleMech falls from elevation 2 (fallHeight = 2)
- **THEN** fall damage SHALL be `ceil(60 / 10) × (2 + 1) = 6 × 3 = 18`
- **AND** damage SHALL be applied as three 5-point clusters and one 3-point cluster

#### Scenario: Damage applied in 5-point clusters

- **WHEN** applying 18 points of fall damage
- **THEN** the system SHALL apply damage in groups of 5 (5, 5, 5, 3)
- **AND** each cluster SHALL be rolled on the hit location table for the fall direction

### Requirement: Fall Direction Determination

The system SHALL determine fall direction by rolling 1d6 to establish which side the unit falls toward.

#### Scenario: Fall direction roll

- **WHEN** a unit falls and 1d6 is rolled for direction
- **THEN** roll 0 (or 1 on 1d6) SHALL indicate falling forward
- **AND** rolls 1-2 SHALL indicate falling to the right
- **AND** roll 3 SHALL indicate falling backward
- **AND** rolls 4-5 SHALL indicate falling to the left

#### Scenario: Fall direction determines hit table

- **WHEN** fall direction is determined as "forward"
- **THEN** all fall damage clusters SHALL use the front hit location table
- **WHEN** fall direction is "right"
- **THEN** all fall damage clusters SHALL use the right side hit location table

### Requirement: Prone State Management

The system SHALL track and enforce prone state for fallen units.

#### Scenario: Unit set to prone after fall

- **WHEN** a unit falls
- **THEN** the unit's `prone` state SHALL be set to true
- **AND** the unit's facing SHALL change to match the fall direction

#### Scenario: Prone unit cannot run or jump

- **WHEN** a prone unit begins its movement phase
- **THEN** the unit SHALL NOT be permitted to run or jump until it stands up

### Requirement: Pilot Damage from Falls

The pilot SHALL take 1 point of damage each time the unit falls, requiring a consciousness check.

#### Scenario: Pilot takes 1 damage from fall

- **WHEN** a unit falls
- **THEN** the pilot SHALL take 1 point of damage
- **AND** a consciousness check SHALL be required (2d6 ≥ consciousness threshold)
- **AND** pilotWounds SHALL be incremented by 1

#### Scenario: Pilot knocked unconscious from fall

- **WHEN** a pilot takes damage from a fall and fails the consciousness check
- **THEN** the pilot SHALL be knocked unconscious
- **AND** the unit SHALL be inoperable until the pilot regains consciousness

### Requirement: Standing Up Rules

Standing up SHALL cost the unit's full walking MP and require a successful PSR.

#### Scenario: Standing up costs full walking MP

- **WHEN** a prone unit attempts to stand up in the movement phase
- **THEN** standing up SHALL cost the unit's entire walking MP allotment
- **AND** the unit SHALL NOT be able to move further that turn after standing

#### Scenario: Successful stand-up PSR

- **WHEN** a prone unit attempts to stand and the PSR succeeds
- **THEN** the unit SHALL no longer be prone
- **AND** the unit SHALL be able to act normally (fire weapons, etc.) that turn

#### Scenario: Failed stand-up PSR

- **WHEN** a prone unit attempts to stand and the PSR fails
- **THEN** the unit SHALL remain prone
- **AND** the walking MP cost SHALL still be expended
- **AND** the unit SHALL NOT be able to move or attempt to stand again that turn

### Requirement: Prone Combat Effects

Prone status SHALL modify to-hit rolls for attacks involving the prone unit.

#### Scenario: Attacker is prone

- **WHEN** a prone unit makes an attack
- **THEN** the attack SHALL receive a +2 to-hit modifier

#### Scenario: Target is prone at adjacent range

- **WHEN** attacking a prone target from an adjacent hex
- **THEN** the attack SHALL receive a -2 to-hit modifier (easier to hit)

#### Scenario: Target is prone at range greater than 1

- **WHEN** attacking a prone target from range greater than 1 hex
- **THEN** the attack SHALL receive a +1 to-hit modifier (harder to hit at distance)

### Requirement: Injectable Randomness for Falls

All fall resolution (direction, damage clusters, hit locations) SHALL use injectable DiceRoller.

#### Scenario: Deterministic fall resolution

- **WHEN** resolving falls with a seeded DiceRoller
- **THEN** identical inputs and seeds SHALL produce identical fall direction, hit locations, and damage outcomes
