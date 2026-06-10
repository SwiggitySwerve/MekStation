# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

#### Scenario: Movement command payloads select projection mode

**GIVEN** the player is in interactive Movement phase with a selected player-controlled unit
**WHEN** the player activates a tactical movement command whose commit payload contains `mode=walk`, `mode=run`, or `mode=jump`
**THEN** the host SHALL preserve the structured command payload through the command dispatch surface
**AND** the host SHALL seed a planned movement for the selected unit using the matching movement type
**AND** the planned movement SHALL use the unit's current position and facing until a destination hex is selected
**AND** the shared movement projection SHALL recalculate reachable and blocked hexes for the selected movement type
**AND** non-movement command payloads or legacy action ids SHALL preserve their existing behavior
