## MODIFIED Requirements

### Requirement: Head Slot Layout

Cockpit components SHALL use the physical slot layout of the selected cockpit. One construction owner SHALL provide the slot positions, and cockpit slot counts SHALL match them.

#### Scenario: Head slots

- **WHEN** allocating standard, primitive, industrial or superheavy head slots
- **THEN** life support SHALL occupy slots 1 and 6
- **AND** sensors SHALL occupy slots 2 and 5
- **AND** the cockpit SHALL occupy slot 3, leaving slot 4 available

#### Scenario: Small cockpit

- **WHEN** allocating a small cockpit
- **THEN** life support, sensors, cockpit and sensors SHALL occupy head slots 1, 2, 3 and 4
- **AND** head slots 5 and 6 SHALL remain available for equipment

#### Scenario: Command console

- **WHEN** allocating a command console
- **THEN** the standard head layout SHALL also reserve slot 4 for the second cockpit position

#### Scenario: Torso-mounted cockpit

- **WHEN** allocating a torso-mounted cockpit
- **THEN** only sensors SHALL occupy head slots 1 and 2
- **AND** cockpit and sensors SHALL occupy the first two free center-torso slots after the engine and gyro
- **AND** life support SHALL occupy slot 1 in each side torso, shifting side-torso engine slots by one
- **AND** the cockpit SHALL count two head slots and four other slots

#### Scenario: Validation uses the selected cockpit

- **GIVEN** a loaded or edited BattleMech with a nonstandard cockpit
- **WHEN** critical-slot validation inspects fixed occupancy
- **THEN** it SHALL use the selected cockpit's layout
- **AND** changing the cockpit SHALL refresh the overlap diagnostics
