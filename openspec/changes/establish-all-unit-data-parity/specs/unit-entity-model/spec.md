## ADDED Requirements

### Requirement: Portable versioned unit documents

The system SHALL expose a documented application-independent unit document validated by the existing schema authority, with explicit schema/version, measurement units, stable identities, discriminated families and relationships. Source adapters SHALL isolate legacy syntax and enum ordinals from this model. The contract SHALL define migration, extension and compatibility rules and provide machine-readable schemas, examples and executable conformance cases.

#### Scenario: An independent consumer reads a design

- **GIVEN** an exported document and its published schema
- **WHEN** a minimal consumer outside the editor validates and reads it
- **THEN** subtype, quantities, locations and mount relationships SHALL be unambiguous
- **AND** the consumer SHALL NOT require UI store code or a legacy source parser

#### Scenario: Document versions and extensions

- **GIVEN** a document with an older supported version or an unknown extension
- **WHEN** it is imported and exported
- **THEN** the version policy SHALL select a tested migration or explicit rejection
- **AND** permitted extension data SHALL survive unchanged
- **AND** unsupported semantic requirements SHALL NOT silently become defaults

### Requirement: Faithful source-unit semantics

The entity model SHALL preserve the loaded construction family, subtype, technology/rules/year, engine flags, location topology and armor orientation, equipment identities and per-mount qualifiers, original SI/fuel and transport/bay relationships. It SHALL distinguish raw source facts from derived calculations and design identity from campaign-instance state. Unknown values SHALL produce diagnostics rather than valid-looking defaults.

#### Scenario: Distinct locations survive conversion

- **GIVEN** a VTOL rotor, two turrets or asymmetric aerospace armor
- **WHEN** its source is converted and hydrated
- **THEN** each native location and its armor SHALL retain its exact identity
- **AND** neither turret SHALL overwrite the other or replace the rotor

#### Scenario: Repeated equipment and qualifiers survive conversion

- **GIVEN** repeated mounts with rear, Omni, size, shots or bay qualifiers
- **WHEN** the domain entity is constructed
- **THEN** equipment identity, multiplicity, qualifiers and relationships SHALL match the upstream-loaded entity

#### Scenario: Invalid design remains inspectable

- **GIVEN** an upstream-loadable design that fails construction validation
- **WHEN** the local domain loads it
- **THEN** its design facts SHALL be retained with validation diagnostics
- **AND** loading success SHALL NOT be described as construction validity

### Requirement: BLK engine serialization adapter

BLK engine codes SHALL use their source-format meanings: 0 fusion, 1 ICE, 2 XL, 3 XXL, 4 light, 5 compact, 6 fuel cell, 7 fission, 8 none, 9 maglev, 10 steam, 11 battery, 12 solar and 13 external. Vehicle, aerospace and ProtoMek conversion SHALL share one decoder. Generic MTF numeric aliases SHALL retain compatibility semantics. An omitted BLK engine tag MAY retain the legacy fusion default; explicit unknown, malformed or empty codes SHALL fail with a diagnostic. Technology flags remain separate source facts.

#### Scenario: Correct three source families consistently

- **GIVEN** vehicle, aerospace and ProtoMek definitions with engine code 1
- **WHEN** the Python source adapter converts them
- **THEN** each SHALL identify an ICE engine
- **AND** code 6 SHALL identify fuel cell rather than ICE

#### Scenario: Reject an explicit invalid engine code

- **GIVEN** a BLK engine tag containing 99, an empty value or a fractional value
- **WHEN** conversion runs
- **THEN** it SHALL fail with the invalid code in its diagnostic
- **AND** it SHALL NOT substitute fusion
