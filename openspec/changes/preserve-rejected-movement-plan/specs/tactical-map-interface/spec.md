# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

#### Scenario: Rejected movement commits preserve the correction surface

- **GIVEN** a player has a planned movement derived from the tactical map projection
- **AND** the engine rejects the movement commit by emitting `MovementInvalid` instead of `MovementDeclared`
- **WHEN** the movement commit handler receives the updated session
- **THEN** the UI SHALL keep the selected unit and planned movement active for correction
- **AND** the UI SHALL refresh the session so the invalid movement reason can be surfaced
- **AND** the UI SHALL NOT advance to the post-movement selection state or enqueue movement animation until a `MovementDeclared` event exists for that unit.
