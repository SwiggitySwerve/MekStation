# critical-slot-allocation Spec Delta

## ADDED Requirements

### Requirement: Slot Assignment Workflow

Equipment SHALL be assignable to critical slots through multiple interaction methods.

#### Scenario: Click-to-assign from selection

- **GIVEN** equipment is selected in the loadout tray
- **AND** user clicks on an empty slot in the critical slots grid
- **WHEN** the slot is a valid starting position for the equipment
- **THEN** equipment SHALL be assigned to the clicked slot
- **AND** equipment SHALL occupy consecutive slots based on `criticalSlots` count
- **AND** selection SHALL be cleared after assignment

#### Scenario: Quick assign from context menu

- **GIVEN** user right-clicks unallocated equipment in loadout tray
- **WHEN** context menu shows valid locations
- **AND** user selects a location
- **THEN** equipment SHALL be assigned to first available contiguous slot range
- **AND** assignment SHALL skip fixed system slots
- **AND** selection SHALL be cleared after assignment

#### Scenario: Assignment validation

- **GIVEN** equipment requires N slots
- **WHEN** attempting to assign to a location
- **THEN** system SHALL verify N contiguous empty slots exist
- **AND** system SHALL verify location is valid for equipment type
- **AND** system SHALL skip fixed slots (actuators, engine, gyro, sensors)

### Requirement: Slot Unassignment Workflow

Equipment SHALL be unassignable from critical slots through multiple interaction methods.

#### Scenario: Double-click to unassign

- **GIVEN** equipment is assigned to slots in the critical slots grid
- **WHEN** user double-clicks on the equipment
- **THEN** equipment `location` SHALL be set to `undefined`
- **AND** equipment `slots` SHALL be set to `undefined`
- **AND** equipment SHALL appear in "Unallocated" section of loadout tray

#### Scenario: Right-click context menu to unassign

- **GIVEN** equipment is assigned to slots in the critical slots grid
- **WHEN** user right-clicks on the equipment
- **AND** selects "Unassign" from context menu
- **THEN** equipment SHALL be unassigned (same as double-click)

#### Scenario: Unassign from loadout tray

- **GIVEN** equipment is shown in "Allocated" section of loadout tray
- **WHEN** user clicks the unassign button (↩) on the equipment
- **THEN** equipment SHALL be unassigned from its current location

#### Scenario: Reset all assignments

- **GIVEN** user clicks "Reset" button in critical slots toolbar
- **WHEN** confirmation is accepted (if required)
- **THEN** ALL equipment locations SHALL be cleared
- **AND** ALL equipment SHALL move to "Unallocated" section

### Requirement: Fixed Slot Protection

System component slots SHALL NOT be assignable.

#### Scenario: Head fixed slots

- **GIVEN** user attempts to assign equipment to Head
- **WHEN** targeting slots 0, 1, 2, 4, or 5
- **THEN** assignment SHALL be rejected
- **AND** only slot 3 SHALL be assignable

#### Scenario: Arm fixed slots

- **GIVEN** user attempts to assign equipment to Left Arm or Right Arm
- **WHEN** targeting slots 0-3 (actuators)
- **THEN** assignment SHALL be rejected
- **AND** only slots 4-11 SHALL be assignable

#### Scenario: Leg fixed slots

- **GIVEN** user attempts to assign equipment to Left Leg or Right Leg
- **WHEN** targeting slots 0-3 (actuators)
- **THEN** assignment SHALL be rejected
- **AND** only slots 4-5 SHALL be assignable

#### Scenario: Center Torso fixed slots

- **GIVEN** user attempts to assign equipment to Center Torso
- **WHEN** targeting slots occupied by engine or gyro
- **THEN** assignment SHALL be rejected
- **AND** only slots after engine+gyro SHALL be assignable
