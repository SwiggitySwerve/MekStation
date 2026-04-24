# protomech-unit-system (delta)

## ADDED Requirements

### Requirement: ProtoMech Chassis Types

The system SHALL support four ProtoMech chassis types with per-chassis rules.

#### Scenario: Biped default

- **GIVEN** a new ProtoMech
- **WHEN** chassis is initialized
- **THEN** `chassisType` SHALL default to `Biped`

#### Scenario: Glider Light-only

- **GIVEN** a ProtoMech with tonnage 5
- **WHEN** chassis is set to `Glider`
- **THEN** `VAL-PROTO-CHASSIS` SHALL emit an error — Glider requires Light class (2-4 tons)

#### Scenario: Ultraheavy class

- **GIVEN** a ProtoMech with tonnage 12
- **WHEN** chassis is set to `Ultraheavy`
- **THEN** validation SHALL pass
- **AND** jump MP SHALL be forced to 0

### Requirement: ProtoMech Movement Caps

The system SHALL enforce per-weight-class MP caps.

#### Scenario: Medium walk cap

- **GIVEN** a 6-ton (Medium) ProtoMech
- **WHEN** walkMP is requested above 6
- **THEN** `VAL-PROTO-MP` SHALL emit an error

#### Scenario: Ultraheavy no jump

- **GIVEN** an Ultraheavy 12-ton ProtoMech
- **WHEN** jumpMP is requested as 1
- **THEN** `VAL-PROTO-MP` SHALL emit "Ultraheavy cannot jump"

#### Scenario: Myomer booster bonus

- **GIVEN** a Medium-class ProtoMech with walkMP 5 and Myomer Booster
- **WHEN** effective MP is computed
- **THEN** walkMP SHALL be 6 (base 5 + 1 from booster)

### Requirement: Main Gun System

The system SHALL optionally configure a MainGun location with a single heavy weapon from an approved list.

#### Scenario: Legal main gun

- **GIVEN** a Medium ProtoMech with MainGun
- **WHEN** a PPC is installed in MainGun
- **THEN** installation SHALL succeed
- **AND** MainGun location SHALL hold exactly one weapon

#### Scenario: Illegal main gun weapon

- **GIVEN** a Medium ProtoMech with MainGun
- **WHEN** a Binary Laser Cannon is attempted in MainGun
- **THEN** `VAL-PROTO-MAIN-GUN` SHALL emit "weapon not in approved main-gun list"

#### Scenario: Heavy arm weapon requires main gun

- **GIVEN** a Biped ProtoMech
- **WHEN** a PPC is attempted in a LeftArm mount
- **THEN** mounting SHALL fail — heavy weapons must be in MainGun

### Requirement: Clan Tech Base Lock

The system SHALL warn (not error) when tech base is not Clan.

#### Scenario: Non-Clan tech base warning

- **GIVEN** a ProtoMech with tech base Inner Sphere
- **WHEN** validation runs
- **THEN** `VAL-PROTO-TECH-BASE` SHALL emit a warning "ProtoMechs are Clan-only technology"

#### Scenario: Clan tech base passes

- **GIVEN** a ProtoMech with tech base Clan
- **WHEN** validation runs
- **THEN** no `VAL-PROTO-TECH-BASE` error or warning SHALL be emitted

### Requirement: ProtoMech Construction Validation Rule Set

The validation registry SHALL include the `VAL-PROTO-*` rule group.

#### Scenario: Rule ids registered

- **WHEN** the validation registry initializes
- **THEN** `VAL-PROTO-TONNAGE`, `VAL-PROTO-CHASSIS`, `VAL-PROTO-MP`, `VAL-PROTO-MAIN-GUN`, and `VAL-PROTO-TECH-BASE` SHALL be registered
