## ADDED Requirements

### Requirement: Critical Hit Tables

Each location SHALL have a critical hit table.

#### Scenario: Critical slot determination

- **WHEN** critical hit is scored
- **THEN** random slot SHALL be determined
- **AND** component in slot SHALL be affected

### Requirement: Critical Hit Effects

Components SHALL have defined critical hit effects.

#### Scenario: Weapon critical

- **WHEN** weapon takes critical hit
- **THEN** weapon SHALL be destroyed
- **AND** weapon cannot be used

#### Scenario: Engine critical

- **WHEN** engine takes critical hit
- **THEN** engine hit counter SHALL increase
- **AND** 3 engine hits SHALL destroy mech

### Requirement: Ammo Explosion

Ammunition critical hits SHALL cause explosions.

#### Scenario: Ammo explosion

- **WHEN** ammunition takes critical hit
- **THEN** remaining shots SHALL cause explosion
- **AND** explosion damage = shots × damage per shot
- **AND** CASE SHALL limit explosion damage transfer
