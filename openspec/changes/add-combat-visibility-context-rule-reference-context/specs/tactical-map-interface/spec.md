# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose the weapon-range, firing-arc, LOS, cover,
visibility, and target-number facts needed to understand attack legality before
the player commits.

#### Scenario: Combat hover explains target visibility context

- **GIVEN** a combat projection classifies target visibility as visible, hidden,
  mixed, or last-known
- **WHEN** the player inspects combat hover context for the target hex
- **THEN** the tooltip SHALL show the visibility state and visible/obscured
  target IDs
- **AND** the same metadata SHALL be exposed through stable machine-readable
  attributes
- **AND** combat-only and combined movement+combat tactical hover context SHALL
  expose the same visibility facts
- **AND** the visibility row SHALL expose the shared combat projection source
  references and MegaMek-backed rule references that support the combat
  projection
- **AND** the UI SHALL read this context from `ICombatRangeHex` and the shared
  tactical projection rather than recalculating visibility locally
