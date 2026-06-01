# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose the weapon-range, firing-arc, LOS, cover, visibility, and target-number facts needed to understand attack legality before the player commits.

#### Scenario: Combat hover explains C3 range benefit

- **GIVEN** a combat projection has `c3BenefitApplied` with a C3 spotter id and spotter range
- **WHEN** the player inspects combat hover context for the target hex
- **THEN** the tooltip SHALL show the C3 spotter id, spotter range, and effective range bracket
- **AND** the same metadata SHALL be exposed through stable machine-readable attributes
- **AND** the projection explanation and combat aria label SHALL mention the C3 benefit
- **AND** the UI SHALL read this context from `ICombatRangeHex` rather than recalculating C3 network range locally
