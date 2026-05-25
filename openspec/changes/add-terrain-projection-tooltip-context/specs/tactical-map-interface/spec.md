# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

#### Scenario: Terrain and unreachable hover tooltips expose projection context

**GIVEN** a projected hex has terrain-only hover state or is hovered while the caller marks it unreachable
**WHEN** the map renders the terrain-only or unreachable hover tooltip
**THEN** the tooltip SHALL expose the shared projection status and intent
**AND** the tooltip SHALL expose movement-channel and combat-channel statuses from the shared projection
**AND** the tooltip SHALL expose shared projection blocked reasons when present
**AND** the tooltip SHALL expose stable metadata for status, intent, channel statuses, blocked reasons, and projection explanation
**AND** the tooltip SHALL render the shared projection explanation as readable text when present
**AND** the tooltip SHALL preserve the existing terrain/elevation, cover, LOS, heat-effect, and isometric occluder explanations
