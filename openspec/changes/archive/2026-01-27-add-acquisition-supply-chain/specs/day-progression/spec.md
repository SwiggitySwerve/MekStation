## ADDED Requirements

### Requirement: Acquisition Day Processing

The system SHALL include an acquisition processor that runs daily to process acquisition rolls and deliveries.

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
