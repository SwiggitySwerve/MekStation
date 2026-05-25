# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

#### Scenario: QuadVee vehicle conversion changes movement projection and commit legality

**GIVEN** a tactical-map browser harness renders a QuadVee with a runtime conversion profile
**WHEN** the QuadVee remains in Mek mode and previews a walking move up a 2-level elevation climb
**THEN** the map SHALL render the destination as reachable using Mek-style ground movement, elevation cost, and movement heat metadata
**WHEN** the same represented QuadVee is in tracked vehicle mode and previews the same elevation climb
**THEN** the map SHALL render the destination as blocked with tracked movement motive metadata
**AND** the MP legend SHALL show jump movement disabled from the same runtime conversion state
**AND** committed movement validation SHALL accept or reject each case with the same MP, heat, path, invalid reason, and details as the rendered projection
