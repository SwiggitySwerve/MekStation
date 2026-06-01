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

#### Scenario: Live run overlay preserves walk and run options

- **GIVEN** a selected unit can evaluate the same destination by both walking
  and running
- **WHEN** the run movement overlay renders that destination
- **THEN** the highlighted hex SHALL expose both walk and run option metadata,
  including reachability, MP cost, terrain cost, elevation delta/cost, and heat
  impact
- **AND** a reachable run projection SHALL remain the primary active-mode
  projection for map-click movement planning

#### Scenario: Live run overlay keeps blocked run reason with walk fallback

- **GIVEN** a selected unit can walk to a destination but the corresponding run
  projection is blocked
- **WHEN** the run movement overlay renders that destination
- **THEN** the highlighted hex SHALL use the reachable walk fallback as the
  primary projection
- **AND** the same-hex option metadata SHALL still expose the blocked run
  option and its invalid reason
