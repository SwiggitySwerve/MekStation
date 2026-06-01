# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked. A LAM in AirMek conversion mode SHALL distinguish grounded WiGE
movement from airborne AirMek/WiGE movement before projecting ground movement.

#### Scenario: Airborne LAM AirMek ground movement is explicitly blocked

- **GIVEN** a LAM is in AirMek conversion mode
- **AND** its combat state marks it airborne by altitude or airborne lifecycle
  state
- **WHEN** the ground movement overlay or commit validator evaluates a walk,
  run, or jump destination
- **THEN** the map SHALL NOT present grounded WiGE movement as legal
- **AND** the projection SHALL expose an unreachable movement hex with an
  `InvalidDestination` reason explaining that airborne LAM AirMek movement uses
  airborne WiGE rules outside the ground movement projection
- **AND** committed ground movement SHALL reject with the same reason and
  details until airborne AirMek/WiGE projection is implemented.
