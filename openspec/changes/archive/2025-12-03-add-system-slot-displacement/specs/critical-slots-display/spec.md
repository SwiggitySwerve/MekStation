## MODIFIED Requirements

### Requirement: Location-Based Slot Display
The system SHALL display critical slots organized by mech location in a responsive grid layout.

#### Scenario: Location grid rendering
- **WHEN** the critical slots display renders
- **THEN** all 8 locations are shown (HD, CT, LT, RT, LA, RA, LL, RL)
- **AND** each location shows its correct number of slots
- **AND** grid adapts to screen size

#### Scenario: Side torso engine slot display
- **WHEN** engine type requires side torso slots (XL, Light, XXL)
- **THEN** Left Torso SHALL show engine slots at indices 0 through (sideTorsoSlots - 1)
- **AND** Right Torso SHALL show engine slots at indices 0 through (sideTorsoSlots - 1)
- **AND** engine slots SHALL be displayed with "Engine" label
- **AND** engine slots SHALL use orange color coding
- **AND** remaining slots SHALL show as empty or equipment

#### Scenario: Side torso display without engine slots
- **WHEN** engine type does not require side torso slots (Standard, Compact)
- **THEN** Left Torso SHALL show all 12 slots as available for equipment
- **AND** Right Torso SHALL show all 12 slots as available for equipment
- **AND** no engine slots SHALL be displayed in side torsos

