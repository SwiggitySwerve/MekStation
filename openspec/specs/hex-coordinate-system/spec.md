# hex-coordinate-system Specification

## Purpose

Defines the hexagonal coordinate system used for tactical gameplay, including coordinate representations, distance calculations, line-of-sight algorithms, neighbor enumeration, and grid management operations. This system provides the mathematical foundation for all hex-based tactical operations in MekStation.

## Requirements

### Requirement: Axial Coordinate System

The system SHALL use axial coordinates (q, r) as the primary coordinate representation for hex positions.

#### Scenario: Axial coordinate representation

- **WHEN** representing a hex position
- **THEN** coordinates SHALL be stored as `{ q: number, r: number }`
- **AND** q represents the column offset
- **AND** r represents the row offset
- **AND** the origin (0,0) represents the center hex

#### Scenario: Coordinate key generation

- **WHEN** converting coordinates to a map key
- **THEN** key SHALL be formatted as "q,r"
- **AND** coordinate (3,2) SHALL produce key "3,2"
- **AND** coordinate (-1,4) SHALL produce key "-1,4"

#### Scenario: Coordinate key parsing

- **WHEN** parsing a coordinate key "5,-3"
- **THEN** result SHALL be `{ q: 5, r: -3 }`

### Requirement: Cube Coordinate Conversion

The system SHALL support conversion between axial and cube coordinate systems for distance calculations.

#### Scenario: Axial to cube conversion

- **WHEN** converting axial coordinate (3,2) to cube
- **THEN** result SHALL be `{ x: 3, y: -5, z: 2 }`
- **AND** cube coordinates SHALL satisfy x + y + z = 0

#### Scenario: Cube to axial conversion

- **WHEN** converting cube coordinate `{ x: 3, y: -5, z: 2 }` to axial
- **THEN** result SHALL be `{ q: 3, r: 2 }`

#### Scenario: Cube coordinate constraint

- **WHEN** creating cube coordinates
- **THEN** x + y + z SHALL always equal 0
- **AND** y SHALL equal -q - r

### Requirement: Distance Calculation

The system SHALL calculate hex distance using the axial distance formula.

#### Scenario: Distance from origin

- **WHEN** calculating distance from (0,0) to (3,2)
- **THEN** distance SHALL be 5 hexes

#### Scenario: Distance calculation formula

- **WHEN** calculating distance between two hexes
- **THEN** distance SHALL equal max(|dq|, |dr|, |dq + dr|)
- **AND** distance from (1,1) to (4,3) SHALL be 3
- **AND** distance from (-2,3) to (2,-1) SHALL be 6

#### Scenario: Zero distance

- **WHEN** calculating distance from (2,3) to (2,3)
- **THEN** distance SHALL be 0

#### Scenario: Cube distance equivalence

- **WHEN** calculating distance using cube coordinates
- **THEN** result SHALL equal axial distance calculation
- **AND** cube distance SHALL equal max(|dx|, |dy|, |dz|)

### Requirement: Neighbor Calculation

The system SHALL enumerate hex neighbors in six cardinal directions.

#### Scenario: Six neighbor directions

- **WHEN** listing neighbor directions
- **THEN** directions SHALL be: N (0), NE (1), SE (2), S (3), SW (4), NW (5)
- **AND** each direction SHALL have an axial delta

#### Scenario: Single neighbor calculation

- **WHEN** getting the neighbor of (2,3) in direction NE (1)
- **THEN** result SHALL be (3,2)

#### Scenario: All neighbors enumeration

- **WHEN** getting all neighbors of (0,0)
- **THEN** 6 neighbors SHALL be returned
- **AND** neighbors SHALL be in order: N, NE, SE, S, SW, NW
- **AND** each neighbor SHALL be exactly 1 hex away

#### Scenario: Neighbor coordinates

- **WHEN** getting all neighbors of (2,3)
- **THEN** neighbors SHALL include (2,2), (3,2), (3,3), (2,4), (1,4), (1,3)

### Requirement: Range Enumeration

The system SHALL enumerate all hexes within a specified range.

#### Scenario: Range 0 from center

- **WHEN** getting hexes in range 0 from (0,0)
- **THEN** result SHALL contain only (0,0)
- **AND** 1 hex SHALL be returned

#### Scenario: Range 1 from center

- **WHEN** getting hexes in range 1 from (0,0)
- **THEN** result SHALL contain 7 hexes (center + 6 neighbors)

#### Scenario: Range 2 from center

- **WHEN** getting hexes in range 2 from (0,0)
- **THEN** result SHALL contain 19 hexes
- **AND** count SHALL equal 1 + 3×2×(2+1) = 19

#### Scenario: Range formula

- **WHEN** calculating hex count for range n
- **THEN** count SHALL equal 1 + 3×n×(n+1)
- **AND** range 3 SHALL contain 37 hexes
- **AND** range 5 SHALL contain 91 hexes

