# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Detail Surface

For each projected combat hex, the map SHALL expose weapon range band, firing
arc, line of sight, valid target state, blocked target state, cover/visibility
implications, available weapons, and invalid reasons from the shared combat
projection.

#### Scenario: Combat cover badges identify cover level and modifier

- **GIVEN** a combat projection target has a positive cover modifier
- **WHEN** the target combat cover badge is rendered
- **THEN** the visible badge label SHALL include both the projected cover level
  shorthand and the projected to-hit modifier
- **AND** the badge metadata SHALL expose the rendered cover label, cover level,
  modifier, and reason without recalculating combat legality outside the shared
  combat projection.

#### Scenario: Elevation partial cover remains attackable

- **GIVEN** one target is blocked by an intervening elevation hex and another
  target is only partially covered by lower adjacent elevation
- **WHEN** the tactical map renders combat projection metadata
- **THEN** the blocked target SHALL expose `NoLineOfSight` rejection metadata
- **AND** the partially covered target SHALL remain attackable while exposing
  the projected partial-cover level, modifier, reason, and to-hit modifier
