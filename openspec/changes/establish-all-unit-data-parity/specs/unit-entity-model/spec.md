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

The Python catalog adapters SHALL decode engine tags only for supported families whose upstream loaders read them. These readers SHALL share one decoder with the source-format meanings: 0 fusion, 1 ICE, 2 XL, 3 XXL, 4 light, 5 compact, 6 fuel cell, 7 fission, 8 none, 9 maglev, 10 steam, 11 battery, 12 solar and 13 external. Generic MTF numeric aliases SHALL retain compatibility semantics. For these readers, an omitted tag MAY retain the legacy fusion default; explicit unknown, malformed or empty codes SHALL fail with a diagnostic. Technology flags remain separate source facts.

ProtoMek conversion SHALL use fusion regardless of the ignored tag. SmallCraft conversion SHALL retain the upstream ICE runtime placeholder regardless of the tag, and SHALL identify that placeholder in a diagnostic rather than treating it as construction-validity evidence. Ignored nondefault ProtoMek tags and SmallCraft tags SHALL remain visible with the source path and raw value in diagnostics. Original-byte retention belongs to source inventory and provenance.

This slice does not establish TypeScript BLK export or hydration correctness. The conflicting maps in `BlkExportServiceCore.formatters.ts`, `VehicleUnitHandler.ts` and `ConventionalFighterUnitHandler.ts` remain explicit tasks 2.1/3.2 gaps. LargeSupportTank discovery and other unsupported families remain under the all-family loading requirement.

The source-format number/name definitions SHALL be owned by
`src/types/formats/blk-engine-codes.json`, a language-neutral table consumed by
the Python decoder. Moving those definitions SHALL preserve complete converter
outputs, ignored-tag behavior, malformed-code diagnostics and generic MTF aliases.
This extraction prepares TypeScript caller consolidation; it does not correct
the three remaining TypeScript maps identified above.

#### Scenario: Shared definitions preserve existing conversion

- **GIVEN** supported converter inputs covering omitted tags and codes 0 through 13
- **WHEN** the Python decoder reads the shared table from any working directory
- **THEN** complete converted documents SHALL equal the pre-extraction outputs
- **AND** the definitions SHALL resolve relative to the module, not the caller's directory

#### Scenario: Decode families whose loaders read the tag

- **GIVEN** supported Tank, VTOL, SupportTank, SupportVTOL, Aero, AeroSpaceFighter, ConvFighter or FixedWingSupport definitions with engine code 1
- **WHEN** the Python source adapter converts them
- **THEN** each SHALL identify an ICE engine
- **AND** code 6 SHALL identify fuel cell rather than ICE

#### Scenario: Preserve ignored-tag loader behavior

- **GIVEN** ProtoMek and SmallCraft definitions with engine code 1, 2, 99 or an omitted tag
- **WHEN** the Python source adapter converts them
- **THEN** ProtoMek SHALL identify fusion and SmallCraft SHALL identify its upstream ICE placeholder
- **AND** an ignored code SHALL NOT fail engine decoding or change the loaded engine type

#### Scenario: Reject an explicit invalid engine code

- **GIVEN** a supported engine-tag reader with a BLK tag containing 99, an empty value or a fractional value
- **WHEN** conversion runs
- **THEN** it SHALL fail with the invalid code in its diagnostic
- **AND** it SHALL NOT substitute fusion

#### Scenario: Reject a batch before replacing catalog files

- **GIVEN** a batch with a valid source followed by an invalid engine code
- **WHEN** source conversion fails
- **THEN** the diagnostic SHALL name the failing source path and code
- **AND** no unit or manifest files SHALL have been written by that batch
