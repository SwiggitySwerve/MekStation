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

The TypeScript conventional-fighter handler SHALL decode the same serialized identities through the shared fact table, preserve the raw code and independent `clan_engine` context, and reject identities absent from its typed model with a diagnostic. Its omitted tag SHALL default to fusion. The TypeScript SmallCraft handler SHALL use serialized ICE identity 1 for the upstream runtime placeholder regardless of the ignored tag and identify the raw ignored value in a warning. This placeholder SHALL NOT imply construction validity.

Python and TypeScript SHALL consume one serialized-code fact table. TypeScript vehicle and aerospace export SHALL write ICE as 1, both XL variants as 2, fuel cell as 6, and reject unknown domain engine identities. XL export SHALL explicitly write `clan_engine` so an opposite-tech chassis reloads the same construction context. Combat vehicle weight SHALL decode serialized identity before calling the existing engine construction owner; it SHALL NOT treat source codes as weight-table ordinals.

Pinned authority: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`, `BLKFile.java:80-93,538-568`, `BLKTankFile.java:139-162`, `BLKConvFighterFile.java:102-122`, `BLKProtoMekFile.java:93-95`, `BLKSmallCraftFile.java:147-152`, `SmallCraft.java:129-130` and `Engine.java:92-93,396-450`. Runtime engine ordinal 0 is ICE; serialized BLK ICE is code 1.

TypeScript engine-tag readers SHALL reject explicit malformed or unknown codes at the parser/handler boundary. ProtoMek SHALL ignore its tag; SmallCraft hydration SHALL identify the ignored tag and use the ICE runtime placeholder, without claiming construction validity. Generic MTF aliases SHALL remain unchanged. LargeSupportTank discovery, complete family hydration, non-XL mixed-engine export flags and full serialization through generic handler persistence APIs remain under tasks 2.1/3.2/3.3. TypeScript ignored-tag tests cover existing `ProtoMech`/`Protomech` aliases; native `ProtoMek`, FixedWingSupport and LargeSupportTank discovery remain unsupported before engine decoding.

The source-format number/name definitions SHALL be owned by
`src/types/formats/blk-engine-codes.json`, a language-neutral table consumed by
the Python decoder. Moving those definitions SHALL preserve complete converter
outputs, ignored-tag behavior, malformed-code diagnostics and generic MTF aliases.
`blkEngineIdentity.ts` adapts the same facts to the existing TypeScript models.
Raw document codes SHALL remain distinct from normalized construction engine types.

#### Scenario: Conventional fighter engine identity and technology

- **GIVEN** a conventional fighter with a represented BLK engine code or an omitted tag
- **WHEN** the TypeScript handler loads it
- **THEN** the typed engine SHALL match the shared serialized identity, with fusion as the omitted-tag default
- **AND** an explicit Clan-engine flag SHALL override chassis technology independently
- **AND** an unrepresentable or unknown code SHALL fail with a code diagnostic rather than substitute ICE

#### Scenario: Explicit malformed conventional fighter engine tag

- **GIVEN** raw conventional-fighter BLK with an empty, nonnumeric, fractional or numeric-prefix engine tag
- **WHEN** the public parser and TypeScript handler load it
- **THEN** the parser/handler boundary SHALL reject it with an engine-tag diagnostic
- **AND** only an omitted tag SHALL use the fusion default; typed documents without raw tags SHALL retain their numeric-code validation

#### Scenario: SmallCraft ignored engine tag

- **GIVEN** a SmallCraft document with an omitted, known, unknown or malformed engine tag
- **WHEN** the TypeScript handler loads it
- **THEN** its engine identity SHALL be the ICE runtime placeholder
- **AND** a warning SHALL preserve the ignored raw value without asserting construction validity

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

#### Scenario: Validate engine tags for recognized BLK Mek spellings

- **GIVEN** a native Mek document or an existing BattleMech or IndustrialMech parser alias
- **WHEN** its explicit engine tag is empty, fractional, malformed or unknown
- **THEN** the TypeScript parser SHALL reject it with an engine-tag diagnostic
- **AND** known codes SHALL remain intact and an omitted tag SHALL remain distinguishable for family default handling

Authority: pinned `MekFileParser.java:242` and `BLKMekFile.java:128-132`.
BattleMech and IndustrialMech are local aliases; this scenario does not claim
upstream discovery of those spellings or complete Mek hydration from BLK.

#### Scenario: TypeScript export and reload preserve engine identity

- **GIVEN** ICE, fuel cell or XL on an opposite-tech chassis
- **WHEN** the actual BLK exporter, parser and family handler reload the result
- **THEN** ICE SHALL use code 1, fuel cell code 6 and XL code 2
- **AND** XL construction context SHALL follow the explicit clan-engine flag

#### Scenario: Conventional model cannot represent a loaded engine

- **GIVEN** a conventional fighter source with XL, XXL, light, compact, none, steam or external engine
- **WHEN** its typed handler hydrates the document
- **THEN** it SHALL fail with the source engine code in a diagnostic
- **AND** the generic BLK document SHALL retain the known source code

### Requirement: Explicit absent combat-vehicle engine boundary

The BLK vehicle adapter SHALL preserve known NONE as explicit engine absence,
independent of trailer identity, while rejecting unknown or unsupported codes.
The installed-engine mass owner SHALL return zero for absence before installed
engine weight rules. The editor store remains limited to installed engines. Loaded Tank and
conventional-fighter entities SHALL retain independent engine Clan context,
including explicit overrides opposite to chassis technology.

#### Scenario: Zero cruise engine and trailer cross-product

- **GIVEN** a Tank with zero cruise and either trailer flag
- **WHEN** engine_type is fusion 0 or ICE 1
- **THEN** rating is 10
- **WHEN** engine_type is NONE 8
- **THEN** rating and installed engine mass are zero and raw code 8 is retained

#### Scenario: Positive cruise with explicit absence

- **GIVEN** a Tank with NONE and positive cruise
- **WHEN** loaded through the BLK handler
- **THEN** the loader-derived rating is retained, installed engine mass is zero,
  and construction validation separately reports the absent propulsion engine
