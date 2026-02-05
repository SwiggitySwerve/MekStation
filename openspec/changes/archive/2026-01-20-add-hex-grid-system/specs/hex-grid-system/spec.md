# Hex Grid System Specification

## ADDED Requirements

### Requirement: Axial Coordinate System

The system SHALL use axial coordinates (q, r) for hex positioning.

#### Scenario: Coordinate definition

- **GIVEN** a hex on the grid
- **WHEN** identifying its position
- **THEN** position SHALL be expressed as (q, r) coordinates
- **AND** q increases east, r increases southeast

#### Scenario: Distance calculation

- **GIVEN** two hexes at (q1, r1) and (q2, r2)
- **WHEN** calculating distance
- **THEN** distance SHALL equal `max(abs(q1-q2), abs(r1-r2), abs(q1+r1-q2-r2))`
- **AND** result is in hexes (integers)

#### Scenario: Neighbor identification

- **GIVEN** a hex at (q, r)
- **WHEN** finding adjacent hexes
- **THEN** six neighbors SHALL be returned
- **AND** neighbors are at: (q+1,r), (q+1,r-1), (q,r-1), (q-1,r), (q-1,r+1), (q,r+1)

### Requirement: Unit Positioning

The system SHALL track unit positions with hex and facing.

#### Scenario: Position assignment

- **GIVEN** a unit entering the map
- **WHEN** placing the unit
- **THEN** unit MUST be assigned a hex coordinate
- **AND** unit MUST be assigned a facing (0-5)
- **AND** hex SHALL be marked as occupied

#### Scenario: Facing directions

- **GIVEN** a unit on the map
- **WHEN** setting facing
- **THEN** facing 0 = North
- **AND** facing 1 = Northeast
- **AND** facing 2 = Southeast
- **AND** facing 3 = South
- **AND** facing 4 = Southwest
- **AND** facing 5 = Northwest

#### Scenario: Prone status

- **GIVEN** a unit that has fallen
- **WHEN** marking as prone
- **THEN** prone status SHALL be true
- **AND** unit remains in same hex
- **AND** unit movement is restricted until standing

### Requirement: Firing Arcs

The system SHALL determine firing arcs based on unit facing.

#### Scenario: Front arc

- **GIVEN** a unit facing direction F
- **WHEN** determining front arc
- **THEN** front arc includes hexes in directions F-1, F, F+1 (mod 6)
- **AND** weapons may fire into front arc

#### Scenario: Side arcs

- **GIVEN** a unit facing direction F
- **WHEN** determining side arcs
- **THEN** left side includes direction F+2 (mod 6)
- **AND** right side includes direction F-2 (mod 6)
- **AND** side-mounted weapons fire into respective arcs

#### Scenario: Rear arc

- **GIVEN** a unit facing direction F
- **WHEN** determining rear arc
- **THEN** rear arc includes directions F+3, F+4, F-3 (mod 6, overlapping with F+3)
- **AND** rear-mounted weapons fire into rear arc

#### Scenario: Target arc determination

- **GIVEN** attacker at position A facing F, target at position B
- **WHEN** determining which arc target is in
- **THEN** angle from A to B SHALL be calculated
- **AND** arc (front/left/right/rear) SHALL be returned

### Requirement: Movement Calculation

The system SHALL calculate valid movement destinations and costs.

#### Scenario: Walking movement

- **GIVEN** a unit with walk MP of N
- **WHEN** calculating valid walk destinations
- **THEN** all hexes within N distance SHALL be valid
- **AND** each hex costs 1 MP

#### Scenario: Running movement

- **GIVEN** a unit with walk MP of N
- **WHEN** calculating valid run destinations
- **THEN** run MP equals ceil(N \* 1.5)
- **AND** all hexes within run MP distance SHALL be valid
- **AND** running generates heat and affects to-hit

#### Scenario: Jumping movement

- **GIVEN** a unit with jump MP of J
- **WHEN** calculating valid jump destinations
- **THEN** all hexes within J distance SHALL be valid
- **AND** any facing may be chosen on landing
- **AND** jumping generates heat based on MP used

#### Scenario: Facing change

- **GIVEN** a unit during movement
- **WHEN** changing facing
- **THEN** facing change costs 0 MP
- **AND** any number of facing changes allowed

### Requirement: Range Brackets

The system SHALL classify range into brackets for combat modifiers.

#### Scenario: Range bracket determination

- **GIVEN** distance D between attacker and target
- **WHEN** determining range bracket
- **THEN** D <= 3: Short range (+0 modifier)
- **AND** D 4-6: Medium range (+2 modifier)
- **AND** D 7-15: Long range (+4 modifier)
- **AND** D >= 16: Extreme range (weapon-specific)

#### Scenario: Weapon range limits

- **GIVEN** a weapon with range profile (S/M/L)
- **WHEN** checking if target is in range
- **THEN** target MUST be within weapon's maximum range
- **AND** range bracket modifiers apply based on actual distance

### Requirement: Hex Grid Bounds

The system SHALL define map boundaries and enforce them.

#### Scenario: Map creation

- **GIVEN** map configuration with size parameters
- **WHEN** creating hex grid
- **THEN** grid SHALL have defined boundaries
- **AND** only valid hexes within bounds exist

#### Scenario: Boundary enforcement

- **GIVEN** a unit attempting to move
- **WHEN** destination is outside map bounds
- **THEN** movement SHALL be rejected
- **AND** error message indicates out of bounds

#### Scenario: Edge hexes

- **GIVEN** a hex on the map edge
- **WHEN** calculating neighbors
- **THEN** only in-bounds neighbors SHALL be returned
- **AND** out-of-bounds neighbors excluded
