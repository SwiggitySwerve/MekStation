## ADDED Requirements

### Requirement: GameEngine-Backed Combat Resolution

The system SHALL provide tactical combat resolution via GameEngine that uses real unit data and combat utilities instead of BV-probability-based auto-calculation.

#### Scenario: Auto-resolve with real damage

- **WHEN** a battle is auto-resolved via GameEngine.runToCompletion()
- **THEN** damage SHALL be calculated using real weapon damage values, to-hit modifiers, and hit location tables
- **AND** damage SHALL NOT be estimated from BV ratios

#### Scenario: Auto-resolve generates event log

- **WHEN** a battle is auto-resolved
- **THEN** a complete event log SHALL be generated containing MovementDeclared, AttackDeclared, AttackResolved, DamageApplied, HeatApplied, and UnitDestroyed events
- **AND** events SHALL be compatible with the replay system

#### Scenario: Interactive resolution with player decisions

- **WHEN** a battle is played in interactive mode
- **THEN** the player SHALL make movement and attack decisions each turn
- **AND** the AI opponent SHALL make decisions via BotPlayer
- **AND** combat resolution SHALL use the same utilities as auto-resolve

#### Scenario: Victory determination from game state

- **WHEN** all units of one side are destroyed
- **THEN** GameOutcomeCalculator SHALL determine the winner
- **AND** the result SHALL include: winner (player/opponent/draw), reason (elimination/turn_limit/mutual_destruction), units destroyed per side, and turns played

### Requirement: Encounter Launch to Game Session

The system SHALL create a real game session when an encounter is launched instead of navigating back to the encounter list.

#### Scenario: Launch encounter creates game session

- **WHEN** the user clicks "Launch Battle" on an encounter detail page
- **THEN** the encounter's forces SHALL be loaded and converted via CompendiumAdapter
- **AND** a GameEngine session SHALL be created with the encounter's map configuration
- **AND** navigation SHALL proceed to /gameplay/games/{gameSessionId}

#### Scenario: Launch error handling

- **WHEN** an encounter launch fails (e.g., forces not assigned)
- **THEN** an error message SHALL be displayed
- **AND** navigation SHALL NOT occur
- **AND** the user SHALL remain on the encounter detail page
