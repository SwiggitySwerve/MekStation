# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

Movement projection state controls SHALL derive represented VTOL/WiGE
altitude-control command availability from the same selected-unit terrain,
elevation, and unit-height facts shown on the tactical map. Climb and Descend
commands SHALL be disabled with player-facing reasons when current terrain
clearance prevents the represented UP/DOWN step.

#### Scenario: Altitude-control commands honor terrain clearance

- **GIVEN** a selected movement-phase VTOL or WiGE unit has represented vehicle
  altitude, current-hex terrain, current-hex elevation, and movement unit-height
  metadata
- **WHEN** the player inspects Climb or Descend command availability
- **THEN** Descend SHALL be unavailable if the unit is already at the minimum
  represented clearance for water, woods foliage, a bridge deck, or a building
  roof
- **AND** Climb SHALL be unavailable for a VTOL under a bridge when represented
  unit height leaves no upward clearance
- **AND** ordinary WiGE Climb SHALL use represented building-top clearance
  instead of the flat landed altitude-1 cap
- **AND** legal Climb/Descend commands SHALL continue dispatching replayable
  altitude-control runtime state with represented step count and MP cost.
