# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

#### Scenario: Browser-visible legend mode selections update movement projection

**GIVEN** a tactical-map browser harness renders a player-controlled biped unit with legal Walk, Run, and Jump movement projections
**AND** the MP legend starts with Run active
**WHEN** the player activates the Jump row in the MP legend
**THEN** the rendered destination hex SHALL change to the Jump movement projection with Jump MP, heat, terrain-cost, and elevation-cost metadata
**WHEN** the player activates the Walk row in the MP legend
**THEN** the rendered destination hex SHALL change to the Walk movement projection with Walk MP, heat, terrain-cost, and elevation-cost metadata
**AND** all displayed projection metadata SHALL come from the shared derived movement projection fixtures
