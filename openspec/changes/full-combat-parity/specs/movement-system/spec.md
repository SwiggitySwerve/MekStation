## ADDED Requirements

### Requirement: Heat MP Reduction

Heat SHALL reduce available movement points using the formula `floor(heat / 5)`.

#### Scenario: Heat 9 reduces MP by 1

- **WHEN** a unit has heat level 9
- **THEN** available walking and running MP SHALL be reduced by `floor(9 / 5) = 1`

#### Scenario: Heat 15 reduces MP by 3

- **WHEN** a unit has heat level 15
- **THEN** available walking and running MP SHALL be reduced by `floor(15 / 5) = 3`

#### Scenario: Heat does not reduce MP below 0

- **WHEN** a unit with Walk 2 has heat level 15 (reduction of 3)
- **THEN** available Walk MP SHALL be 0 (not negative)
- **AND** the unit SHALL be unable to walk or run

### Requirement: Terrain PSR Triggers

The movement system SHALL trigger piloting skill rolls when entering specific terrain types.

#### Scenario: Entering rubble triggers PSR

- **WHEN** a unit enters a rubble hex during movement
- **THEN** a PSR SHALL be triggered

#### Scenario: Running through rough terrain triggers PSR

- **WHEN** a unit running enters a rough terrain hex
- **THEN** a PSR SHALL be triggered

#### Scenario: Entering water triggers PSR

- **WHEN** a unit enters a water hex (depth 1+) during movement
- **THEN** a PSR SHALL be triggered

#### Scenario: Exiting water triggers PSR

- **WHEN** a unit exits a water hex (depth 1+) during movement
- **THEN** a PSR SHALL be triggered

### Requirement: Prone/Standing-Up Movement Costs

Standing up from prone SHALL cost the unit's full walking MP and require a successful PSR.

#### Scenario: Standing up costs full walking MP

- **WHEN** a prone unit attempts to stand up in the movement phase
- **THEN** standing up SHALL cost the entire walking MP allotment
- **AND** the unit SHALL NOT move further that turn after standing

#### Scenario: Standing up requires PSR

- **WHEN** a prone unit attempts to stand up
- **THEN** a PSR SHALL be required
- **AND** failure SHALL leave the unit prone (MP still expended)

#### Scenario: Prone unit crawling

- **WHEN** a prone unit does not stand up
- **THEN** the unit SHALL be able to crawl at 1 MP per hex
- **AND** the unit SHALL remain prone while crawling

### Requirement: Shutdown Prevents Movement

A shutdown unit SHALL be unable to move during the movement phase.

#### Scenario: Shutdown unit cannot move

- **WHEN** a unit is in shutdown state during the movement phase
- **THEN** the unit SHALL NOT be permitted to move
- **AND** the unit SHALL skip the movement phase entirely

#### Scenario: Shutdown unit remains in place

- **WHEN** a shutdown unit's movement phase begins
- **THEN** the unit SHALL remain in its current hex
- **AND** movement type SHALL be set to "Stationary"