#### Scenario: Range from offset position

- **WHEN** getting hexes in range 2 from (3,2)
- **THEN** all returned hexes SHALL be within distance 2 of (3,2)

### Requirement: Ring Enumeration

The system SHALL enumerate hexes at exactly a specified distance (ring).

#### Scenario: Ring 0

- **WHEN** getting ring 0 around (0,0)
- **THEN** result SHALL contain only (0,0)

#### Scenario: Ring 1

- **WHEN** getting ring 1 around (0,0)
- **THEN** result SHALL contain 6 hexes (the immediate neighbors)
- **AND** all hexes SHALL be exactly distance 1 from center

#### Scenario: Ring 2

- **WHEN** getting ring 2 around (0,0)
- **THEN** result SHALL contain 12 hexes
- **AND** all hexes SHALL be exactly distance 2 from center

#### Scenario: Ring size formula

- **WHEN** calculating ring size for radius r > 0
- **THEN** ring SHALL contain 6×r hexes
- **AND** ring 3 SHALL contain 18 hexes
- **AND** ring 5 SHALL contain 30 hexes

### Requirement: Line Drawing

The system SHALL draw lines between hexes using the DDA (Digital Differential Analyzer) algorithm.

#### Scenario: Line from origin to (3,0)

- **WHEN** drawing a line from (0,0) to (3,0)
- **THEN** line SHALL contain 4 hexes: (0,0), (1,0), (2,0), (3,0)

#### Scenario: Line from origin to (2,2)

- **WHEN** drawing a line from (0,0) to (2,2)
- **THEN** line SHALL contain 3 hexes
- **AND** all hexes SHALL lie on the path from start to end

#### Scenario: Line includes endpoints

- **WHEN** drawing a line from (1,1) to (4,3)
- **THEN** first hex SHALL be (1,1)
- **AND** last hex SHALL be (4,3)

#### Scenario: Zero-length line

- **WHEN** drawing a line from (2,3) to (2,3)
- **THEN** result SHALL contain only (2,3)

#### Scenario: Line interpolation

- **WHEN** drawing a line between two hexes
- **THEN** algorithm SHALL use cube coordinate interpolation
- **AND** each interpolated point SHALL be rounded to nearest hex
- **AND** line SHALL contain distance + 1 hexes

### Requirement: Angle Calculation

The system SHALL calculate angles between hexes for facing determination.

#### Scenario: Angle to North

- **WHEN** calculating angle from (0,0) to (0,-1)
- **THEN** angle SHALL be approximately 0 degrees (North)

#### Scenario: Angle to East

- **WHEN** calculating angle from (0,0) to (1,0)
- **THEN** angle SHALL be approximately 90 degrees

#### Scenario: Angle normalization

- **WHEN** calculating any angle
- **THEN** result SHALL be normalized to 0-360 degrees
- **AND** negative angles SHALL be converted to positive equivalents

#### Scenario: Angle to facing conversion

- **WHEN** converting angle 30 degrees to facing
- **THEN** facing SHALL be 1 (NE)
- **AND** angle 90 degrees SHALL convert to facing 2 (SE)
- **AND** angle 180 degrees SHALL convert to facing 3 (S)

#### Scenario: Facing boundaries

- **WHEN** converting angles to facings
- **THEN** each facing SHALL cover 60 degrees
- **AND** facing 0 (N) SHALL cover -30 to +30 degrees
- **AND** facing 1 (NE) SHALL cover 30 to 90 degrees
- **AND** facing 2 (SE) SHALL cover 90 to 150 degrees

#### Scenario: Facing to angle conversion

- **WHEN** converting facing to center angle
- **THEN** facing 0 (N) SHALL give 0 degrees
- **AND** facing 1 (NE) SHALL give 60 degrees
- **AND** facing 3 (S) SHALL give 180 degrees

### Requirement: Coordinate Arithmetic

The system SHALL support basic arithmetic operations on hex coordinates.

#### Scenario: Coordinate addition

- **WHEN** adding (2,3) and (1,-1)
- **THEN** result SHALL be (3,2)

#### Scenario: Coordinate subtraction

- **WHEN** subtracting (1,2) from (4,5)
- **THEN** result SHALL be (3,3)

#### Scenario: Coordinate scaling

- **WHEN** scaling (2,1) by factor 3
- **THEN** result SHALL be (6,3)

#### Scenario: Coordinate equality

- **WHEN** comparing (2,3) and (2,3)
- **THEN** coordinates SHALL be equal
- **AND** comparing (2,3) and (3,2) SHALL be not equal

### Requirement: Hex Grid Creation

The system SHALL create hex grids with configurable shapes and sizes.

#### Scenario: Hexagonal grid creation

