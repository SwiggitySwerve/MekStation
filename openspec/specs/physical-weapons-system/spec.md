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

### Requirement: Physical Weapon Combat To-Hit Modifiers

Physical weapons SHALL have specific to-hit modifiers that apply during physical attack resolution.

#### Scenario: Hatchet to-hit modifier

- **WHEN** a unit with a hatchet makes a melee attack using the hatchet
- **THEN** the to-hit calculation SHALL include a -1 modifier (easier to hit)

#### Scenario: Sword to-hit modifier

- **WHEN** a unit with a sword makes a melee attack using the sword
- **THEN** the to-hit calculation SHALL include a -2 modifier

#### Scenario: Mace to-hit modifier

- **WHEN** a unit with a mace makes a melee attack using the mace
- **THEN** the to-hit calculation SHALL include a +1 modifier (harder to hit)

### Requirement: Physical Weapon Damage in Combat

Physical weapon damage formulas SHALL be applied during combat resolution, not just during construction.

#### Scenario: Hatchet combat damage

- **WHEN** a 70-ton mech lands a hatchet attack
- **THEN** hatchet damage SHALL be `floor(70 / 5) = 14`

#### Scenario: Sword combat damage

- **WHEN** a 70-ton mech lands a sword attack
- **THEN** sword damage SHALL be `floor(70 / 10) + 1 = 8`

#### Scenario: Mace combat damage

- **WHEN** a 70-ton mech lands a mace attack
- **THEN** mace damage SHALL be `floor(70 × 2 / 5) = 28`

### Requirement: TSM Doubles Weight-Based Melee Damage

When Triple Strength Myomer (TSM) is active, all weight-based melee damage formulas SHALL use doubled weight.

#### Scenario: TSM hatchet damage

- **WHEN** a 70-ton mech with active TSM lands a hatchet attack
- **THEN** hatchet damage SHALL be `floor((70 × 2) / 5) = 28` (doubled effective weight)

#### Scenario: TSM sword damage

- **WHEN** a 70-ton mech with active TSM lands a sword attack
- **THEN** sword damage SHALL be `floor((70 × 2) / 10) + 1 = 15`

#### Scenario: TSM mace damage

- **WHEN** a 70-ton mech with active TSM lands a mace attack
- **THEN** mace damage SHALL be `floor((70 × 2) × 2 / 5) = 56`

### Requirement: Actuator Requirement Enforcement

Physical weapon attacks SHALL be prevented if required actuators are destroyed.

#### Scenario: Hatchet requires lower arm and hand

- **WHEN** a unit attempts a hatchet attack but the lower arm actuator in the weapon's arm is destroyed
- **THEN** the hatchet attack SHALL NOT be permitted

#### Scenario: Sword requires lower arm and hand

- **WHEN** a unit attempts a sword attack but the hand actuator in the weapon's arm is destroyed
- **THEN** the sword attack SHALL NOT be permitted

#### Scenario: Mace requires lower arm and hand

- **WHEN** a unit attempts a mace attack but the lower arm actuator in the weapon's arm is destroyed
- **THEN** the mace attack SHALL NOT be permitted

#### Scenario: Retractable blade only requires lower arm

- **WHEN** a unit attempts a retractable blade attack with a destroyed hand actuator but functional lower arm actuator
- **THEN** the retractable blade attack SHALL be permitted

### Requirement: Physical Weapon Hit Location

Physical weapon attacks SHALL use the punch hit location table for arm-mounted weapons.

#### Scenario: Hatchet uses punch table

- **WHEN** a hatchet attack hits
- **THEN** the hit location SHALL be determined by the 1d6 punch hit location table
- **AND** roll 1=LA, 2=LT, 3=CT, 4=RT, 5=RA, 6=Head

#### Scenario: Sword uses punch table

- **WHEN** a sword attack hits
- **THEN** the hit location SHALL be determined by the 1d6 punch hit location table

### Requirement: Physical Weapon Restrictions During Combat

The system SHALL enforce combat restrictions on physical weapon usage.

#### Scenario: Cannot use physical weapon if arm fired

- **WHEN** a unit fired weapons from an arm during the weapon attack phase
- **THEN** that arm SHALL NOT be used for a physical weapon attack in the physical attack phase

#### Scenario: Physical weapon attack is exclusive per arm

- **WHEN** a unit makes a physical weapon attack with an arm
- **THEN** that arm SHALL NOT also make a standard punch attack in the same turn
