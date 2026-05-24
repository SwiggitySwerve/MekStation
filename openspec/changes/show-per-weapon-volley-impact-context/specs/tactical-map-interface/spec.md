# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose the weapon-range, firing-arc, LOS, cover, visibility, and target-number facts needed to understand attack legality before the player commits.

#### Scenario: Combat hover explains per-weapon volley impact

- **GIVEN** a combat projection has one or more weapons in the projected available volley
- **WHEN** the player inspects combat hover context for the target hex
- **THEN** the tooltip SHALL show each contributing weapon's heat and listed damage
- **AND** ammo-consuming weapons SHALL show ammo consumed and post-shot ammo remaining when represented
- **AND** the same per-weapon impact metadata SHALL be exposed in machine-readable attributes
- **AND** the UI SHALL derive those details from the shared combat projection rather than recalculating weapon legality locally
