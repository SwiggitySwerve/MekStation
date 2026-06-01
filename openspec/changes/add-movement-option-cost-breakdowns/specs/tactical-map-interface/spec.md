# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked.

#### Scenario: Same-hex movement options preserve cost breakdowns

- **GIVEN** a map receives multiple movement projections for the same hex
- **AND** those projections have different terrain costs, elevation deltas, or
  elevation costs
- **WHEN** the shared tactical projection and rendered hex metadata are exposed
- **THEN** every same-hex movement option SHALL retain its own terrain cost,
  elevation delta, and elevation cost
- **AND** the projection explanation SHALL describe each option's cost
  components separately from the primary option
- **AND** the rendered hex and movement badge metadata SHALL expose those
  per-option cost components without relying on color alone

#### Scenario: Zero-cost elevation changes remain explicit

- **GIVEN** a projected movement step changes elevation but rules charge zero
  elevation MP for that motive, such as represented VTOL movement or jumping
- **WHEN** the movement cost badge renders
- **THEN** the visible badge and accessible title SHALL expose the elevation
  cost as `+0`
- **AND** the badge SHALL still expose the elevation delta separately
