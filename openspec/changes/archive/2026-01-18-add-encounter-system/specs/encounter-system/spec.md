# Encounter System Specification

## ADDED Requirements

### Requirement: Encounter Entity Model

The system SHALL define encounter entities for game setup configuration.

#### Scenario: Encounter properties

- **GIVEN** an encounter entity
- **WHEN** accessing properties
- **THEN** encounter MUST have: id, name, status
- **AND** encounter MUST have: playerForce, opponentForce (or opForConfig)
- **AND** encounter MUST have: mapConfiguration, victoryConditions

#### Scenario: Encounter status

- **GIVEN** an encounter
- **WHEN** checking status
- **THEN** status SHALL be one of: draft, ready, launched, completed
- **AND** draft: configuration incomplete
- **AND** ready: all required fields set, can launch
- **AND** launched: game session created
- **AND** completed: game finished

### Requirement: Force Configuration

The system SHALL support both explicit forces and generated opponents.

#### Scenario: Explicit force selection

- **GIVEN** encounter setup
- **WHEN** selecting forces
- **THEN** user MAY select saved force for player side
- **AND** user MAY select saved force for opponent side

#### Scenario: OpFor generation config

- **GIVEN** encounter setup without explicit opponent force
- **WHEN** configuring OpFor
- **THEN** user SHALL specify target BV (absolute or percentage of player)
- **AND** user MAY filter by era, faction, unit types
- **AND** user SHALL select pilot skill template

#### Scenario: OpFor generation

- **GIVEN** OpFor config with target BV
- **WHEN** generating opponent force
- **THEN** system SHALL select units to approximate target BV
- **AND** system SHALL apply faction/era filters
- **AND** system SHALL assign pilots per skill template

### Requirement: Map Configuration

The system SHALL configure map parameters for encounters.

#### Scenario: Map size

- **GIVEN** encounter setup
- **WHEN** configuring map
- **THEN** user SHALL specify map dimensions (hex radius or width/height)
- **AND** default size appropriate for unit count

#### Scenario: Terrain preset (future)

- **GIVEN** encounter setup
- **WHEN** configuring terrain
- **THEN** user MAY select terrain preset (clear, urban, forest, etc.)
- **AND** MVP: clear terrain only

#### Scenario: Deployment zones

- **GIVEN** encounter setup
- **WHEN** configuring deployment
- **THEN** player deployment zone SHALL be defined
- **AND** opponent deployment zone SHALL be defined
- **AND** zones should be on opposite sides of map

### Requirement: Victory Conditions

The system SHALL define configurable victory conditions.

#### Scenario: Standard victory conditions

- **GIVEN** encounter setup
- **WHEN** selecting victory conditions
- **THEN** "Destroy All" (eliminate all enemy units) SHALL be available
- **AND** "Cripple" (destroy 50%+ enemy units) SHALL be available
- **AND** "Retreat" (force enemy to flee map) SHALL be available

#### Scenario: Turn limit

- **GIVEN** encounter with turn limit
- **WHEN** turn limit reached
- **THEN** victory determined by remaining BV
- **AND** side with higher remaining BV wins

#### Scenario: Custom conditions (future)

- **GIVEN** advanced encounter setup
- **WHEN** defining custom conditions
- **THEN** objective-based conditions MAY be created
- **AND** examples: capture hex, survive N turns, escort unit

### Requirement: Encounter Launch

The system SHALL create game sessions from encounters.

#### Scenario: Validation before launch

- **GIVEN** encounter in draft status
- **WHEN** attempting to launch
- **THEN** system SHALL validate all required fields
- **AND** if validation fails, show specific errors
- **AND** if validation passes, transition to ready status

#### Scenario: Launch encounter

- **GIVEN** encounter in ready status
- **WHEN** launching
- **THEN** game session SHALL be created
- **AND** forces SHALL be loaded into game
- **AND** map SHALL be initialized
- **AND** encounter status transitions to launched

#### Scenario: Resume launched encounter

- **GIVEN** encounter in launched status
- **WHEN** accessing encounter
- **THEN** link to active game session SHALL be provided
- **AND** user can continue playing

### Requirement: Scenario Templates

The system SHALL provide reusable scenario templates.

#### Scenario: Built-in templates

- **GIVEN** new encounter creation
- **WHEN** selecting template
- **THEN** "Duel" (1v1) template SHALL be available
- **AND** "Skirmish" (lance vs lance) template SHALL be available
- **AND** "Custom" (blank) template SHALL be available

#### Scenario: Template application

- **GIVEN** selected template
- **WHEN** applying to encounter
- **THEN** template defaults SHALL populate encounter fields
- **AND** user MAY override any template values

#### Scenario: Save as template (future)

- **GIVEN** configured encounter
- **WHEN** saving as template
- **THEN** encounter configuration SHALL be saved as reusable template
- **AND** template available for future encounters
