# Day Progression Specification Delta

## ADDED Requirements

### Requirement: Turnover Processor Registration
The system SHALL support registration of a turnover processor in the day pipeline that executes personnel turnover checks at configurable intervals.

#### Scenario: Register turnover processor
- **GIVEN** a campaign with turnover enabled
- **WHEN** the day pipeline is initialized
- **THEN** turnover processor is registered with phase PERSONNEL
- **AND** processor has unique ID "turnover"
- **AND** processor respects campaign turnover options

#### Scenario: Turnover processor executes on schedule
- **GIVEN** a campaign with turnover frequency set to "monthly"
- **WHEN** day advancement reaches the 1st of the month
- **THEN** turnover processor executes
- **AND** all eligible personnel are checked
- **AND** turnover events are generated for departures

### Requirement: Configurable Turnover Frequency
The system SHALL support configurable turnover check frequency with options for weekly, monthly, quarterly, annually, or never.

#### Scenario: Weekly turnover checks
- **GIVEN** a campaign with turnover frequency "weekly"
- **WHEN** day advancement reaches Monday
- **THEN** turnover processor executes
- **AND** checks are performed for all eligible personnel

#### Scenario: Monthly turnover checks
- **GIVEN** a campaign with turnover frequency "monthly"
- **WHEN** day advancement reaches the 1st of any month
- **THEN** turnover processor executes
- **AND** checks are performed for all eligible personnel

#### Scenario: Turnover disabled
- **GIVEN** a campaign with turnover frequency "never"
- **WHEN** day advancement occurs
- **THEN** turnover processor does not execute
- **AND** no turnover checks are performed

#### Scenario: Skip non-scheduled days
- **GIVEN** a campaign with turnover frequency "monthly"
- **WHEN** day advancement reaches the 15th of the month
- **THEN** turnover processor does not execute
- **AND** no turnover checks are performed
