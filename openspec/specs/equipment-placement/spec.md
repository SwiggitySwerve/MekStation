# equipment-placement Specification

## Purpose

TBD - created by archiving change implement-phase3-equipment. Update Purpose after archive.

## Requirements

### Requirement: Location Restrictions

Equipment SHALL have placement restrictions by location.

#### Scenario: Arm restrictions

- **WHEN** placing equipment in arm
- **THEN** verify weapon is arm-mountable
- **AND** verify actuator compatibility

#### Scenario: Head restrictions

- **WHEN** placing equipment in head
- **THEN** only 1 slot available (after cockpit components)
- **AND** limited equipment types allowed

### Requirement: Split Equipment

Some equipment SHALL be allowed to split across locations.

#### Scenario: Endo Steel/Ferro placement

- **WHEN** placing structure or armor slots
- **THEN** slots MAY be distributed across any locations
- **AND** total slots MUST equal required count

### Requirement: Contiguous Placement

Multi-slot equipment MUST be placed contiguously.

#### Scenario: Multi-slot weapon

- **WHEN** placing weapon requiring multiple slots
- **THEN** all slots MUST be in same location
- **AND** slots MUST be contiguous

### Requirement: OmniMech Pod Mounting

OmniMech equipment SHALL be classified as fixed or pod-mounted.

#### Scenario: Pod-mounted equipment flag

- **GIVEN** equipment on an OmniMech
- **THEN** `isOmniPodMounted` flag SHALL indicate mount type
- **AND** true = pod-mounted (swappable)
- **AND** false = fixed to chassis (permanent)

#### Scenario: Fixed equipment restrictions

- **GIVEN** fixed equipment on an OmniMech (`isOmniPodMounted: false`)
- **WHEN** user attempts to drag or remove the equipment
- **THEN** operation SHALL be prevented
- **AND** cursor SHALL indicate not-allowed

#### Scenario: Fixed equipment visual distinction

- **GIVEN** fixed equipment in critical slots or equipment tray
- **WHEN** displayed on an OmniMech
- **THEN** equipment SHALL show "(Fixed)" suffix
- **AND** equipment SHALL have 60% opacity visual styling

#### Scenario: Pod equipment characteristics

- **GIVEN** pod-mounted equipment (`isOmniPodMounted: true`)
- **WHEN** displayed on an OmniMech
- **THEN** equipment SHALL show "(Pod)" suffix
- **AND** equipment SHALL be draggable and removable

#### Scenario: Chassis reset clears pods

- **WHEN** OmniMech chassis reset is triggered
- **THEN** all pod-mounted equipment SHALL be removed
- **AND** all fixed equipment SHALL remain in place
