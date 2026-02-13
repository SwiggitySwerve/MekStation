# firing-arc-calculation Specification

## Purpose

Defines firing arc calculations for BattleMech combat. The system determines which firing arc (Front, Left, Right, Rear) a target occupies relative to an attacker's position and facing direction. This specification covers arc determination from hex coordinates, arc-based weapon validation, and arc direction utilities for tactical positioning and hit location table selection.

**Implementation**: `src/utils/gameplay/firingArcs.ts`

## Requirements

### Requirement: Firing Arc Determination from Hex Position

The system SHALL determine the firing arc (Front, Left, Right, Rear) from the attacker's hex position relative to the target's facing.

#### Scenario: Attack from front arc

- **WHEN** the attacker is positioned in a hex that falls within the target's front arc (facing direction ±1 hex-side)
- **THEN** the firing arc SHALL be `FiringArc.Front`
- **AND** the front hit location table SHALL be used

#### Scenario: Attack from left arc

- **WHEN** the attacker is positioned in a hex that falls within the target's left arc (facing +2 hex-side)
- **THEN** the firing arc SHALL be `FiringArc.Left`
- **AND** the left side hit location table SHALL be used

#### Scenario: Attack from right arc

- **WHEN** the attacker is positioned in a hex that falls within the target's right arc (facing -2 hex-side)
- **THEN** the firing arc SHALL be `FiringArc.Right`
- **AND** the right side hit location table SHALL be used

#### Scenario: Attack from rear arc

- **WHEN** the attacker is positioned in a hex that falls within the target's rear arc (facing +3 hex-side, directly behind)
- **THEN** the firing arc SHALL be `FiringArc.Rear`
- **AND** the rear hit location table SHALL be used (hits rear armor)

### Requirement: Hex Coordinate Arc Calculation

The system SHALL use hex coordinate math to determine the relative angle from the target to the attacker and map it to a firing arc.

#### Scenario: Arc calculation using hex coordinates

- **WHEN** the target is at hex (5, 5) facing direction 0 (north) and the attacker is at hex (5, 3)
- **THEN** the relative angle SHALL map to front arc
- **AND** the FiringArc.Front SHALL be returned

#### Scenario: Arc boundary handling

- **WHEN** the attacker is positioned exactly on the boundary between two arcs
- **THEN** the system SHALL resolve the boundary consistently (front arc takes precedence on front boundaries)

### Requirement: FiringArc Enum

The system SHALL return a `FiringArc` enum value from the arc calculation.

#### Scenario: FiringArc enum values

- **WHEN** computing a firing arc
- **THEN** the result SHALL be one of: Front, Left, Right, or Rear

### Requirement: Firing Arc Used by Hit Location Tables

The computed firing arc SHALL be used to select the correct hit location table column.

#### Scenario: Front arc uses front table

- **WHEN** the firing arc is Front and a hit is scored
- **THEN** the front column of the 2d6 hit location table SHALL be used

#### Scenario: Rear arc uses rear table

- **WHEN** the firing arc is Rear and a hit is scored
- **THEN** the rear column SHALL be used and hits SHALL apply to rear armor

#### Scenario: Side arc uses side table

- **WHEN** the firing arc is Left and a hit is scored
- **THEN** the left side column SHALL be used (left-side locations more probable)

### Requirement: Torso Twist Arc Extension

Torso twist SHALL extend the front arc by one hex-side in the twist direction.

#### Scenario: Torso twisted left extends front arc

- **WHEN** a unit has twisted its torso to the left
- **THEN** the front arc for that unit's attacks SHALL extend one hex-side to the left
- **AND** the rear arc SHALL shift accordingly

#### Scenario: Torso twist affects attacker's weapon arcs

- **WHEN** a unit with torso twist fires weapons
- **THEN** arm-mounted weapons SHALL use the twisted front arc
- **AND** torso-mounted weapons SHALL use the twisted front arc
- **AND** rear-mounted weapons SHALL use the twisted rear arc

### Requirement: Arc Direction Utilities

The system SHALL provide utility functions to get the hex directions that correspond to each firing arc.

#### Scenario: Get front arc directions

- **WHEN** calling `getFrontArcDirections(facing)` with facing = 0
- **THEN** the result SHALL be an array of 3 Facing values: [5, 0, 1]
- **AND** these represent the three hex directions in the front arc

#### Scenario: Get rear arc directions

- **WHEN** calling `getRearArcDirections(facing)` with facing = 0
- **THEN** the result SHALL be an array of 3 Facing values: [2, 3, 4]
- **AND** these represent the three hex directions in the rear arc

#### Scenario: Get left side direction

- **WHEN** calling `getLeftArcDirection(facing)` with facing = 0
- **THEN** the result SHALL be Facing value 2
- **AND** this represents the left side direction relative to facing

#### Scenario: Get right side direction

- **WHEN** calling `getRightArcDirection(facing)` with facing = 0
- **THEN** the result SHALL be Facing value 4
- **AND** this represents the right side direction relative to facing

### Requirement: Arc Hexes Enumeration

The system SHALL provide a function to enumerate all hexes within a specific arc at a given range.

#### Scenario: Get all hexes in front arc

- **WHEN** calling `getArcHexes(center, facing, FiringArc.Front, maxRange)` with center = (0, 0), facing = 0, maxRange = 2
- **THEN** the result SHALL be an array of IHexCoordinate values
- **AND** all returned hexes SHALL be within maxRange distance from center
- **AND** all returned hexes SHALL fall within the front arc relative to facing
- **AND** the center hex SHALL NOT be included

#### Scenario: Get all hexes in rear arc

- **WHEN** calling `getArcHexes(center, facing, FiringArc.Rear, maxRange)` with center = (0, 0), facing = 0, maxRange = 2
- **THEN** the result SHALL be an array of IHexCoordinate values
- **AND** all returned hexes SHALL fall within the rear arc relative to facing

#### Scenario: Get all hexes in left side arc

- **WHEN** calling `getArcHexes(center, facing, FiringArc.Left, maxRange)` with center = (0, 0), facing = 0, maxRange = 2
- **THEN** the result SHALL be an array of IHexCoordinate values
- **AND** all returned hexes SHALL fall within the left side arc relative to facing

#### Scenario: Get all hexes in right side arc

- **WHEN** calling `getArcHexes(center, facing, FiringArc.Right, maxRange)` with center = (0, 0), facing = 0, maxRange = 2
- **THEN** the result SHALL be an array of IHexCoordinate values
- **AND** all returned hexes SHALL fall within the right side arc relative to facing

### Requirement: Replace Hardcoded FiringArc.Front

The system SHALL compute firing arc from actual positions instead of using the hardcoded `FiringArc.Front` default.

#### Scenario: All attacks use computed arc

- **WHEN** any weapon attack is resolved
- **THEN** the firing arc SHALL be computed from attacker position and target facing
- **AND** `FiringArc.Front` SHALL NOT be assumed as a default
