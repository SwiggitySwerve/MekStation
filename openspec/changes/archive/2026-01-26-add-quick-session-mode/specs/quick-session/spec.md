# quick-session Specification

## Purpose

Quick Session Mode provides standalone games without campaign persistence, allowing users to play skirmishes, test units, and learn mechanics without commitment.

## ADDED Requirements

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

### Requirement: Temporary Unit Instances

The system SHALL create temporary unit instances for quick games that are not persisted.

#### Scenario: Create temporary instance

- **GIVEN** a user selects a vault unit for quick game
- **WHEN** the game starts
- **THEN** a temporary instance is created from the vault design
- **AND** the instance is NOT linked to any campaign
- **AND** the instance is marked as temporary

#### Scenario: Temporary instance scope

- **GIVEN** a temporary unit instance
- **WHEN** the game session ends
- **THEN** the instance is discarded
- **AND** no record is persisted to the database
- **AND** the vault unit remains unchanged

#### Scenario: Damage tracking in session

- **GIVEN** a temporary instance takes damage during the game
- **WHEN** viewing the unit status
- **THEN** current damage is displayed
- **AND** the damage resets if "Play Again" is selected

### Requirement: Session Event Store

The system SHALL track events within a quick game session for replay purposes.

#### Scenario: Events stored in memory

- **GIVEN** a quick game is in progress
- **WHEN** game events occur (movement, attacks, damage)
- **THEN** events are stored in session memory
- **AND** events follow the same structure as campaign events
- **AND** events are NOT persisted to the database

#### Scenario: Session replay

- **GIVEN** a quick game has completed
- **WHEN** the user views the game replay
- **THEN** events can be replayed with the same UI as campaign games
- **AND** the replay is available until the session ends

#### Scenario: Session storage survival

- **GIVEN** an in-progress quick game
- **WHEN** the page is refreshed
- **THEN** the game state is restored from session storage
- **AND** the game can continue from where it left off

#### Scenario: Session end cleanup

- **GIVEN** a quick game session
- **WHEN** the browser tab is closed
- **THEN** all temporary instances are discarded
- **AND** all session events are discarded
- **AND** no persistent state remains

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

### Requirement: Shared Infrastructure

Quick games SHALL share infrastructure with campaign games where appropriate.

#### Scenario: Use scenario generation

- **GIVEN** a quick game setup
- **WHEN** generating a scenario
- **THEN** the same scenario generator used by campaigns is available
- **AND** all scenario templates and modifiers are available

#### Scenario: Use game resolution logic

- **GIVEN** a quick game in progress
- **WHEN** resolving combat and damage
- **THEN** the same game rules and resolution logic are used
- **AND** results are consistent with campaign gameplay

#### Scenario: Use replay viewer

- **GIVEN** a quick game with events
- **WHEN** viewing replay
- **THEN** the same replay viewer used by campaigns is used
- **AND** all replay features (play, pause, step, scrub) are available
