# Game Session Core Specification

## ADDED Requirements

### Requirement: Game Session Lifecycle

The system SHALL manage game sessions through defined lifecycle states.

#### Scenario: Create game session
- **GIVEN** game configuration (units, map, rules)
- **WHEN** creating a new game session
- **THEN** a unique game ID SHALL be assigned
- **AND** initial state SHALL be "setup"
- **AND** participating units SHALL be registered

#### Scenario: Start game
- **GIVEN** a game in "setup" state with valid configuration
- **WHEN** starting the game
- **THEN** state SHALL transition to "active"
- **AND** turn counter SHALL be set to 1
- **AND** Initiative phase SHALL begin

#### Scenario: End game
- **GIVEN** an active game
- **WHEN** victory conditions are met OR player concedes
- **THEN** state SHALL transition to "completed"
- **AND** final results SHALL be recorded
- **AND** no further events SHALL be accepted

### Requirement: Event Sourcing Architecture

The system SHALL use event sourcing for all game state management.

#### Scenario: Event immutability
- **GIVEN** a game event is created
- **WHEN** the event is stored
- **THEN** the event SHALL be immutable
- **AND** the event SHALL have a unique sequence number
- **AND** the event SHALL have a timestamp

#### Scenario: State derivation
- **GIVEN** a sequence of game events
- **WHEN** computing current game state
- **THEN** state SHALL be derived by replaying all events in order
- **AND** the same events SHALL always produce the same state

#### Scenario: Replay to specific point
- **GIVEN** a game with N events
- **WHEN** replaying to event M (where M < N)
- **THEN** state SHALL reflect only events 1 through M
- **AND** events M+1 through N SHALL be excluded from state

### Requirement: Turn Structure

The system SHALL implement BattleTech turn structure with sequential phases.

#### Scenario: Phase sequence
- **GIVEN** a turn is in progress
- **WHEN** phases execute
- **THEN** phases SHALL execute in order: Initiative, Movement, Weapon Attack, Heat, End
- **AND** Physical Attack phase MAY be skipped in introductory rules

#### Scenario: Turn advancement
- **GIVEN** End phase completes
- **WHEN** checking game state
- **THEN** turn counter SHALL increment
- **AND** Initiative phase SHALL begin for new turn

### Requirement: Initiative Phase

The system SHALL determine unit activation order during Initiative phase.

#### Scenario: Initiative roll
- **GIVEN** Initiative phase begins
- **WHEN** determining order
- **THEN** each side SHALL roll 2d6
- **AND** higher roll chooses to move first or second
- **AND** ties result in re-roll

#### Scenario: Initiative order
- **GIVEN** initiative winner has chosen
- **WHEN** Movement phase begins
- **THEN** selected side moves first unit
- **AND** activation alternates between sides

### Requirement: Movement Phase

The system SHALL implement alternating unit activation for movement.

#### Scenario: Alternating movement
- **GIVEN** Movement phase is active
- **WHEN** units move
- **THEN** first side moves one unit, locks movement
- **AND** second side moves one unit, locks movement
- **AND** alternation continues until all units moved

#### Scenario: Movement lock
- **GIVEN** a unit's movement is declared
- **WHEN** player confirms movement
- **THEN** movement SHALL be locked
- **AND** movement cannot be changed
- **AND** opponent's turn begins

#### Scenario: Phase completion
- **GIVEN** all units have locked movement
- **WHEN** checking phase state
- **THEN** Movement phase SHALL end
- **AND** Weapon Attack phase SHALL begin

### Requirement: Weapon Attack Phase

The system SHALL implement simultaneous attack declaration and resolution.

#### Scenario: Attack declaration
- **GIVEN** Weapon Attack phase is active
- **WHEN** declaring attacks
- **THEN** both sides declare all attacks secretly
- **AND** attacks are not visible to opponent until reveal

#### Scenario: Attack reveal
- **GIVEN** both sides have locked their attacks
- **WHEN** revealing attacks
- **THEN** all attacks become visible simultaneously
- **AND** resolution begins

#### Scenario: Attack resolution order
- **GIVEN** attacks are revealed
- **WHEN** resolving attacks
- **THEN** all attacks resolve simultaneously
- **AND** destroyed units still fire (death fire)
- **AND** damage is applied after all attacks resolve

### Requirement: Heat Phase

The system SHALL track heat accumulation and dissipation.

#### Scenario: Heat calculation
- **GIVEN** Heat phase begins
- **WHEN** calculating heat
- **THEN** heat generated from movement SHALL be added
- **AND** heat generated from weapons fired SHALL be added
- **AND** heat dissipation from heat sinks SHALL be subtracted

#### Scenario: Heat effects
- **GIVEN** a unit's heat level after dissipation
- **WHEN** applying heat effects
- **THEN** heat 0-4: no effect
- **AND** heat 5-9: +1 to-hit modifier
- **AND** heat 10-14: +2 to-hit, movement penalty
- **AND** heat 15+: shutdown check required

### Requirement: End Phase

The system SHALL perform cleanup and victory checking in End phase.

#### Scenario: Status cleanup
- **GIVEN** End phase begins
- **WHEN** processing cleanup
- **THEN** destroyed units SHALL be removed from active play
- **AND** pilot status SHALL be updated
- **AND** temporary effects SHALL expire

#### Scenario: Victory check
- **GIVEN** End phase cleanup completes
- **WHEN** checking victory conditions
- **THEN** if one side has no active units, opponent wins
- **AND** if time/turn limit reached, evaluate by objectives
- **AND** if no victory, next turn begins

### Requirement: Game Event Types

The system SHALL define event types for all game actions.

#### Scenario: Game lifecycle events
- **GIVEN** game lifecycle changes
- **WHEN** creating events
- **THEN** `game_started`, `game_ended`, `turn_started`, `phase_changed` types SHALL exist

#### Scenario: Movement events
- **GIVEN** movement occurs
- **WHEN** creating events
- **THEN** `movement_declared`, `movement_locked`, `facing_changed` types SHALL exist

#### Scenario: Combat events
- **GIVEN** combat occurs
- **WHEN** creating events
- **THEN** `attack_declared`, `attack_locked`, `attacks_revealed`, `attack_resolved`, `damage_applied` types SHALL exist

#### Scenario: Status events
- **GIVEN** unit status changes
- **WHEN** creating events
- **THEN** `heat_generated`, `heat_dissipated`, `pilot_hit`, `unit_destroyed` types SHALL exist
