# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, pending conversion step/cost
metadata where applicable, and invalid reason when blocked. Altitude-tracked
VTOL/WiGE states SHALL distinguish landed/hover ground projection from
airborne movement that requires altitude controls.

#### Scenario: Airborne VTOL/WiGE ground movement is explicitly blocked

- **GIVEN** a represented unit is using VTOL or WiGE motive movement
- **AND** its altitude-tracked combat state has positive altitude
- **WHEN** the ground movement overlay or commit validator evaluates a walk or
  run destination
- **THEN** the map SHALL NOT present ordinary ground movement as legal
- **AND** the projection SHALL expose an unreachable movement hex with an
  `InvalidDestination` reason explaining that airborne VTOL/WiGE movement uses
  altitude controls outside the ground movement projection
- **AND** committed ground movement SHALL reject with the same reason and
  details until airborne VTOL/WiGE projection is implemented.

#### Scenario: Landed VTOL/WiGE ground projection remains available

- **GIVEN** a represented unit is using VTOL or WiGE motive movement
- **AND** its altitude-tracked combat state is absent or has altitude zero
- **WHEN** the ground movement overlay evaluates a walk or run destination
- **THEN** the map SHALL preserve the existing VTOL/WiGE terrain and elevation
  projection behavior.
