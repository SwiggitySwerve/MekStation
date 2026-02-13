# spatial-combat-system Specification

## Purpose

Defines the spatial combat mechanics for BattleMech tactical gameplay, including unit positioning, range calculations, and line-of-sight determination. This system integrates unit positions on the hex grid with combat mechanics, providing the foundation for determining valid targets, calculating range brackets and modifiers, and verifying line-of-sight with terrain blocking.

The spatial combat system bridges the hex coordinate system (which provides mathematical operations on hex positions) with combat resolution (which applies modifiers and determines hits). It manages unit positions with facing and prone status, calculates range between units with weapon-specific brackets, and determines line-of-sight considering terrain elevation and blocking features.

**Implementation**: `src/utils/gameplay/unitPosition.ts`, `src/utils/gameplay/range.ts`, `src/utils/gameplay/lineOfSight.ts`

## Requirements

### Requirement: Unit Position Creation and Management

The system SHALL create and manage unit positions with coordinate, facing, and prone status.

#### Scenario: Create unit position with defaults

- **WHEN** creating a unit position for "mech-1" at coordinate (5,3)
- **THEN** position SHALL have unitId "mech-1"
- **AND** coordinate SHALL be (5,3)
- **AND** facing SHALL default to Facing.North (0)
- **AND** prone SHALL default to false

#### Scenario: Create unit position with explicit facing

- **WHEN** creating a unit position for "mech-2" at (2,4) facing Southeast (2)
- **THEN** position SHALL have facing Facing.Southeast (2)
- **AND** prone SHALL be false

#### Scenario: Create prone unit position

- **WHEN** creating a unit position for "mech-3" at (1,1) with prone=true
- **THEN** position SHALL have prone=true
- **AND** facing SHALL default to Facing.North (0)

#### Scenario: Update position coordinate immutably

- **WHEN** updating position coordinate from (2,3) to (4,5)
- **THEN** new position SHALL be returned with coordinate (4,5)
- **AND** original position SHALL remain unchanged
- **AND** facing and prone SHALL be preserved

#### Scenario: Update position facing immutably

- **WHEN** updating position facing from North (0) to Southeast (2)
- **THEN** new position SHALL be returned with facing Southeast (2)
- **AND** original position SHALL remain unchanged
- **AND** coordinate and prone SHALL be preserved

#### Scenario: Move position to new coordinate and facing

- **WHEN** moving position from (2,3) facing North to (3,4) facing Southeast
- **THEN** new position SHALL have coordinate (3,4)
- **AND** facing SHALL be Southeast (2)
- **AND** prone SHALL be false (standing up from move)
- **AND** original position SHALL remain unchanged

### Requirement: Facing Operations

The system SHALL provide facing rotation and comparison operations.

#### Scenario: Rotate facing clockwise by 1 step

- **WHEN** rotating facing North (0) clockwise by 1 step
- **THEN** result SHALL be Northeast (1)

#### Scenario: Rotate facing clockwise by 3 steps

- **WHEN** rotating facing North (0) clockwise by 3 steps
- **THEN** result SHALL be South (3)

#### Scenario: Rotate facing clockwise wraps around

- **WHEN** rotating facing Northwest (5) clockwise by 2 steps
- **THEN** result SHALL be Northeast (1)

#### Scenario: Rotate facing counter-clockwise by 1 step

- **WHEN** rotating facing Southeast (2) counter-clockwise by 1 step
- **THEN** result SHALL be Northeast (1)

#### Scenario: Get opposite facing

- **WHEN** getting opposite of North (0)
- **THEN** result SHALL be South (3)

#### Scenario: Calculate facing difference

- **WHEN** calculating difference from North (0) to Southeast (2)
- **THEN** difference SHALL be 2 steps

#### Scenario: Calculate facing difference wraps around

- **WHEN** calculating difference from North (0) to Northwest (5)
- **THEN** difference SHALL be 1 step (shortest path)

#### Scenario: Get rotation direction clockwise

