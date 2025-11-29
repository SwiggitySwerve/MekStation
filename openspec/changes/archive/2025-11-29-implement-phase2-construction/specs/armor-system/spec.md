## ADDED Requirements

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

