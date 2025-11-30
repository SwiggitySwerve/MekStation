# electronics-system Specification

## Purpose
TBD - created by archiving change implement-phase3-equipment. Update Purpose after archive.
## Requirements
### Requirement: C3 Computer Systems
The system SHALL support C3 networking computers.

#### Scenario: C3 types
- **WHEN** installing C3 system
- **THEN** system SHALL support C3 Master, Slave, and Improved variants
- **AND** network limitations SHALL be enforced

### Requirement: ECM Systems
The system SHALL support electronic countermeasures.

#### Scenario: ECM variants
- **WHEN** installing ECM
- **THEN** Guardian ECM and Angel ECM SHALL be supported
- **AND** ECM range and effects SHALL be defined

### Requirement: Targeting Systems
The system SHALL support targeting computers and probes with variable weight calculations.

#### Scenario: Targeting computer weight calculation (IS)
- **WHEN** calculating Inner Sphere Targeting Computer weight
- **THEN** weight = ceil(directFireWeaponTonnage / 4)
- **AND** criticalSlots = weight (1 slot per ton)
- **AND** cost = weight × 10000 C-Bills

#### Scenario: Targeting computer weight calculation (Clan)
- **WHEN** calculating Clan Targeting Computer weight
- **THEN** weight = ceil(directFireWeaponTonnage / 5)
- **AND** criticalSlots = weight (1 slot per ton)
- **AND** cost = weight × 10000 C-Bills

#### Scenario: Direct fire weapon classification
- **WHEN** determining directFireWeaponTonnage for targeting computer
- **THEN** include Energy weapons (lasers, PPCs, flamers)
- **AND** include Ballistic weapons (ACs, Gauss)
- **AND** exclude Missile weapons (LRMs, SRMs)
- **AND** exclude Artillery weapons
- **AND** exclude Support weapons

#### Scenario: Targeting computer validation
- **WHEN** validating targeting computer installation
- **THEN** weight MUST be at least 1 ton
- **AND** weight MUST be whole tons only
- **AND** targeting computer MUST be placed in single location

