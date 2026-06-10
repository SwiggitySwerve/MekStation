# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose the weapon-range, firing-arc, LOS, cover,
visibility, and target-number facts needed to understand attack legality before
the player commits.

#### Scenario: Combat hover explains minimum-range context

- **GIVEN** a combat projection applies a minimum-range penalty to a represented weapon attack
- **WHEN** the player inspects combat hover context for the target hex
- **THEN** the tooltip SHALL show the minimum-range penalty reason
- **AND** the same metadata SHALL expose the penalty value and affected weapon IDs through stable machine-readable attributes
- **AND** combat-only and combined movement+combat tactical hover context SHALL expose the same minimum-range facts
- **AND** the minimum-range row SHALL expose the shared combat projection source references and MegaMek-backed rule references that support the combat projection
- **AND** the UI SHALL read this context from `ICombatRangeHex` and the shared tactical projection rather than recalculating minimum-range penalties locally
