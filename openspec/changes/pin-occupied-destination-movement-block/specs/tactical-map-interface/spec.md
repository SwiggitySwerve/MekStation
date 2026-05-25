# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

#### Scenario: Occupied movement destinations stay blocked through preview and commit

**GIVEN** a tactical-map browser harness renders a selected ground unit adjacent to a clear hex occupied by another unit
**WHEN** the selected unit previews a walking move into the occupied hex
**THEN** the occupied hex SHALL render as non-reachable with `DestinationOccupied` invalid metadata
**AND** the hex SHALL show a non-color invalid movement badge that identifies the occupied-destination block
**AND** committed movement validation for the same unit, path, and destination SHALL reject with the same invalid reason, details, MP cost, and heat as the rendered projection
