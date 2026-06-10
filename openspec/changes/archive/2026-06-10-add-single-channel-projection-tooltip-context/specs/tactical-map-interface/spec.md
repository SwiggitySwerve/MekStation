# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

#### Scenario: Single-channel hover tooltips expose projection context

**GIVEN** a projected hex has only movement data or only combat data
**WHEN** the player hovers that hex and the map renders the movement-only or combat-only tooltip
**THEN** the tooltip SHALL expose the shared projection status and intent
**AND** the tooltip SHALL expose movement-channel and combat-channel statuses from the shared projection
**AND** the tooltip SHALL expose shared projection blocked reasons when present
**AND** the tooltip SHALL expose stable metadata for status, intent, channel statuses, blocked reasons, and projection explanation
**AND** the tooltip SHALL render the shared projection explanation as readable text when present
**AND** the tooltip SHALL NOT recalculate movement or combat rules outside the shared projection