- **WHEN** determining rotation direction from North (0) to Southeast (2)
- **THEN** direction SHALL be 1 (clockwise)

#### Scenario: Get rotation direction counter-clockwise

- **WHEN** determining rotation direction from North (0) to Northwest (5)
- **THEN** direction SHALL be -1 (counter-clockwise)

### Requirement: Position Map Operations

The system SHALL manage collections of unit positions with immutable operations.

#### Scenario: Create empty position map

- **WHEN** creating a new position map
- **THEN** map SHALL be empty
- **AND** size SHALL be 0

#### Scenario: Add unit to position map

- **WHEN** adding unit "mech-1" at (5,3) to empty map
- **THEN** new map SHALL be returned
- **AND** new map SHALL contain "mech-1"
- **AND** original map SHALL remain empty

#### Scenario: Get unit position from map

- **WHEN** getting position for "mech-1" from map
- **THEN** position SHALL be returned with coordinate (5,3)

#### Scenario: Remove unit from position map

- **WHEN** removing "mech-1" from map containing 3 units
- **THEN** new map SHALL be returned with 2 units
- **AND** original map SHALL remain unchanged with 3 units

#### Scenario: Find unit at coordinate

- **WHEN** finding unit at coordinate (5,3) in map
- **THEN** position for unit at (5,3) SHALL be returned
- **AND** if no unit at coordinate, undefined SHALL be returned

#### Scenario: Get all positions from map

- **WHEN** getting all positions from map with 3 units
- **THEN** readonly array with 3 positions SHALL be returned

### Requirement: Range Calculation

The system SHALL calculate range between coordinates and determine range brackets.

#### Scenario: Calculate range between adjacent hexes

- **WHEN** calculating range from (0,0) to (1,0)
- **THEN** distance SHALL be 1 hex
- **AND** bracket SHALL be RangeBracket.Short
- **AND** modifier SHALL be 0

#### Scenario: Calculate range at short bracket boundary

- **WHEN** calculating range from (0,0) to (3,0)
- **THEN** distance SHALL be 3 hexes
- **AND** bracket SHALL be RangeBracket.Short
- **AND** modifier SHALL be 0

#### Scenario: Calculate range at medium bracket

- **WHEN** calculating range from (0,0) to (5,0)
- **THEN** distance SHALL be 5 hexes
- **AND** bracket SHALL be RangeBracket.Medium
- **AND** modifier SHALL be 2

#### Scenario: Calculate range at long bracket

- **WHEN** calculating range from (0,0) to (10,0)
- **THEN** distance SHALL be 10 hexes
- **AND** bracket SHALL be RangeBracket.Long
- **AND** modifier SHALL be 4

#### Scenario: Calculate range at extreme bracket

- **WHEN** calculating range from (0,0) to (20,0)
- **THEN** distance SHALL be 20 hexes
- **AND** bracket SHALL be RangeBracket.Extreme
- **AND** modifier SHALL be 6

#### Scenario: Range bracket definitions

- **WHEN** determining range brackets
- **THEN** Short SHALL be 0-3 hexes with modifier 0
- **AND** Medium SHALL be 4-6 hexes with modifier 2
- **AND** Long SHALL be 7-15 hexes with modifier 4
- **AND** Extreme SHALL be 16+ hexes with modifier 6

### Requirement: Weapon Range Calculation

The system SHALL calculate weapon-specific range brackets and modifiers.

#### Scenario: Weapon range profile definition

- **WHEN** defining a medium laser range profile
- **THEN** short SHALL be 3 hexes
- **AND** medium SHALL be 6 hexes
- **AND** long SHALL be 9 hexes
- **AND** extreme SHALL be undefined (no extreme range)
- **AND** minimum SHALL be undefined (no minimum range)

#### Scenario: LRM range profile with minimum range

- **WHEN** defining an LRM-20 range profile
- **THEN** short SHALL be 6 hexes
- **AND** medium SHALL be 14 hexes
- **AND** long SHALL be 21 hexes
- **AND** minimum SHALL be 6 hexes

