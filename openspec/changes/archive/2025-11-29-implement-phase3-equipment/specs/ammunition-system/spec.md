## ADDED Requirements

### Requirement: Ammunition Tracking
The system SHALL track ammunition for ballistic and missile weapons.

#### Scenario: Shots per ton
- **WHEN** ammunition is defined
- **THEN** shots per ton MUST be specified
- **AND** ammunition MUST specify compatible weapon types

### Requirement: Ammunition Explosion
Ammunition SHALL be subject to explosion rules when critically hit.

#### Scenario: Ammo explosion
- **WHEN** ammunition location is critically hit
- **THEN** remaining shots MAY cause explosion damage
- **AND** CASE/CASE II protection MAY mitigate damage

### Requirement: Ammo Compatibility
Ammunition MUST be compatible with weapon type.

#### Scenario: Compatibility check
- **WHEN** loading ammunition
- **THEN** ammo type MUST match weapon type
- **AND** tech base SHOULD match unless mixed tech

