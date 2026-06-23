## ADDED Requirements

### Requirement: Command-backed UI flow shell inspection
The system SHALL provide a dedicated command surface for inspecting the gameplay UI flow shell by journey and for validating the shell without running journey evidence generation.

#### Scenario: UI flow shell validates independently
- **WHEN** the operator runs the UI flow shell validation command
- **THEN** the command SHALL validate every required flow, route template, and required checkpoint sequence
- **AND** it SHALL report flow, error, and warning counts

#### Scenario: Journey flow inspection is filterable
- **WHEN** the operator inspects a single journey flow
- **THEN** the command SHALL print that journey's module, player/GM roles, primary action route, QC command, and ordered checkpoints
- **AND** JSON mode SHALL expose the same data for automation

### Requirement: Required journey checkpoint order validation
The UI flow shell validator SHALL maintain ordered required checkpoint gates for every required journey so route sequence drift fails before manual UI review.

#### Scenario: Missing checkpoint fails validation
- **WHEN** a required journey flow omits a checkpoint from its required route sequence
- **THEN** validation SHALL fail and name the journey and missing checkpoint

#### Scenario: Existing shell can include extra checkpoints
- **WHEN** a flow contains all required checkpoints in order and includes additional checkpoints
- **THEN** validation SHALL pass the ordered checkpoint gate
