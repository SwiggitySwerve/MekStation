# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked.

#### Scenario: Same-hex blocked movement option remains explainable

- **GIVEN** a map receives multiple movement projections for the same hex
- **AND** at least one option is reachable while another option is blocked by
  engine movement validation
- **WHEN** the shared tactical projection and rendered hex metadata are exposed
- **THEN** the hex projection SHALL report a mixed status
- **AND** the blocked option's movement type, invalid reason, and invalid detail
  SHALL remain available in the projection explanation and rendered metadata
- **AND** the movement badge SHALL expose the blocked option reason without
  hiding the reachable option's MP cost