#### Scenario: Weapon in short range

- **WHEN** calculating weapon range for distance 2 with medium laser profile (short=3, medium=6, long=9)
- **THEN** bracket SHALL be RangeBracket.Short
- **AND** modifier SHALL be 0
- **AND** inRange SHALL be true

#### Scenario: Weapon in medium range

- **WHEN** calculating weapon range for distance 5 with medium laser profile
- **THEN** bracket SHALL be RangeBracket.Medium
- **AND** modifier SHALL be 2
- **AND** inRange SHALL be true

#### Scenario: Weapon out of range

- **WHEN** calculating weapon range for distance 12 with medium laser profile (long=9)
- **THEN** bracket SHALL be RangeBracket.OutOfRange
- **AND** modifier SHALL be Infinity
- **AND** inRange SHALL be false

#### Scenario: Minimum range penalty

- **WHEN** calculating weapon range for distance 3 with LRM profile (minimum=6)
- **THEN** minimumRangePenalty SHALL be 4 (6 - 3 + 1)
- **AND** bracket SHALL be RangeBracket.Short
- **AND** inRange SHALL be true

#### Scenario: No minimum range penalty when beyond minimum

- **WHEN** calculating weapon range for distance 8 with LRM profile (minimum=6)
- **THEN** minimumRangePenalty SHALL be 0
- **AND** bracket SHALL be RangeBracket.Medium

### Requirement: Line of Sight Calculation

The system SHALL calculate line-of-sight between hexes considering terrain blocking.

#### Scenario: Adjacent hexes always have LOS

- **WHEN** calculating LOS from (0,0) to (1,0)
- **THEN** hasLOS SHALL be true
- **AND** interveningHexes SHALL be empty array
- **AND** blockedBy SHALL be undefined

#### Scenario: Clear LOS with no intervening terrain

- **WHEN** calculating LOS from (0,0) to (5,0) with clear terrain
- **THEN** hasLOS SHALL be true
- **AND** interveningHexes SHALL contain 4 hexes
- **AND** blockedBy SHALL be undefined

#### Scenario: LOS blocked by heavy woods

- **WHEN** calculating LOS from (0,0) to (5,0) with heavy woods at (2,0)
- **THEN** hasLOS SHALL be false
- **AND** blockedBy SHALL be (2,0)
- **AND** blockingTerrain SHALL be TerrainType.HeavyWoods

#### Scenario: LOS blocked by building

- **WHEN** calculating LOS from (0,0) to (5,0) with 2-level building at (3,0)
- **THEN** hasLOS SHALL be false
- **AND** blockedBy SHALL be (3,0)
- **AND** blockingTerrain SHALL be TerrainType.Building

#### Scenario: Light woods does not block LOS

- **WHEN** calculating LOS from (0,0) to (5,0) with light woods at (2,0)
- **THEN** hasLOS SHALL be true
- **AND** interveningHexes SHALL contain 4 hexes
- **AND** blockedBy SHALL be undefined

#### Scenario: Elevation allows seeing over terrain

- **WHEN** calculating LOS from (0,0) at elevation 3 to (5,0) at elevation 0 with 1-level woods at (2,0) elevation 0
- **THEN** hasLOS SHALL be true (shooter height 4 sees over woods height 1)
- **AND** blockedBy SHALL be undefined

#### Scenario: Terrain blocks LOS at same elevation

- **WHEN** calculating LOS from (0,0) at elevation 0 to (5,0) at elevation 0 with 2-level building at (2,0) elevation 0
- **THEN** hasLOS SHALL be false (LOS height 1 blocked by building height 2)
- **AND** blockedBy SHALL be (2,0)

### Requirement: Terrain Feature Parsing

The system SHALL parse terrain features from hex terrain strings.

#### Scenario: Parse simple terrain type

