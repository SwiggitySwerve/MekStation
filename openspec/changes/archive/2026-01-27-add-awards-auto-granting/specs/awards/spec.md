## ADDED Requirements

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
