# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Detail Surface

For each projected combat hex, the map SHALL expose weapon range band, firing
arc, line of sight, valid target state, blocked target state, cover/visibility
implications, available weapons, and invalid reasons from the shared combat
projection.

#### Scenario: Combat range badges show range band and distance

- **GIVEN** a combat projection has a range band and exact hex distance
- **WHEN** the target or range hex combat badge is rendered
- **THEN** the visible badge label SHALL include both range band and distance
- **AND** the badge metadata SHALL expose the same rendered range/distance label
  without recalculating combat legality outside the shared combat projection.
