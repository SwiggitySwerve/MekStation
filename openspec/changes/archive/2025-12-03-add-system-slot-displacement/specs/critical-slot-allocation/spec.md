## ADDED Requirements

### Requirement: Side Torso Engine Slots

XL, Light, and XXL engines SHALL occupy fixed slots in the side torsos.

#### Scenario: XL Engine (IS) side torso slots

- **WHEN** XL Engine (IS) is selected
- **THEN** Left Torso slots 0, 1, 2 SHALL be marked as fixed (Engine)
- **AND** Right Torso slots 0, 1, 2 SHALL be marked as fixed (Engine)
- **AND** equipment SHALL NOT be assignable to these slots

#### Scenario: XL Engine (Clan) side torso slots

- **WHEN** XL Engine (Clan) is selected
- **THEN** Left Torso slots 0, 1 SHALL be marked as fixed (Engine)
- **AND** Right Torso slots 0, 1 SHALL be marked as fixed (Engine)
- **AND** equipment SHALL NOT be assignable to these slots

#### Scenario: Light Engine side torso slots

- **WHEN** Light Engine is selected
- **THEN** Left Torso slots 0, 1 SHALL be marked as fixed (Engine)
- **AND** Right Torso slots 0, 1 SHALL be marked as fixed (Engine)
- **AND** equipment SHALL NOT be assignable to these slots

#### Scenario: XXL Engine side torso slots

- **WHEN** XXL Engine is selected
- **THEN** Left Torso slots 0, 1, 2 SHALL be marked as fixed (Engine)
- **AND** Right Torso slots 0, 1, 2 SHALL be marked as fixed (Engine)
- **AND** equipment SHALL NOT be assignable to these slots

#### Scenario: Standard/Compact Engine no side torso slots

- **WHEN** Standard or Compact Engine is selected
- **THEN** Left Torso SHALL have no fixed engine slots
- **AND** Right Torso SHALL have no fixed engine slots
- **AND** all 12 slots per side torso SHALL be available for equipment

### Requirement: Equipment Displacement on Configuration Change

When system configuration changes require slots currently occupied by equipment, the system SHALL automatically unallocate the affected equipment.

#### Scenario: Engine type change displaces equipment

- **GIVEN** equipment is allocated to slots 0-2 in Left Torso
- **AND** engine type is Standard (no side torso slots)
- **WHEN** engine type is changed to XL Engine (IS)
- **THEN** equipment in slots 0-2 SHALL be unallocated
- **AND** equipment location SHALL be set to undefined
- **AND** equipment slots SHALL be set to undefined
- **AND** equipment SHALL appear in unallocated section of loadout tray

#### Scenario: Engine type change to smaller engine - no displacement

- **GIVEN** equipment is allocated to slots 3-5 in Left Torso
- **AND** engine type is XL Engine (IS) (slots 0-2 fixed)
- **WHEN** engine type is changed to Standard (no side torso slots)
- **THEN** equipment in slots 3-5 SHALL remain allocated
- **AND** no equipment SHALL be displaced

#### Scenario: Gyro type change displaces equipment

- **GIVEN** equipment is allocated to slot 9 in Center Torso
- **AND** gyro type is Standard (4 slots, indices 3-6)
- **WHEN** gyro type is changed to XL Gyro (6 slots, indices 3-8)
- **THEN** equipment in slots 7-8 SHALL be unallocated if present
- **AND** equipment in slot 9 SHALL remain allocated (not in new fixed range)

#### Scenario: Gyro type change to smaller gyro - no displacement

- **GIVEN** equipment is allocated to slots 7-8 in Center Torso
- **AND** gyro type is XL Gyro (6 slots)
- **WHEN** gyro type is changed to Compact Gyro (2 slots)
- **THEN** equipment SHALL remain allocated
- **AND** no equipment SHALL be displaced

## MODIFIED Requirements

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

#### Scenario: Side Torso fixed slots with XL/Light/XXL engine

- **GIVEN** user attempts to assign equipment to Left Torso or Right Torso
- **AND** engine type requires side torso slots
- **WHEN** targeting slots 0 through (sideTorsoSlots - 1)
- **THEN** assignment SHALL be rejected
- **AND** only slots from sideTorsoSlots to 11 SHALL be assignable
