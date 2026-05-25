# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

#### Scenario: Movement option rows expose rule-reference evidence

**GIVEN** a tactical movement projection renders multiple movement options for the same destination hex
**WHEN** the player hovers that destination and the Walk, Run, and Jump option rows are shown
**THEN** the option-row group SHALL expose the movement-channel source references and rule references from the shared per-hex tactical projection
**AND** each individual movement option row SHALL expose the same movement-channel rule references
**AND** movement cost, heat, terrain, elevation, blocked-reason, and command validation behavior SHALL remain unchanged
