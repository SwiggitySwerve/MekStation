# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

#### Scenario: Locked movement no longer projects reachable destinations

**GIVEN** a selected unit has already locked or resolved movement for the current Movement phase
**WHEN** the tactical map and command surfaces render movement affordances for that unit
**THEN** the map SHALL NOT show reachable movement overlays, hover movement paths, hover MP costs, or an MP legend for that unit
**AND** movement commands SHALL be disabled with the player-facing reason that the unit has already locked movement this phase
**AND** a direct attempted movement commit for that unit SHALL be rejected before position, heat, or lock-state changes
**AND** the rejection reason SHALL be shared with movement projection and command availability logic
