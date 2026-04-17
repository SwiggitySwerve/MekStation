# battle-armor-unit-system (delta)

## ADDED Requirements

### Requirement: Trooper Mass Validation

Each trooper's combined mass (armor + weapons + equipment) SHALL fall within the selected weight class range.

#### Scenario: Valid Medium trooper

- **GIVEN** a Medium-class trooper with total mass 900 kg
- **WHEN** validation runs
- **THEN** no `VAL-BA-CLASS` errors SHALL fire

#### Scenario: Overweight trooper

- **GIVEN** a Light-class trooper with total mass 800 kg (above 750 kg cap)
- **WHEN** validation runs
- **THEN** `VAL-BA-CLASS` SHALL emit "Light class trooper mass 800 kg exceeds maximum 750 kg"

### Requirement: Armor Points per Trooper

The system SHALL enforce armor points per trooper ≤ class maximum, with weight per point depending on armor type.

#### Scenario: Maximum armor Light class

- **GIVEN** a Light-class trooper
- **WHEN** armor is set to 5 points Standard BA
- **THEN** armor mass SHALL equal `5 × 50 = 250 kg`
- **AND** validation SHALL pass

#### Scenario: Exceeds class cap

- **GIVEN** a Light-class trooper
- **WHEN** armor is set to 6 points
- **THEN** `VAL-BA-ARMOR` SHALL emit "Light class cap is 5 armor points"

#### Scenario: Stealth armor slot cost

- **GIVEN** a trooper with Basic Stealth BA armor
- **WHEN** the camouflage generator slot is computed
- **THEN** 1 Body slot SHALL be reserved for the camo generator

### Requirement: Movement MP Caps by Class and Type

The system SHALL enforce per-weight-class caps on ground, jump, VTOL, and UMU movement points.

#### Scenario: Medium class ground MP cap

- **GIVEN** a Medium-class squad
- **WHEN** the user requests ground MP 3
- **THEN** `VAL-BA-MP` SHALL emit "Medium class ground MP cap is 2"

#### Scenario: Assault jump illegal

- **GIVEN** an Assault-class squad
- **WHEN** jump MP is set to 1
- **THEN** `VAL-BA-MP` SHALL emit "Assault class cannot jump"

#### Scenario: VTOL class restriction

- **GIVEN** a Heavy-class squad
- **WHEN** movement type is set to VTOL
- **THEN** `VAL-BA-MOVE-TYPE` SHALL emit "VTOL movement requires Light or Medium class"

### Requirement: Manipulator Configuration

The system SHALL configure exactly two manipulators for Biped chassis and zero for Quad chassis.

#### Scenario: Biped default manipulators

- **GIVEN** a new Biped squad with no overrides
- **WHEN** manipulators are initialized
- **THEN** each arm SHALL default to Basic Claw

#### Scenario: Quad has no manipulators

- **GIVEN** a Quad squad
- **WHEN** manipulator slots are accessed
- **THEN** manipulators SHALL be an empty array
- **AND** arm-mounted equipment SHALL be disallowed

### Requirement: Weapon / Manipulator Compatibility

The system SHALL gate heavy weapons behind appropriate manipulators.

#### Scenario: Heavy weapon with Heavy Claw

- **GIVEN** a Biped squad with Heavy Claws on both arms
- **WHEN** an SRM-4 is arm-mounted
- **THEN** mounting SHALL succeed

#### Scenario: Heavy weapon with Basic Claw

- **GIVEN** a Biped squad with Basic Claws
- **WHEN** an SRM-4 is arm-mounted
- **THEN** `VAL-BA-MANIPULATOR` SHALL emit "SRM-4 requires Heavy Claw or Battle Claw"

### Requirement: Anti-Mech Equipment

The system SHALL support anti-mech equipment with class and slot restrictions.

#### Scenario: Magnetic Clamp body-mounted

- **GIVEN** any BA squad
- **WHEN** a Magnetic Clamp is body-mounted
- **THEN** mounting SHALL succeed (1 body slot)
- **AND** the squad SHALL become eligible for swarm attacks

#### Scenario: Partial Wing class restriction

- **GIVEN** a Medium-class squad
- **WHEN** Partial Wing is added
- **THEN** validation SHALL emit an error — Partial Wing is Light class only

### Requirement: Squad Composition

The system SHALL configure squad size per tech base default and validate within 1-6.

#### Scenario: IS default squad

- **GIVEN** a new Inner Sphere BA squad
- **WHEN** squad is initialized
- **THEN** `squadSize` SHALL equal 4

#### Scenario: Clan default squad

- **GIVEN** a new Clan BA squad
- **WHEN** squad is initialized
- **THEN** `squadSize` SHALL equal 5 (Elemental Point)

#### Scenario: Squad size warning

- **GIVEN** a squad with size 2
- **WHEN** validation runs
- **THEN** `VAL-BA-SQUAD` SHALL emit a warning (not error) — non-standard squad size

### Requirement: Construction Validation Rule Set

The validation registry SHALL include the `VAL-BA-*` rule group.

#### Scenario: Rule ids registered

- **WHEN** the validation registry initializes
- **THEN** `VAL-BA-CLASS`, `VAL-BA-ARMOR`, `VAL-BA-MP`, `VAL-BA-MANIPULATOR`, `VAL-BA-SQUAD`, and `VAL-BA-MOVE-TYPE` SHALL be registered
