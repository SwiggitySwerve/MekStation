# Spec Delta: Combat Resolution

## ADDED Requirements

### Requirement: Integrated Combat Projection Agreement

Combat projection SHALL represent the same target legality, range band, firing
arc, selected-weapon applicability, LOS/visibility state, cover, and represented
environmental restrictions that committed attack validation and resolution will
enforce.

#### Scenario: Represented attacks stay preview/commit aligned

- **GIVEN** a selected unit previews weapon or physical attacks on the tactical
  map
- **WHEN** the projection marks a target legal, blocked, out of range, out of
  arc, hidden, covered, or restricted by represented terrain/environment state
- **THEN** committing the unchanged attack SHALL use the same range, arc, LOS,
  cover, weapon, and to-hit context
- **AND** rejected attacks SHALL surface the same typed reason the preview
  exposed before commit.