- **WHEN** parsing terrain string "light_woods"
- **THEN** result SHALL be array with one feature
- **AND** feature type SHALL be TerrainType.LightWoods
- **AND** feature level SHALL be 1

#### Scenario: Parse empty terrain string

- **WHEN** parsing empty terrain string ""
- **THEN** result SHALL be empty array

#### Scenario: Parse JSON terrain features

- **WHEN** parsing terrain string '[{"type":"building","level":2}]'
- **THEN** result SHALL be array with one feature
- **AND** feature type SHALL be TerrainType.Building
- **AND** feature level SHALL be 2

#### Scenario: Parse unknown terrain defaults to clear

- **WHEN** parsing terrain string "unknown_type"
- **THEN** result SHALL be empty array (treated as clear)

### Requirement: Position Queries

The system SHALL provide query operations for unit positions.

#### Scenario: Check if unit is prone

- **WHEN** checking if position with prone=true is prone
- **THEN** result SHALL be true

#### Scenario: Check if two positions are in same hex

- **WHEN** comparing positions at (2,3) and (2,3)
- **THEN** result SHALL be true

#### Scenario: Check if two positions are in different hexes

- **WHEN** comparing positions at (2,3) and (3,2)
- **THEN** result SHALL be false

#### Scenario: Get facing name

- **WHEN** getting name for facing North (0)
- **THEN** result SHALL be "North"

#### Scenario: Get facing abbreviation

- **WHEN** getting abbreviation for facing Northeast (1)
- **THEN** result SHALL be "NE"

### Requirement: Range Helper Functions

The system SHALL provide helper functions for range operations.

#### Scenario: Check if positions are adjacent

- **WHEN** checking if (0,0) and (1,0) are adjacent
- **THEN** result SHALL be true

#### Scenario: Check if positions are not adjacent

- **WHEN** checking if (0,0) and (3,0) are adjacent
- **THEN** result SHALL be false

#### Scenario: Get coordinates at exact range

- **WHEN** getting coordinates at range 2 from (0,0)
- **THEN** result SHALL contain 12 hexes (ring of radius 2)
- **AND** all hexes SHALL be exactly distance 2 from (0,0)

#### Scenario: Get coordinates within range

- **WHEN** getting coordinates within range 2 from (0,0)
- **THEN** result SHALL contain 19 hexes (1 + 6 + 12)
- **AND** all hexes SHALL be distance 0-2 from (0,0)

### Requirement: LOS Height Interpolation

The system SHALL interpolate LOS height along the line between shooter and target.

#### Scenario: LOS height at midpoint

- **WHEN** calculating LOS height from elevation 0 to elevation 4 at midpoint (distance 2 of 4)
- **THEN** LOS height SHALL be 2 (linear interpolation)

#### Scenario: LOS height at quarter point

- **WHEN** calculating LOS height from elevation 0 to elevation 4 at quarter point (distance 1 of 4)
- **THEN** LOS height SHALL be 1

#### Scenario: LOS height at three-quarter point

- **WHEN** calculating LOS height from elevation 0 to elevation 4 at three-quarter point (distance 3 of 4)
- **THEN** LOS height SHALL be 3

#### Scenario: Terrain blocks if taller than interpolated LOS height

- **WHEN** LOS height at hex is 2 and terrain height is 3
- **THEN** LOS SHALL be blocked

#### Scenario: Terrain does not block if shorter than interpolated LOS height

- **WHEN** LOS height at hex is 3 and terrain height is 2
- **THEN** LOS SHALL NOT be blocked

## Cross-References

### Dependencies

- **hex-coordinate-system**: Hex distance calculation, line drawing, coordinate operations
- **firing-arc-calculation**: Firing arc determination for target selection
- **terrain-system**: Terrain types, properties, LOS blocking rules

### Used By

- **combat-resolution**: Range modifiers, LOS validation for attacks
- **movement-system**: Position updates after movement
- **tactical-map-interface**: Visual display of unit positions and ranges
- **target-selection**: Valid target determination based on range and LOS
