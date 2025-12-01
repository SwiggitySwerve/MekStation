# armor-system Specification

## Purpose
Define armor allocation rules including armor types, maximum armor per location, front/rear split for torsos, and the auto-allocation algorithm that matches MegaMekLab's distribution pattern.

## Requirements

### Requirement: Armor Types
The system SHALL support 14 armor types with distinct point-per-ton ratios.

#### Scenario: Standard armor
- **WHEN** using standard armor
- **THEN** ratio SHALL be 16 points per ton
- **AND** armor SHALL require 0 critical slots

#### Scenario: Ferro-Fibrous armor
- **WHEN** using Ferro-Fibrous
- **THEN** IS ratio SHALL be 17.92 points per ton (14 slots)
- **AND** Clan ratio SHALL be 19.2 points per ton (7 slots)

### Requirement: Maximum Armor
Maximum armor per location SHALL be calculated from structure.

#### Scenario: Armor maximum
- **WHEN** calculating maximum armor
- **THEN** max = 2 × structure points for that location
- **AND** head maximum = 9 (exception)

### Requirement: Rear Armor
Torso locations SHALL have front and rear armor.

#### Scenario: Rear armor allocation
- **WHEN** allocating torso armor
- **THEN** rear armor MAY be specified separately
- **AND** front + rear <= maximum for location

### Requirement: Auto-Allocation Algorithm
The system SHALL provide automatic armor distribution matching MegaMekLab's allocation pattern using a three-phase approach.

#### Scenario: Phase 1 - Initial distribution
- **WHEN** head armor exceeds max (9)
- **THEN** body points SHALL be distributed proportionally to max capacity
- **AND** all proportional allocations SHALL use floor() to avoid overallocation
- **WHEN** head armor is below max
- **THEN** percentage weights SHALL be used:
  - Head: 25%, CT: 12.5%, Side Torsos: 15.625% each, Arms: 6.25% each, Legs: 9.375% each

#### Scenario: Phase 2 - Torso front/rear split
- **WHEN** splitting Center Torso armor
- **THEN** rear SHALL be ceil(ctTotal / 4.5)
- **AND** front SHALL be ctTotal - rear
- **WHEN** splitting Side Torso armor above 40% capacity
- **THEN** rear SHALL be round(sideTorsoTotal × 0.22)
- **AND** front SHALL be sideTorsoTotal - rear

#### Scenario: Phase 3 - Remainder distribution
- **WHEN** distributing remaining points
- **THEN** priority SHALL be:
  1. Head (single location)
  2. Side Torsos front (symmetric pair, +2)
  3. Legs (symmetric pair, +2)
  4. Arms (symmetric pair, +2)
  5. Side Torsos rear (symmetric pair, +2)
  6. CT front (single location, +1)
  7. CT rear (single location, +1)

#### Scenario: 32-point allocation (2 tons standard)
- **WHEN** auto-allocating 32 armor points on a 50-ton mech
- **THEN** allocation SHALL be:
  - Head: 8
  - Center Torso: 3 front, 1 rear
  - Left/Right Torso: 5 front each
  - Left/Right Arm: 2 each
  - Left/Right Leg: 3 each

#### Scenario: 152-point allocation (9.5 tons standard)
- **WHEN** auto-allocating 152 armor points on a 50-ton mech
- **THEN** allocation SHALL be:
  - Head: 9
  - Center Torso: 22 front, 7 rear
  - Left/Right Torso: 17 front, 5 rear each
  - Left/Right Arm: 14 each
  - Left/Right Leg: 21 each

#### Scenario: 160-point allocation (10 tons standard)
- **WHEN** auto-allocating 160 armor points on a 50-ton mech
- **THEN** allocation SHALL be:
  - Head: 9
  - Center Torso: 24 front, 7 rear
  - Left/Right Torso: 18 front, 5 rear each
  - Left/Right Arm: 15 each
  - Left/Right Leg: 22 each

#### Scenario: 168-point allocation (10.5 tons standard)
- **WHEN** auto-allocating 168 armor points on a 50-ton mech
- **THEN** allocation SHALL be:
  - Head: 9
  - Center Torso: 24 front, 7 rear
  - Left/Right Torso: 19 front, 5 rear each
  - Left/Right Arm: 16 each
  - Left/Right Leg: 24 each

### Requirement: Symmetry Enforcement
The system SHALL maintain symmetrical armor values for paired locations at all times.

#### Scenario: Paired location symmetry
- **WHEN** distributing armor to paired locations
- **THEN** Left Torso front SHALL equal Right Torso front
- **AND** Left Torso rear SHALL equal Right Torso rear
- **AND** Left Arm SHALL equal Right Arm
- **AND** Left Leg SHALL equal Right Leg

#### Scenario: Odd point remainder
- **WHEN** an odd number of points remains after paired distribution
- **THEN** symmetric pairs SHALL be exhausted first
- **AND** the extra point SHALL go to CT front or CT rear
- **AND** symmetry SHALL NOT be broken for limbs or side torsos

### Requirement: Torso Front/Rear Split
The system SHALL split torso armor between front and rear appropriately.

#### Scenario: Center Torso split
- **WHEN** allocating Center Torso armor
- **THEN** rear SHALL be ceil(total / 4.5)
- **AND** front SHALL be total - rear
- **AND** this produces ~22-25% rear ratio

#### Scenario: Side Torso split at low points
- **WHEN** side torso allocation is less than 40% of maximum
- **THEN** all points SHALL go to front armor
- **AND** rear armor SHALL be 0

#### Scenario: Side Torso split at high points
- **WHEN** side torso allocation exceeds 40% of maximum
- **THEN** rear SHALL be round(total × 0.22)
- **AND** front SHALL be total - rear

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

### Requirement: Tonnage Capping
The system SHALL cap armor tonnage at the maximum useful value.

#### Scenario: Max useful tonnage
- **WHEN** setting armor tonnage
- **THEN** maximum SHALL be ceilToHalfTon(maxArmorPoints / pointsPerTon)
- **AND** points exceeding maxArmorPoints SHALL be displayed as "Wasted Armor Points"

#### Scenario: Auto-allocate button display
- **WHEN** displaying allocatable points on button
- **THEN** positive delta SHALL be min(unallocated, maxArmor - allocated)
- **AND** negative delta SHALL show points to remove when over-allocated

