# movement-system (delta)

## ADDED Requirements

### Requirement: Aerospace 2D Simplified Movement

Aerospace units SHALL move under a 2D-simplified flight model for Phase 6 combat.

#### Scenario: Flying unit range per turn

- **GIVEN** an ASF with safeThrust 6
- **WHEN** computing legal movement for the turn
- **THEN** the unit SHALL be allowed to move up to `2 × safeThrust = 12 hexes`
- **AND** the path SHALL be a straight line from the current hex plus at most one ≤ 60° turn

#### Scenario: No altitude tracking

- **GIVEN** any flying unit in Phase 6 2D mode
- **WHEN** reading combat state
- **THEN** the unit SHALL NOT have an altitude property
- **AND** line-of-sight SHALL always treat flying units as "above the board"

#### Scenario: Reaching board edge exits unit

- **GIVEN** a flying unit whose path reaches a board-edge hex
- **WHEN** movement is resolved
- **THEN** an `AerospaceExited` event SHALL fire
- **AND** the unit SHALL enter off-map state for the scenario-defined return delay (default 2 turns)

#### Scenario: Re-entry from off-map

- **GIVEN** a flying unit in off-map state whose return delay has elapsed
- **WHEN** its owner chooses a board-edge re-entry hex
- **THEN** an `AerospaceEntered` event SHALL fire
- **AND** the unit SHALL resume movement with the facing it had at exit

### Requirement: Fuel Consumption per Turn

Flying units SHALL consume fuel equal to the thrust used each turn.

#### Scenario: Fuel burn

- **GIVEN** an ASF that moves its full 2 × safeThrust during a turn
- **WHEN** end-of-turn cleanup runs
- **THEN** fuel points SHALL decrease by the thrust actually used that turn
- **AND** when fuel reaches 0 a `FuelDepleted` event SHALL fire
- **AND** the unit SHALL leave the board at the next movement phase (cannot re-enter this scenario)

### Requirement: Fly-Over Strafe Movement

The system SHALL allow a flying unit to declare a strafe path during movement, applying attacks to ground units in the path hexes.

#### Scenario: Strafe declaration

- **GIVEN** an ASF moving over 4 hexes, 2 of which contain enemy ground units
- **WHEN** the player declares strafe on those hexes
- **THEN** Nose or Wing weapons SHALL fire at ground units in those hexes during movement
- **AND** each strafed hex SHALL add +2 to-hit penalty to that shot
- **AND** an `AerospaceFlyOver` event SHALL record affected hexes and damage applied
