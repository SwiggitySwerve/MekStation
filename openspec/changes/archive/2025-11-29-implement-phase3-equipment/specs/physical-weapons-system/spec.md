## ADDED Requirements

### Requirement: Physical Weapon Types

The system SHALL support melee weapons.

#### Scenario: Hatchet

- **WHEN** installing hatchet
- **THEN** damage = tonnage / 7 (rounded down)
- **AND** weight = tonnage / 15 (rounded up)
- **AND** requires lower arm and hand actuators

#### Scenario: Sword

- **WHEN** installing sword
- **THEN** damage = (tonnage / 10) + 1 (rounded down)
- **AND** weight = tonnage / 20 (rounded up)

### Requirement: Actuator Requirements

Physical weapons SHALL require specific actuators.

#### Scenario: Arm-mounted physical weapons

- **WHEN** mounting physical weapon in arm
- **THEN** lower arm actuator MUST be present
- **AND** hand actuator MUST be present for some weapons
