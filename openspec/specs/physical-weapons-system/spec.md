# physical-weapons-system Specification

## Purpose
TBD - created by archiving change implement-phase3-equipment. Update Purpose after archive.
## Requirements
### Requirement: Physical Weapon Types
The system SHALL support melee weapons with accurate variable calculations.

#### Scenario: Hatchet
- **WHEN** installing hatchet
- **THEN** damage = floor(tonnage / 5)
- **AND** weight = ceil(tonnage / 15)
- **AND** criticalSlots = ceil(tonnage / 15)
- **AND** requires lower arm and hand actuators

#### Scenario: Sword
- **WHEN** installing sword
- **THEN** damage = floor(tonnage / 10) + 1
- **AND** weight = ceil(tonnage / 15)
- **AND** criticalSlots = ceil(tonnage / 15)
- **AND** requires lower arm and hand actuators

#### Scenario: Mace
- **WHEN** installing mace
- **THEN** damage = floor(tonnage / 4)
- **AND** weight = ceil(tonnage / 10)
- **AND** criticalSlots = ceil(tonnage / 10)
- **AND** requires lower arm and hand actuators

#### Scenario: Lance
- **WHEN** installing lance
- **THEN** damage = floor(tonnage / 5), doubled when charging
- **AND** weight = ceil(tonnage / 20)
- **AND** criticalSlots = ceil(tonnage / 20)
- **AND** requires lower arm and hand actuators

#### Scenario: Claws (Clan)
- **WHEN** installing claws
- **THEN** damage = floor(tonnage / 7)
- **AND** weight = ceil(tonnage / 15)
- **AND** criticalSlots = ceil(tonnage / 15)
- **AND** replaces hand actuator

#### Scenario: Talons
- **WHEN** installing talons
- **THEN** damage bonus = floor(tonnage / 5) added to kick
- **AND** weight = ceil(tonnage / 15)
- **AND** criticalSlots = ceil(tonnage / 15)
- **AND** mounted in leg locations

#### Scenario: Retractable Blade
- **WHEN** installing retractable blade
- **THEN** damage = floor(tonnage / 10)
- **AND** weight = ceil(tonnage / 20)
- **AND** criticalSlots = ceil(tonnage / 20)
- **AND** requires lower arm actuator only (no hand)

#### Scenario: Flail
- **WHEN** installing flail
- **THEN** damage = floor(tonnage / 4)
- **AND** weight = ceil(tonnage / 10)
- **AND** criticalSlots = ceil(tonnage / 10)
- **AND** requires lower arm and hand actuators

#### Scenario: Wrecking Ball
- **WHEN** installing wrecking ball
- **THEN** damage = floor(tonnage / 5)
- **AND** weight = ceil(tonnage / 10)
- **AND** criticalSlots = ceil(tonnage / 10)
- **AND** mounted in torso location

### Requirement: Actuator Requirements
Physical weapons SHALL require specific actuators.

#### Scenario: Arm-mounted physical weapons
- **WHEN** mounting physical weapon in arm
- **THEN** lower arm actuator MUST be present
- **AND** hand actuator MUST be present for some weapons

