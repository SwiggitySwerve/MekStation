## ADDED Requirements

### Requirement: Hardpoint Types
OmniMechs SHALL define hardpoints for equipment mounting.

#### Scenario: Hardpoint definition
- **WHEN** defining OmniMech pod space
- **THEN** hardpoints SHALL specify type (Energy, Ballistic, Missile)
- **AND** hardpoints SHALL limit weapon mounting options

### Requirement: Weapon-Hardpoint Compatibility
Weapons MUST match hardpoint type for OmniMechs.

#### Scenario: Compatibility check
- **WHEN** mounting weapon on OmniMech
- **THEN** weapon type MUST match hardpoint type
- **AND** physical weapons use any hardpoint type

### Requirement: Fixed vs Pod Equipment
OmniMechs SHALL distinguish fixed and pod equipment.

#### Scenario: Fixed equipment
- **WHEN** equipment is fixed
- **THEN** equipment cannot be changed in configuration
- **AND** weight counts against pod space

#### Scenario: Pod equipment
- **WHEN** equipment is in pod
- **THEN** equipment can be swapped between configurations
- **AND** total pod weight must not exceed limit

