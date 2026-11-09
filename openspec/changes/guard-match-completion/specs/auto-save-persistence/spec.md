## ADDED Requirements

### Requirement: Terminal Match Metadata Ordering

Local single-player and P2P persistence SHALL mark a match completed only after its GameEnded event has persisted, using the event timestamp and the persisted match identifier.

#### Scenario: Terminal append succeeds

- **GIVEN** a local match with active metadata
- **WHEN** persistence of its GameEnded event succeeds
- **THEN** the completion operation SHALL receive the match identifier and recorded event timestamp

#### Scenario: Terminal append remains pending or fails

- **WHEN** the terminal append is pending or rejects
- **THEN** persistence SHALL NOT mark the match completed
- **AND** an append rejection SHALL remain observable through the caller's existing failure reporting

#### Scenario: Completion metadata write fails

- **WHEN** the event append succeeds but completion metadata persistence rejects
- **THEN** the caller SHALL report that persistence failure
- **AND** the persisted terminal event SHALL remain available

#### Scenario: Ordinary event persists

- **WHEN** an event other than GameEnded persists
- **THEN** persistence SHALL NOT mark the match completed
