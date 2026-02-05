## ADDED Requirements

### Requirement: Monthly Auto-Awards Processor

The system SHALL run auto-award checks on the 1st of each month.

#### Scenario: Monthly auto-award check

- **GIVEN** a campaign advancing to the 1st of the month
- **WHEN** the auto-awards processor runs
- **THEN** all enabled award categories are checked
- **AND** eligible personnel are processed
- **AND** qualifying awards are granted automatically

#### Scenario: Skip non-1st days

- **GIVEN** a campaign advancing to the 15th of the month
- **WHEN** the auto-awards processor runs
- **THEN** no auto-award checks are performed
- **AND** the processor returns immediately

#### Scenario: Opt-in via campaign option

- **GIVEN** a campaign with all auto-award categories disabled
- **WHEN** the auto-awards processor runs
- **THEN** no awards are granted
- **AND** manual award granting still works

#### Scenario: Auto-award events in day report

- **GIVEN** auto-awards are granted during day advancement
- **WHEN** viewing the day report
- **THEN** each granted award appears as an IAwardGrantedEvent
- **AND** events show: person name, award name, category, trigger type
