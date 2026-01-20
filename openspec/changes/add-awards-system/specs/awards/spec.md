# Specification: Awards System

## ADDED Requirements

### Requirement: Award Definitions

The system SHALL define awards that pilots can earn through gameplay.

#### Scenario: View available awards

- **GIVEN** a user wants to see possible awards
- **WHEN** they view the awards catalog
- **THEN** all defined awards are listed
- **AND** each shows name, description, and criteria
- **AND** earned status is indicated

#### Scenario: Award rarity display

- **GIVEN** awards of different rarities
- **WHEN** viewing the awards catalog
- **THEN** rarity is visually distinguished (color, border)
- **AND** rare awards appear more prestigious

### Requirement: Award Earning

The system SHALL grant awards to pilots who meet criteria.

#### Scenario: Earn combat award

- **GIVEN** a pilot destroys 5 enemy units (Ace criteria)
- **WHEN** the 5th kill is recorded
- **THEN** the Ace award is granted
- **AND** the pilot's profile shows the award
- **AND** a notification is displayed

#### Scenario: Earn campaign award

- **GIVEN** a pilot completes a campaign
- **WHEN** the final mission is won
- **THEN** campaign completion awards are checked
- **AND** qualifying awards are granted

#### Scenario: Duplicate prevention

- **GIVEN** a pilot already has the Ace award
- **WHEN** they get another 5 kills
- **THEN** the Ace award is not granted again
- **AND** kill count still increases for statistics

### Requirement: Pilot Award Display

The system SHALL display earned awards on pilot profiles.

#### Scenario: View pilot awards

- **GIVEN** a pilot with earned awards
- **WHEN** viewing the pilot's profile
- **THEN** awards are displayed in a grid
- **AND** awards are sorted by rarity or date earned
- **AND** clicking an award shows details

#### Scenario: Award ribbon bar

- **GIVEN** a pilot card in force management
- **WHEN** viewing the card
- **THEN** a compact ribbon bar shows key awards
- **AND** hovering shows award names

### Requirement: Award Notifications

The system SHALL notify players when awards are earned.

#### Scenario: In-game notification

- **GIVEN** a pilot earns an award during gameplay
- **WHEN** the criteria is met
- **THEN** a toast notification appears
- **AND** the notification shows the award name and icon

#### Scenario: Post-game summary

- **GIVEN** awards were earned during a game
- **WHEN** the game ends
- **THEN** the summary screen lists new awards
- **AND** players can click to see details

### Requirement: Statistics Tracking

The system SHALL track pilot statistics for award evaluation.

#### Scenario: Track kills

- **GIVEN** a pilot destroys an enemy unit
- **WHEN** the destruction event occurs
- **THEN** the pilot's kill count increments
- **AND** the count persists across sessions

#### Scenario: Track survival

- **GIVEN** a pilot completes a mission without ejecting
- **WHEN** the mission ends
- **THEN** the survival count increments
- **AND** survival rate is updated
