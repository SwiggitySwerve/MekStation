# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose the weapon-range, firing-arc, LOS, cover,
visibility, and target-number facts needed to understand attack legality before
the player commits.

#### Scenario: Combat hover explains LOS blocker context

- **GIVEN** a combat projection has `lineOfSightBlocker` from the shared LOS classifier
- **WHEN** the player inspects combat hover context for the target hex
- **THEN** the tooltip SHALL show the LOS state, blocker hex, blocker kind, terrain metadata when present, and blocker reason
- **AND** the same metadata SHALL be exposed through stable machine-readable attributes
- **AND** combined movement+combat tactical hover context SHALL expose the same LOS blocker facts
- **AND** the UI SHALL read this context from `ICombatRangeHex` rather than recalculating LOS locally
