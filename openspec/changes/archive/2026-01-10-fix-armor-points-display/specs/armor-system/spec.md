## ADDED Requirements

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
