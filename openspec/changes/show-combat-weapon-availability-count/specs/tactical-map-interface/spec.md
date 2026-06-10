# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Combat Projection Detail Surface

For each projected combat hex, the map SHALL expose weapon range band, firing
arc, line of sight, valid target state, blocked target state, cover/visibility
implications, available weapons, and invalid reasons from the shared combat
projection.

#### Scenario: Multi-weapon targets show visible weapon availability

- **GIVEN** a target hex has combat projection data for multiple weapons
- **AND** some weapons are available while other weapons are blocked by range,
  arc, environment, or another projected legality reason
- **WHEN** the target hex combat badge is rendered
- **THEN** the map SHALL show a compact visible available/total weapon count
- **AND** the badge metadata SHALL expose available count, total count, blocked
  count, available weapon ids, and blocked weapon reasons from the shared combat
  projection
- **AND** single-weapon target badges SHALL remain uncluttered by the count.
