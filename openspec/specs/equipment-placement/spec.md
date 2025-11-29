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