- **WHEN** creating a hexagonal grid with radius 2
- **THEN** grid SHALL contain 19 hexes (1 + 3×2×3)
- **AND** all hexes SHALL be within distance 2 of origin

#### Scenario: Rectangular grid creation

- **WHEN** creating a rectangular grid with width 5 and height 4
- **THEN** grid SHALL contain hexes arranged in rectangular pattern
- **AND** grid SHALL use offset coordinate layout

#### Scenario: Default hex properties

- **WHEN** creating a hex in a new grid
- **THEN** hex SHALL have occupantId = null
- **AND** terrain SHALL be "clear"
- **AND** elevation SHALL be 0

### Requirement: Grid Queries

The system SHALL provide efficient queries for hex grid state.

#### Scenario: Get hex by coordinate

- **WHEN** querying grid for hex at (2,3)
- **THEN** hex SHALL be returned if coordinate is in bounds
- **AND** undefined SHALL be returned if coordinate is out of bounds

#### Scenario: Check bounds

- **WHEN** checking if (2,3) is in bounds
- **THEN** result SHALL be true if hex exists in grid
- **AND** result SHALL be false if hex does not exist

#### Scenario: Check occupancy

- **WHEN** checking if hex (2,3) is occupied
- **THEN** result SHALL be true if occupantId is not null
- **AND** result SHALL be false if occupantId is null

#### Scenario: Get occupant

- **WHEN** getting occupant of hex (2,3)
- **THEN** occupantId SHALL be returned if hex is occupied
- **AND** null SHALL be returned if hex is empty or out of bounds

#### Scenario: Get hexes in range from grid

- **WHEN** getting hexes in range 2 from (3,2) in grid
- **THEN** only hexes that exist in grid SHALL be returned
- **AND** out-of-bounds hexes SHALL be filtered out

#### Scenario: Get neighbors from grid

- **WHEN** getting neighbors of (2,3) in grid
- **THEN** only neighbors that exist in grid SHALL be returned
- **AND** result SHALL contain hexes at exactly distance 1

#### Scenario: Find unit hex

- **WHEN** finding hex for unit "unit-123"
- **THEN** hex with occupantId "unit-123" SHALL be returned
- **AND** undefined SHALL be returned if unit is not on grid

### Requirement: Grid Mutations

The system SHALL provide immutable operations for modifying grid state.

#### Scenario: Place unit on hex

- **WHEN** placing unit "unit-123" on hex (2,3)
- **THEN** new grid SHALL be returned with hex (2,3) occupied
- **AND** original grid SHALL remain unchanged
- **AND** error SHALL be thrown if hex is already occupied
- **AND** error SHALL be thrown if hex does not exist

#### Scenario: Remove unit from hex

- **WHEN** removing unit from hex (2,3)
- **THEN** new grid SHALL be returned with hex (2,3) empty
- **AND** original grid SHALL remain unchanged
- **AND** error SHALL be thrown if hex does not exist

#### Scenario: Move unit between hexes

- **WHEN** moving unit from (2,3) to (3,3)
- **THEN** new grid SHALL be returned
- **AND** source hex (2,3) SHALL be empty
- **AND** destination hex (3,3) SHALL be occupied
- **AND** original grid SHALL remain unchanged
- **AND** error SHALL be thrown if source is empty
- **AND** error SHALL be thrown if destination is occupied
- **AND** error SHALL be thrown if either hex does not exist

#### Scenario: Set terrain

- **WHEN** setting terrain of hex (2,3) to "woods"
- **THEN** new grid SHALL be returned with updated terrain
- **AND** original grid SHALL remain unchanged
- **AND** error SHALL be thrown if hex does not exist

### Requirement: Grid Statistics

The system SHALL provide statistical queries for grid state.

#### Scenario: Total hex count

- **WHEN** getting hex count for grid with radius 3
- **THEN** count SHALL be 37

#### Scenario: Occupied hex count

- **WHEN** getting occupied count for grid with 5 units placed
- **THEN** count SHALL be 5

#### Scenario: Empty hex count

- **WHEN** getting empty count for grid with 37 total hexes and 5 occupied
- **THEN** count SHALL be 32

#### Scenario: Get all empty hexes

- **WHEN** getting all empty hexes from grid
- **THEN** only hexes with occupantId = null SHALL be returned

#### Scenario: Get all occupied hexes

- **WHEN** getting all occupied hexes from grid
- **THEN** only hexes with occupantId != null SHALL be returned

## Cross-References

### Dependencies

- **terrain-system**: Hex terrain types and properties
- **tactical-map-interface**: Visual rendering of hex coordinates

### Used By

- **spatial-combat-system**: Unit positioning and movement
- **firing-arc-calculation**: Line-of-sight and facing calculations
- **movement-system**: Pathfinding and movement validation
