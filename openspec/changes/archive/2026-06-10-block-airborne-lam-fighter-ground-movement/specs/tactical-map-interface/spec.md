# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked. A LAM in Fighter conversion mode SHALL distinguish grounded taxi
movement from airborne aerospace flight state before projecting movement.

#### Scenario: Airborne LAM Fighter ground movement is explicitly blocked

- **GIVEN** a LAM is in Fighter conversion mode
- **AND** its combat state marks it airborne by altitude or airborne lifecycle
  state
- **WHEN** the ground movement overlay or commit validator evaluates a walk,
  run, or jump destination
- **THEN** the map SHALL NOT fall back to the imported Mek walk/run/jump
  capability
- **AND** the projection SHALL expose an unreachable movement hex with an
  `InvalidDestination` reason explaining that airborne LAM Fighter movement
  uses aerospace flight rules outside the ground movement projection
- **AND** committed ground movement SHALL reject with the same reason and
  details until aerospace flight projection is implemented.
