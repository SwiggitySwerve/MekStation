# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose the weapon-range, firing-arc, LOS, cover,
visibility, indirect-fire, and target-number facts needed to understand attack
legality before the player commits.

#### Scenario: Combat hover explains indirect-fire context

- **GIVEN** a combat projection permits an otherwise LOS-blocked represented weapon attack through indirect fire
- **WHEN** the player inspects combat hover context for the target hex
- **THEN** the tooltip SHALL show the indirect-fire reason
- **AND** the same metadata SHALL expose indirect-fire availability, spotter id, basis, to-hit penalty, spotter gunnery, spotter skill modifier, Forward Observer cancellation, cancelled penalty, and reason through stable machine-readable attributes when represented
- **AND** combat-only and combined movement+combat tactical hover context SHALL expose the same indirect-fire facts
- **AND** the indirect-fire row SHALL expose the shared combat projection source references and MegaMek-backed rule references that support the combat projection
- **AND** the UI SHALL read this context from `ICombatRangeHex` and the shared tactical projection rather than recalculating indirect-fire eligibility or penalties locally
