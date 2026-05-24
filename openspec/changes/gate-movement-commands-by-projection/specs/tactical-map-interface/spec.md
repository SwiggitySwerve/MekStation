# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked.

#### Scenario: Movement commands consume the selected destination projection

- **GIVEN** a map or context menu has a movement projection for the selected
  destination hex
- **AND** that projection marks one or more walk, run, or jump options as
  blocked
- **WHEN** the tactical action dock or hex context menu renders matching
  movement commands
- **THEN** the blocked movement command SHALL be disabled with the same
  player-facing reason exposed by the movement projection
- **AND** legal same-hex movement options SHALL remain available without
  recalculating movement legality in the command surface.
