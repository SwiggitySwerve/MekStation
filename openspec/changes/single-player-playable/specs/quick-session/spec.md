## MODIFIED Requirements

### Requirement: Quick Game Entry

The system SHALL provide a quick game mode separate from campaign gameplay.

#### Scenario: Access quick game

- **GIVEN** the user wants to play a quick skirmish
- **WHEN** they navigate to Quick Game
- **THEN** a setup wizard guides them through configuration
- **AND** no campaign context is required

#### Scenario: Quick game setup steps

- **GIVEN** the quick game setup wizard
- **WHEN** progressing through setup
- **THEN** steps include: select units, configure difficulty, generate scenario, confirm
- **AND** each step can be revisited before confirmation

#### Scenario: Unit selection from compendium

- **WHEN** the user reaches the unit selection step
- **THEN** units SHALL be selectable from the full compendium (4,200+ canonical units) via UnitSearchService
- **AND** units SHALL be searchable by name with fuzzy matching
- **AND** units SHALL be filterable by weight class and tech base

#### Scenario: Start battle offers mode selection

- **WHEN** the user completes setup and clicks Start Battle
- **THEN** the system SHALL offer: "Auto-Resolve", "Play Manually", and "Watch AI Battle"
- **AND** Auto-Resolve SHALL call GameEngine.runToCompletion() and navigate to results
- **AND** Play Manually SHALL call GameEngine.createInteractiveSession() and navigate to the game session page
- **AND** Watch AI Battle SHALL start AI-vs-AI spectator mode

### Requirement: Quick Game Results

The system SHALL display results at the end of a quick game.

#### Scenario: Victory screen

- **GIVEN** a quick game completes
- **WHEN** viewing results
- **THEN** the winner is displayed
- **AND** a summary shows: units destroyed, damage dealt, turns taken
- **AND** options to "Play Again" or "New Game" are available

#### Scenario: Play again with same setup

- **GIVEN** a completed quick game
- **WHEN** the user selects "Play Again"
- **THEN** the same units are used (with fresh damage)
- **AND** the same scenario is used
- **AND** a new game begins immediately

#### Scenario: New game option

- **GIVEN** a completed quick game
- **WHEN** the user selects "New Game"
- **THEN** they return to the setup wizard
- **AND** previous selections are preserved as defaults

#### Scenario: Watch replay from results

- **WHEN** the user clicks "Watch Replay" on the results page
- **THEN** the existing replay viewer SHALL load with the game's event sequence
- **AND** all replay features (play, pause, step, scrub) SHALL be available

### Requirement: Shared Infrastructure

Quick games SHALL share infrastructure with campaign games where appropriate.

#### Scenario: Use scenario generation

- **GIVEN** a quick game setup
- **WHEN** generating a scenario
- **THEN** the same scenario generator used by campaigns is available
- **AND** all scenario templates and modifiers are available

#### Scenario: Use GameEngine for combat resolution

- **GIVEN** a quick game in progress
- **WHEN** resolving combat and damage
- **THEN** the GameEngine class SHALL be used with real combat utilities (damage, to-hit, heat, movement)
- **AND** combat SHALL NOT use demo buttons or manual destruction

#### Scenario: Use replay viewer

- **GIVEN** a quick game with events
- **WHEN** viewing replay
- **THEN** the same replay viewer used by campaigns is used
- **AND** all replay features (play, pause, step, scrub) are available

## ADDED Requirements

### Requirement: Quick Play Store Bridge

The system SHALL bridge Quick Play setup state to the gameplay store via GameEngine.

#### Scenario: Start game bridges stores

- **WHEN** the user starts a Quick Play game
- **THEN** selected units SHALL be read from useQuickGameStore
- **AND** units SHALL be converted via CompendiumAdapter
- **AND** the GameEngine SHALL create an IGameSession
- **AND** the session SHALL be stored in useGameplayStore
- **AND** navigation SHALL proceed to /gameplay/games/{sessionId}

#### Scenario: Demo interface removed

- **WHEN** the Quick Play game page renders
- **THEN** the demo banner ("This is a demo interface") SHALL NOT be present
- **AND** manual "Mark Destroyed" buttons SHALL NOT be present
- **AND** real game controls SHALL be shown instead
