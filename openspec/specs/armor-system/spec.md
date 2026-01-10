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
The system SHALL provide automatic armor distribution matching MegaMekLab's allocation pattern using a simplified three-phase approach.

#### Scenario: Phase 1 - Initial proportional spread
- **WHEN** calculating initial armor distribution
- **THEN** head SHALL receive min(floor(points × 0.25), 9)
- **AND** remaining body points SHALL be distributed proportionally to max capacity:
  - Each location = floor(bodyPoints × locationMax / totalBodyMax)
- **AND** paired locations (LT/RT, LA/RA, LL/RL) SHALL receive identical values

#### Scenario: Phase 2 - Symmetric remainder distribution
- **WHEN** distributing remaining points after initial spread
- **THEN** symmetric pairs SHALL be prioritized requiring 2 points each:
  1. Side Torsos (LT/RT +2)
  2. Legs (LL/RL +2)
  3. Arms (LA/RA +2)
- **AND** single locations SHALL receive odd remainders:
  4. Center Torso (+1)
  5. Head (+1)
- **AND** loop SHALL continue until all points allocated or all locations maxed

#### Scenario: Phase 3 - Torso front/rear split
- **WHEN** applying front/rear splits after body totals determined
- **THEN** CT rear SHALL be ceil(ctTotal / 4.5)
- **AND** CT front SHALL be ctTotal - ctRear
- **AND** side torso rear SHALL be:
  - 0 if sideTorsoTotal ≤ 40% of max
  - round(sideTorsoTotal × 0.25) if at max total armor
  - round(sideTorsoTotal × 0.22) otherwise
- **AND** side torso front SHALL be sideTorsoTotal - rear

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

#### Scenario: 169-point allocation (max armor, 50-ton)
- **WHEN** auto-allocating 169 armor points (max armor) on a 50-ton mech
- **THEN** allocation SHALL be:
  - Head: 9
  - Center Torso: 24 front, 8 rear
  - Left/Right Torso: 18 front, 6 rear each
  - Left/Right Arm: 16 each
  - Left/Right Leg: 24 each
- **AND** side torso rear SHALL use 25% ratio (not 22%) at max total armor

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

### Requirement: Individual Armor Slot Items
Ferro-Fibrous and similar armor types SHALL create individual equipment items for each required critical slot.

#### Scenario: Ferro-Fibrous IS individual slots
- **WHEN** using Inner Sphere Ferro-Fibrous armor
- **THEN** system SHALL create 14 individual equipment items
- **AND** each item SHALL have `criticalSlots: 1`
- **AND** each item SHALL have unique `instanceId`
- **AND** each item SHALL have `equipmentId` starting with `armor-slot`
- **AND** each item SHALL have `isRemovable: false`

#### Scenario: Ferro-Fibrous Clan individual slots
- **WHEN** using Clan Ferro-Fibrous armor
- **THEN** system SHALL create 7 individual equipment items
- **AND** each item SHALL have `criticalSlots: 1`

#### Scenario: Light Ferro individual slots
- **WHEN** using Light Ferro-Fibrous armor
- **THEN** system SHALL create 7 individual equipment items
- **AND** each item SHALL have `criticalSlots: 1`

#### Scenario: Heavy Ferro individual slots
- **WHEN** using Heavy Ferro-Fibrous armor
- **THEN** system SHALL create 21 individual equipment items
- **AND** each item SHALL have `criticalSlots: 1`

#### Scenario: Standard armor no slots
- **WHEN** using Standard armor
- **THEN** system SHALL NOT create any equipment items
- **AND** critical slots requirement is 0

### Requirement: Stealth Armor Fixed Placement
Stealth armor SHALL create 2-slot components with pre-assigned locations.

#### Scenario: Stealth armor slot creation
- **WHEN** using Stealth armor
- **THEN** system SHALL create 6 equipment items
- **AND** each item SHALL have `criticalSlots: 2`
- **AND** each item SHALL have `name: 'Stealth'`

#### Scenario: Stealth armor locations
- **WHEN** Stealth armor items are created
- **THEN** one item SHALL be assigned to Left Arm
- **AND** one item SHALL be assigned to Right Arm
- **AND** one item SHALL be assigned to Left Torso
- **AND** one item SHALL be assigned to Right Torso
- **AND** one item SHALL be assigned to Left Leg
- **AND** one item SHALL be assigned to Right Leg

### Requirement: Armor Slot Equipment Sync
Armor equipment items SHALL be synchronized when armor type changes.

#### Scenario: Type change removes old slots
- **WHEN** armor type is changed
- **THEN** all existing armor slot equipment SHALL be removed
- **AND** new armor slot equipment SHALL be created for new type

#### Scenario: Switch to standard clears slots
- **WHEN** switching from Ferro-Fibrous to Standard
- **THEN** all Ferro-Fibrous equipment items SHALL be removed
- **AND** no new armor equipment items SHALL be created

### Requirement: Armor Points Display
The armor tab summary SHALL display allocated points vs maximum armor capacity.

#### Scenario: Points display denominator
- **WHEN** displaying armor points in summary bar
- **THEN** format SHALL be `{allocatedPoints} / {maxTotalArmor}`
- **AND** maxTotalArmor SHALL be the mech's physical armor capacity based on structure

#### Scenario: Points display with excess tonnage
- **WHEN** armor tonnage provides more points than maxTotalArmor
- **THEN** denominator SHALL still show maxTotalArmor
- **AND** excess points SHALL be shown as "Wasted Armor Points"

#### Scenario: Points display with partial tonnage
- **WHEN** armor tonnage provides fewer points than maxTotalArmor
- **THEN** numerator SHALL show actual allocated points
- **AND** denominator SHALL show maxTotalArmor

