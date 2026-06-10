# Spec Delta: Movement System

## ADDED Requirements

### Requirement: Movement Declaration Runtime State Agreement

Committed positive-altitude WiGE-style movement SHALL replay the automatic
landing state transition when MegaMek's short-distance landing rule applies, so
post-movement map projection, combat modifiers, and replay state all observe
the landed unit state.

#### Scenario: Short WiGE movement commits automatic landing

- **GIVEN** a positive-altitude WiGE-style unit commits a non-jump movement path
  shorter than the source-backed minimum airborne distance
- **AND** the unit did not use represented altitude-control/takeoff steps during
  this movement declaration
- **WHEN** the engine accepts the movement declaration
- **THEN** it SHALL append a replayable runtime movement-state change that
  clears the represented WiGE altitude after the movement declaration
- **AND** subsequent movement projection SHALL no longer treat the unit as
  positive-altitude airborne.

#### Scenario: Glider ProtoMek uses four-hex minimum distance

- **GIVEN** a positive-altitude Glider ProtoMek commits represented WiGE
  movement
- **WHEN** it moves four or more hexes without jumping or altitude-control
  takeoff steps
- **THEN** the automatic landing runtime state SHALL NOT be emitted.
