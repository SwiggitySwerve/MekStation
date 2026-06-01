# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose the weapon-range, firing-arc, LOS, cover,
visibility, and target-number facts needed to understand attack legality before
the player commits.

#### Scenario: Combat hover explains target cover context

- **GIVEN** a combat projection applies target cover from terrain, water,
  elevation, or buildings
- **WHEN** the player inspects combat hover context for the target hex
- **THEN** the tooltip SHALL show the cover level, modifier, partial-cover flag,
  and cover reason
- **AND** the same metadata SHALL be exposed through stable machine-readable
  attributes
- **AND** combat-only and combined movement+combat tactical hover context SHALL
  expose the same cover facts
- **AND** the cover row SHALL expose the shared combat projection source
  references and MegaMek-backed rule references that support the combat
  projection
- **AND** the UI SHALL read this context from `ICombatRangeHex` and the shared
  tactical projection rather than recalculating cover locally
