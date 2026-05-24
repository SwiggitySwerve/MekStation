# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Explanation

Movement highlights SHALL expose the BattleTech movement facts required to
understand walk, run, jump, and unit-type-specific movement legality.

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked. When live movement overlays combine multiple projections for the same
destination, they SHALL preserve the per-mode option facts instead of
collapsing them into an unexplained single state.

#### Scenario: Live jump overlay preserves same-hex walk and run options

- **GIVEN** a selected unit can evaluate a jump destination by walking or
  running as well
- **WHEN** the jump movement overlay renders that destination
- **THEN** the highlighted hex SHALL expose the jump, walk, and run option
  metadata, including reachability, MP cost, terrain cost, elevation
  delta/cost, and heat impact
- **AND** the jump projection SHALL remain the primary projection for map-click
  movement planning

#### Scenario: Live jump overlay does not widen with ground-only options

- **GIVEN** a selected unit has walk or run projections for destinations that
  are not present in the jump projection
- **WHEN** the jump movement overlay renders
- **THEN** those ground-only destinations SHALL NOT be added to the jump overlay
  solely as alternatives

#### Scenario: Blocked jump remains primary with reachable ground option

- **GIVEN** a selected unit can walk to a destination but its jump projection
  for that destination is blocked
- **WHEN** the jump movement overlay renders that destination
- **THEN** the highlighted hex SHALL keep the blocked jump projection primary
- **AND** same-hex option metadata SHALL expose the reachable walk or run
  alternative and the blocked jump invalid reason
