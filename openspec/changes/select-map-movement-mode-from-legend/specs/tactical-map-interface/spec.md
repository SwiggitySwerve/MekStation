# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

#### Scenario: Movement legend selections select projection mode

**GIVEN** the player is in interactive Movement phase with a selected player-controlled unit
**AND** the MP legend exposes Walk, Run, and Jump rows
**WHEN** the player activates an inactive legal legend row
**THEN** the host SHALL seed a planned movement for the selected unit using the matching movement type
**AND** the planned movement SHALL use the unit's current position and facing until a destination hex is selected
**AND** the shared movement projection SHALL recalculate reachable and blocked hexes for the selected movement type
**AND** active or disabled legend rows SHALL remain non-actionable
**AND** movement cost, heat, terrain, elevation, and jump validation rules SHALL remain unchanged
