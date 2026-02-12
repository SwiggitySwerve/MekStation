## ADDED Requirements

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

### Requirement: Replace Hardcoded FiringArc.Front

The system SHALL compute firing arc from actual positions instead of using the hardcoded `FiringArc.Front` default.

#### Scenario: All attacks use computed arc

- **WHEN** any weapon attack is resolved
- **THEN** the firing arc SHALL be computed from attacker position and target facing
- **AND** `FiringArc.Front` SHALL NOT be assumed as a default
