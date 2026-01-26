# Day Progression Specification Delta

## ADDED Requirements

### Requirement: Maintenance Processor Registration
The system SHALL support registration of a maintenance processor in the day pipeline that executes equipment maintenance checks at configurable intervals.

#### Scenario: Register maintenance processor
- **GIVEN** a campaign with maintenance enabled
- **WHEN** the day pipeline is initialized
- **THEN** maintenance processor is registered with phase MAINTENANCE
- **AND** processor has unique ID "maintenance"
- **AND** processor respects campaign maintenance options

#### Scenario: Maintenance processor executes on schedule
- **GIVEN** a campaign with maintenance frequency set to "monthly"
- **WHEN** day advancement reaches the 1st of the month
- **THEN** maintenance processor executes
- **AND** all active units are checked
- **AND** maintenance events are generated for failures

### Requirement: Configurable Maintenance Frequency
The system SHALL support configurable maintenance check frequency with options for weekly, monthly, quarterly, annually, or never.

#### Scenario: Weekly maintenance checks
- **GIVEN** a campaign with maintenance frequency "weekly"
- **WHEN** day advancement reaches Monday
- **THEN** maintenance processor executes
- **AND** checks are performed for all active units

#### Scenario: Monthly maintenance checks
- **GIVEN** a campaign with maintenance frequency "monthly"
- **WHEN** day advancement reaches the 1st of any month
- **THEN** maintenance processor executes
- **AND** checks are performed for all active units

#### Scenario: Maintenance disabled
- **GIVEN** a campaign with maintenance frequency "never"
- **WHEN** day advancement occurs
- **THEN** maintenance processor does not execute
- **AND** no maintenance checks are performed

#### Scenario: Skip non-scheduled days
- **GIVEN** a campaign with maintenance frequency "monthly"
- **WHEN** day advancement reaches the 15th of the month
- **THEN** maintenance processor does not execute
- **AND** no maintenance checks are performed

### Requirement: Maintenance Event Generation
The system SHALL generate day events for maintenance check results, including failures, quality changes, and critical failures.

#### Scenario: Generate event for maintenance failure
- **GIVEN** a maintenance check that fails
- **WHEN** maintenance processor completes
- **THEN** day event is generated with type "maintenance_failure"
- **AND** event includes unit ID, quality before/after, and roll details

#### Scenario: Generate event for quality improvement
- **GIVEN** a maintenance check that succeeds with high margin
- **WHEN** maintenance processor completes and quality improves
- **THEN** day event is generated with type "maintenance_quality_improved"
- **AND** event includes unit ID and new quality grade

#### Scenario: Generate event for critical failure
- **GIVEN** a maintenance check that critically fails
- **WHEN** maintenance processor completes
- **THEN** day event is generated with type "maintenance_critical_failure"
- **AND** event includes unit ID, damage details, and quality degradation
