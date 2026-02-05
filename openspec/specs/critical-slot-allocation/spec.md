# critical-slot-allocation Specification

## Purpose

TBD - created by archiving change implement-phase2-construction. Update Purpose after archive.

## Requirements

### Requirement: Location Slot Counts

Each location SHALL have a fixed number of critical slots based on mech configuration.

#### Scenario: Biped slot definitions

- **WHEN** defining location capacity for BIPED configuration
- **THEN** Head = 6 slots
- **AND** Center Torso = 12 slots
- **AND** Side Torsos = 12 slots each
- **AND** Arms = 12 slots each
- **AND** Legs = 6 slots each
- **AND** Total = 78 slots

#### Scenario: Quad slot definitions

- **WHEN** defining location capacity for QUAD configuration
- **THEN** Head = 6 slots
- **AND** Center Torso = 12 slots
- **AND** Side Torsos = 12 slots each
- **AND** Front Legs = 12 slots each
- **AND** Rear Legs = 12 slots each
- **AND** Total = 78 slots

#### Scenario: Tripod slot definitions

- **WHEN** defining location capacity for TRIPOD configuration
- **THEN** Head = 6 slots
- **AND** Center Torso = 12 slots
- **AND** Side Torsos = 12 slots each
- **AND** Arms = 12 slots each
- **AND** Legs = 6 slots each (Left, Right, Center)
- **AND** Total = 84 slots

#### Scenario: LAM slot definitions

- **WHEN** defining location capacity for LAM configuration
- **THEN** slot counts SHALL match BIPED configuration
- **AND** Landing Gear SHALL occupy 1 slot in CT, LT, RT
- **AND** Avionics SHALL occupy 1 slot in Head, LT, RT

### Requirement: Fixed Component Placement

Structural components SHALL be placed in fixed order.

#### Scenario: Placement order

- **WHEN** allocating fixed components
- **THEN** engine SHALL be placed first in CT
- **AND** gyro SHALL follow engine
- **AND** heat sinks SHALL follow gyro

### Requirement: Distributed Slot Components

Endo Steel, Ferro-Fibrous, and similar structure/armor types SHALL distribute slots freely as individual 1-slot items.

#### Scenario: Distributed slot placement

- **WHEN** allocating Endo Steel or Ferro-Fibrous slots
- **THEN** slots MAY be placed in ANY location including Head
- **AND** slots MAY be split across multiple locations
- **AND** placement in Head SHOULD be avoided (pilot death risk on crit)

#### Scenario: Individual slot tracking

- **WHEN** Endo Steel or Ferro-Fibrous is selected
- **THEN** each required slot SHALL be a separate equipment item
- **AND** each item SHALL have unique `instanceId`
- **AND** unassigned items SHALL have `location: undefined`
- **AND** assigned items SHALL have `location` set to target location

#### Scenario: Stealth armor fixed placement

- **WHEN** Stealth armor is selected
- **THEN** 2-slot components SHALL be pre-assigned to LA, RA, LT, RT, LL, RL
- **AND** components SHALL NOT be movable to other locations
- **AND** each location SHALL receive exactly one 2-slot component

### Requirement: Actuator Requirements

Limbs SHALL have required actuator slots based on mech configuration.

#### Scenario: Biped arm actuators

- **WHEN** arm has full actuators in BIPED configuration
- **THEN** shoulder = 1 slot (required)
- **AND** upper arm = 1 slot (required)
- **AND** lower arm = 1 slot (optional, removable)
- **AND** hand = 1 slot (optional, removable)

#### Scenario: Biped leg actuators

- **WHEN** leg is defined in BIPED configuration
- **THEN** hip = 1 slot (required)
- **AND** upper leg = 1 slot (required)
- **AND** lower leg = 1 slot (required)
- **AND** foot = 1 slot (required)

#### Scenario: Quad leg actuators

