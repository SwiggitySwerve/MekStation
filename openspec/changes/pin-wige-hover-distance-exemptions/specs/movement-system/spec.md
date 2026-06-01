# Spec Delta: Movement System

## MODIFIED Requirements

### Requirement: Automatic WiGE Landing

Represented positive-altitude WiGE movement SHALL apply MegaMek's automatic
landing rule when a WiGE vehicle, Glider ProtoMek, or LAM AirMek moves below
its source-backed minimum airborne distance.

#### Scenario: Prior movement distance contributes to automatic WiGE landing

- **GIVEN** a represented positive-altitude WiGE unit has already moved hexes
  this turn
- **WHEN** the player previews or commits another legal WiGE movement segment
- **THEN** the automatic landing minimum-distance check SHALL count both the
  represented hexes already moved this turn and the currently projected path
- **AND** a unit whose accumulated distance reaches the source-backed minimum
  SHALL remain airborne
- **AND** a unit whose accumulated distance stays below the source-backed
  minimum SHALL receive the same automatic landing projection and runtime state
  patch as a one-segment short move.

#### Scenario: Hover-style represented movement stays airborne

- **GIVEN** a represented positive-altitude WiGE unit can use a hover-style
  movement mode
- **WHEN** the player previews or commits a legal hover-style movement segment
- **THEN** the automatic WiGE landing helper SHALL NOT require a landing
- **AND** the runtime movement command SHALL NOT append an automatic WiGE
  landing state patch for that hover-style movement.
