# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose the weapon-range, firing-arc, LOS, cover, visibility, and target-number facts needed to understand attack legality before the player commits.

#### Scenario: Combat hover explains represented underwater weapon restrictions

- **GIVEN** a combat projection contains one or more weapon range options blocked by represented environment rules
- **WHEN** the player inspects combat hover context for the target hex
- **THEN** the tooltip SHALL show each environment-blocked weapon id with the projection-provided blocked reason
- **AND** the same environment-blocked weapon ids and reasons SHALL be exposed through stable machine-readable attributes
- **AND** combined tactical hovers SHALL preserve the same environment restriction context alongside movement context
- **AND** the UI SHALL read those reasons from `ICombatRangeHex.weaponRangeOptions` rather than recalculating water or torpedo legality locally
