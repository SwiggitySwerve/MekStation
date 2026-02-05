# awards Specification

## Purpose

TBD - created by archiving change add-awards-system. Update Purpose after archive.

## Requirements

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

### Requirement: Auto-Award Category System

The system SHALL support 13 award categories with configurable auto-granting.

#### Scenario: Award categories

- **GIVEN** the auto-award system
- **WHEN** listing available categories
- **THEN** categories SHALL include: contract, faction_hunter, injury, kill, scenario_kill, rank, scenario, skill, theatre_of_war, time, training, misc, scenario_kill

#### Scenario: Enable/disable per category

- **GIVEN** campaign options
- **WHEN** configuring auto-awards
- **THEN** each category has an enable/disable toggle
- **AND** disabled categories are skipped during auto-checks

#### Scenario: Best Award Only mode

- **GIVEN** a category with multiple qualifying awards
- **WHEN** "Best Award Only" is enabled for that category
- **THEN** only the highest-tier qualifying award is granted
- **AND** lower-tier awards are skipped

### Requirement: Auto-Award Trigger System

The system SHALL support multiple triggers for auto-award checks.

#### Scenario: Monthly trigger

- **GIVEN** a campaign advancing to the 1st of the month
- **WHEN** the auto-awards processor runs
- **THEN** all enabled categories are checked for all eligible personnel

#### Scenario: Post-mission trigger

- **GIVEN** a mission is completed
- **WHEN** post-mission processing runs
- **THEN** mission-related award categories are checked

#### Scenario: Post-scenario trigger

- **GIVEN** a scenario is resolved
- **WHEN** post-scenario processing runs
- **THEN** scenario-related award categories are checked

#### Scenario: Post-promotion trigger

- **GIVEN** a person is promoted
- **WHEN** post-promotion processing runs
- **THEN** rank-related award categories are checked

#### Scenario: Post-graduation trigger

- **GIVEN** a person graduates from training
- **WHEN** post-graduation processing runs
- **THEN** training-related award categories are checked

### Requirement: Eligibility Filtering

The system SHALL filter personnel for auto-award eligibility.

#### Scenario: Eligible personnel

- **GIVEN** a campaign with personnel
- **WHEN** determining eligibility for auto-awards
- **THEN** only ACTIVE personnel are eligible
- **AND** prisoners are excluded
- **AND** civilians are excluded

#### Scenario: Posthumous awards

- **GIVEN** a person with status KIA
- **WHEN** checking for auto-awards
- **THEN** the person is eligible if death date >= last mission end date
- **AND** posthumous awards are granted normally

### Requirement: Kill Award Tracking

The system SHALL track individual kills for kill-based awards.

#### Scenario: Individual kill count

- **GIVEN** a person with 10 confirmed kills
- **WHEN** checking kill awards
- **THEN** awards with threshold ≤ 10 are eligible
- **AND** awards with threshold > 10 are not eligible

#### Scenario: Kill award tiers

- **GIVEN** kill awards with thresholds: 5, 10, 25, 50, 100
- **WHEN** a person has 25 kills
- **THEN** with "Best Award Only" enabled, only the 25-kill award is granted
- **AND** with "Best Award Only" disabled, all awards ≤ 25 are granted

### Requirement: Time-in-Service Awards

The system SHALL track time-in-service for time-based awards.

#### Scenario: Service duration calculation

- **GIVEN** a person recruited on 3025-01-01 and current date 3026-01-01
- **WHEN** checking time awards
- **THEN** service duration is 1 year
- **AND** 1-year service award is eligible

#### Scenario: Cumulative time awards

- **GIVEN** time awards with thresholds: 1 year, 5 years, 10 years
- **WHEN** a person has 5 years of service
- **THEN** with "Best Award Only" enabled, only the 5-year award is granted
- **AND** with "Best Award Only" disabled, all awards ≤ 5 years are granted

### Requirement: Skill-Based Awards

The system SHALL grant awards based on skill level achievements.

#### Scenario: Skill threshold check

- **GIVEN** a person with Gunnery 2, Piloting 3
- **WHEN** checking skill awards
- **THEN** "Expert Gunner" (Gunnery ≤ 2) is eligible
- **AND** "Master Gunner" (Gunnery ≤ 1) is not eligible

#### Scenario: Multiple skill requirements

- **GIVEN** an award requiring Gunnery ≤ 2 AND Piloting ≤ 2
- **WHEN** a person has Gunnery 2, Piloting 3
- **THEN** the award is not eligible (both conditions must be met)

### Requirement: Mission Completion Awards

The system SHALL grant awards based on mission completion count.

#### Scenario: Mission count threshold

- **GIVEN** a person with 50 completed missions
- **WHEN** checking mission awards
- **THEN** awards with threshold ≤ 50 are eligible

#### Scenario: Mission outcome filtering

- **GIVEN** mission awards that require successful missions only
- **WHEN** counting missions
- **THEN** only missions with outcome SUCCESS or OUTSTANDING are counted
- **AND** FAILED missions are excluded
