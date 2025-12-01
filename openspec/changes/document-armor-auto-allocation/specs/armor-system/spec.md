## ADDED Requirements

### Requirement: Auto-Allocation Algorithm
The system SHALL provide automatic armor distribution using percentage-based weights matching MegaMekLab's allocation pattern.

#### Scenario: Weight distribution
- **WHEN** auto-allocating armor points
- **THEN** distribution SHALL use the following weights (normalized to 8.0 total):
  - Head: 2.0 (25%)
  - Center Torso: 1.0 (12.5%)
  - Side Torsos: 1.25 each (15.625% each)
  - Arms: 0.5 each (6.25% each)
  - Legs: 0.75 each (9.375% each)

#### Scenario: 32-point allocation (2 tons standard)
- **WHEN** auto-allocating 32 armor points on a 50-ton mech
- **THEN** allocation SHALL be:
  - Head: 8
  - Center Torso: 3 front, 1 rear
  - Left/Right Torso: 5 front each
  - Left/Right Arm: 2 each
  - Left/Right Leg: 3 each

#### Scenario: 80-point allocation (5 tons standard)
- **WHEN** auto-allocating 80 armor points on a 50-ton mech
- **THEN** head SHALL be maxed at 9
- **AND** remaining 71 points SHALL be distributed proportionally to body locations
- **AND** side torsos SHALL receive rear armor (~18% of their allocation)

### Requirement: Symmetry Enforcement
The system SHALL maintain symmetrical armor values for paired locations.

#### Scenario: Paired location symmetry
- **WHEN** distributing armor to paired locations
- **THEN** Left Torso SHALL equal Right Torso
- **AND** Left Arm SHALL equal Right Arm
- **AND** Left Leg SHALL equal Right Leg

#### Scenario: Odd point remainder
- **WHEN** an odd number of points remains after paired distribution
- **THEN** the extra point SHALL go to Center Torso front
- **AND** if CT front is maxed, extra point SHALL go to CT rear
- **AND** if CT is maxed, extra point SHALL go to Head

### Requirement: Torso Front/Rear Split
The system SHALL split torso armor between front and rear appropriately.

#### Scenario: Center Torso split
- **WHEN** allocating Center Torso armor
- **THEN** approximately 75% SHALL go to front
- **AND** approximately 25% SHALL go to rear

#### Scenario: Side Torso split at low points
- **WHEN** side torso allocation is less than 40% of maximum
- **THEN** all points SHALL go to front armor
- **AND** rear armor SHALL be 0

#### Scenario: Side Torso split at high points
- **WHEN** side torso allocation exceeds 40% of maximum
- **THEN** approximately 18% of allocation SHALL go to rear
- **AND** remainder SHALL go to front

### Requirement: Maximum Clamping
The system SHALL clamp all allocations to location maximums.

#### Scenario: Head maximum
- **WHEN** head allocation would exceed 9
- **THEN** head SHALL be clamped to 9
- **AND** excess points SHALL be redistributed to body locations

#### Scenario: Location overflow
- **WHEN** any location allocation would exceed its maximum
- **THEN** allocation SHALL be clamped to maximum
- **AND** excess SHALL be redistributed using remainder distribution rules