- **WHEN** any leg is defined in QUAD configuration
- **THEN** all four legs SHALL use leg actuators (hip, upper leg, lower leg, foot)
- **AND** no arm actuators SHALL be present
- **AND** all actuators SHALL be required (not removable)

#### Scenario: Tripod leg actuators

- **WHEN** legs are defined in TRIPOD configuration
- **THEN** Left Leg, Right Leg, and Center Leg SHALL all use leg actuators
- **AND** arms SHALL use standard arm actuators

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

System component slots SHALL NOT be assignable based on configuration.

#### Scenario: Head fixed slots

- **GIVEN** user attempts to assign equipment to Head
- **WHEN** targeting slots 0, 1, 2, 4, or 5
- **THEN** assignment SHALL be rejected
- **AND** only slot 3 SHALL be assignable

#### Scenario: Arm fixed slots (biped/tripod/LAM)

- **GIVEN** user attempts to assign equipment to Left Arm or Right Arm
- **WHEN** configuration is BIPED, TRIPOD, or LAM
- **AND** targeting slots 0-3 (actuators)
- **THEN** assignment SHALL be rejected
- **AND** only slots 4-11 SHALL be assignable

#### Scenario: Quad leg fixed slots

- **GIVEN** user attempts to assign equipment to any leg in QUAD configuration
- **WHEN** targeting slots 0-3 (leg actuators)
- **THEN** assignment SHALL be rejected
- **AND** only slots 4-11 SHALL be assignable

#### Scenario: Biped/Tripod leg fixed slots

- **GIVEN** user attempts to assign equipment to Left Leg, Right Leg, or Center Leg
- **WHEN** configuration is BIPED or TRIPOD
- **AND** targeting slots 0-3 (actuators)
- **THEN** assignment SHALL be rejected
- **AND** only slots 4-5 SHALL be assignable

#### Scenario: LAM fixed equipment slots

- **GIVEN** user attempts to assign equipment in LAM configuration
- **WHEN** targeting slots occupied by Landing Gear or Avionics
- **THEN** assignment SHALL be rejected
- **AND** Landing Gear and Avionics SHALL be fixed and not removable

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

### Requirement: Configuration Slot Count Constants

Slot counts SHALL be defined in a canonical source and imported by validation code.

#### Scenario: Canonical slot count source

- **WHEN** determining slot counts for validation
- **THEN** validation code SHALL import from `CriticalSlotAllocation.ts`
- **AND** validation code SHALL NOT hardcode slot counts
- **AND** slot counts SHALL be calculated dynamically per configuration type

### Requirement: Configuration-Aware Slot Validation

Slot assignment SHALL validate against configuration-specific rules.

#### Scenario: Validate location for configuration

- **GIVEN** user attempts to assign equipment to a location
- **WHEN** location is not valid for current configuration
- **THEN** assignment SHALL be rejected with configuration mismatch error

#### Scenario: Cross-configuration location rejection

- **GIVEN** unit is QUAD configuration
- **WHEN** attempting to assign to LEFT_ARM or RIGHT_ARM
- **THEN** assignment SHALL be rejected
- **AND** error message SHALL indicate location not valid for quad mechs

### Requirement: MechLocation Enum Expansion

The MechLocation enumeration SHALL include all locations for all configurations.

#### Scenario: Quad-specific locations

- **WHEN** accessing MechLocation enum
- **THEN** FRONT_LEFT_LEG SHALL be available
- **AND** FRONT_RIGHT_LEG SHALL be available
- **AND** REAR_LEFT_LEG SHALL be available
- **AND** REAR_RIGHT_LEG SHALL be available

#### Scenario: Tripod-specific locations

- **WHEN** accessing MechLocation enum
- **THEN** CENTER_LEG SHALL be available

#### Scenario: LAM fighter-mode locations

- **WHEN** accessing MechLocation enum
- **THEN** NOSE, LEFT_WING, RIGHT_WING, AFT, FUSELAGE SHALL be available for fighter mode armor mapping
