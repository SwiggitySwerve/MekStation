# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose the weapon-range, firing-arc, LOS, cover,
visibility, and target-number facts needed to understand attack legality before
the player commits.

#### Scenario: Combat hover explains represented hull-down target cover

- **GIVEN** a combat projection targets a represented hull-down unit
- **AND** LOS or terrain cover is present for that target
- **WHEN** the player inspects the target hex in the tactical map
- **THEN** the map SHALL expose the represented hull-down flag, hull-down
  modifier, and hull-down reason through stable metadata
- **AND** combat hover context SHALL include the hull-down cover explanation
- **AND** the to-hit modifier context SHALL include the same `Hull Down +2`
  modifier that committed attack declaration records.
