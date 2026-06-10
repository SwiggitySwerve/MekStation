# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

#### Scenario: Movement mode commands consume heat-adjusted MP budgets

- **GIVEN** the tactical command context includes an engine-derived movement capability for the active unit
- **AND** heat penalties reduce Walk, Run, or Jump to 0 effective MP using the same MP calculation consumed by movement projection
- **WHEN** the movement command dock or hex context menu renders that movement mode
- **THEN** the command SHALL be disabled before dispatch
- **AND** the disabled reason SHALL explain that heat leaves no effective MP for that movement mode
- **AND** raw zero capability for a movement mode SHALL remain disabled with a capability reason
- **AND** command surfaces SHALL preserve legacy availability when no movement capability is supplied.
