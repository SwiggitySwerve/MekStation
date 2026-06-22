## ADDED Requirements

### Requirement: Journey UI flow mapping validation
The journey QC validator SHALL verify that every required journey ID is represented by the gameplay UI flow registry and that every UI flow journey ID exists in the journey catalog and validation graph.

#### Scenario: Required journey lacks UI flow
- **WHEN** `npm.cmd run qc:journeys:validate` runs and a required journey ID is missing from the UI flow registry
- **THEN** validation fails and names the missing journey ID

#### Scenario: UI flow references unknown journey
- **WHEN** the UI flow registry references a journey ID that is not present in the journey scenario catalog
- **THEN** validation fails and names the unknown journey ID
