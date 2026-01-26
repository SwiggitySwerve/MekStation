## MODIFIED Requirements

### Requirement: Day Processor Pipeline
The system SHALL execute 17 day processors in sequence during day advancement, including the new acquisition processor.

#### Scenario: Acquisition processor runs daily
- **GIVEN** a campaign with useAcquisitionSystem enabled
- **WHEN** advanceDay is called
- **THEN** the acquisition processor attempts pending acquisitions, delivers arrived items, and emits acquisition events

#### Scenario: Acquisition processor is skipped when disabled
- **GIVEN** a campaign with useAcquisitionSystem set to false
- **WHEN** advanceDay is called
- **THEN** the acquisition processor returns immediately without processing

#### Scenario: Acquisition events are emitted
- **GIVEN** a campaign with pending acquisitions
- **WHEN** the acquisition processor runs
- **THEN** events are emitted for successful rolls, failed rolls, and deliveries
