## ADDED Requirements

### Requirement: Capital BLK source definitions

The capital converter SHALL load pinned JumpShip, WarShip and SpaceStation
sources in addition to DropShips. It SHALL preserve tonnage, structural
integrity, original fuel, safe thrust, armor type and source armor by Java
location, equipment lines including broadside locations, crew and grav decks.
Recognized sources missing a Java-required tag or using an unknown armor code
SHALL fail conversion. The command SHALL require an explicit output directory.
Catalog publication, BV, construction weights and gameplay remain separate work.

#### Scenario: Six armor arcs and broadside equipment

- **GIVEN** a pinned WarShip BLK with six armor values and broadside equipment
- **WHEN** the capital converter loads it
- **THEN** armor SHALL follow nose, front left, front right, aft, aft left, aft right
- **AND** broadside equipment SHALL retain separate left and right locations
- **AND** Hull and broadsides SHALL NOT acquire invented armor values

#### Scenario: Loader-specific defaults and primitive drive facts

- **GIVEN** JumpShip, WarShip and SpaceStation sources
- **WHEN** the capital converter loads them
- **THEN** JumpShip and Station SHALL use zero safe thrust and civilian defaults
- **AND** WarShip SHALL require SafeThrust and default to military
- **AND** all three SHALL use AERODYNE motion and the Java ICE runtime placeholder
- **AND** WarShip SHALL preserve explicit kf_core and jump_range, including primitive cores
- **AND** sail, lithium-fusion, docking collars and legacy/explicit grav decks SHALL follow their pinned loaders

#### Scenario: Existing DropShip output remains stable

- **GIVEN** all 209 pinned DropShip sources
- **WHEN** converted before and after this extension
- **THEN** serialized definition bytes SHALL remain identical

Authority: MegaMek `48fcb2f6` BLKJumpshipFile, BLKWarshipFile,
BLKSpaceStationFile and Jumpship/Warship/SpaceStation constructors;
mm-data `50f7efef`. Historical primitive JumpShips may load as Java Warship.

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

#### Scenario: Source mount ownership moves without changing loaded designs

- **GIVEN** existing source equipment with recovered physical mounts, aliases and shared critical entries
- **WHEN** mount grouping and physical formula facts move to their owning modules
- **THEN** loaded equipment values, order, positions and qualifiers SHALL remain unchanged
- **AND** existing admission guards and spread-mount anchoring SHALL remain unchanged until a separately verified behavior change

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

### Requirement: Vehicle catalog source qualifiers

The Python vehicle converter and generated unit contract SHALL preserve explicit
Omni identity, base-chassis turret, second-turret, sponson/pintle and fire-control
weights, transporter records, fuel quantity and type, trailer identity, independent
Clan-engine context, structural/engine/armor tech-rating indices and internal type.
Omitted qualifiers SHALL remain omitted. Zero quantities, false Clan-engine flags
and internal-type sentinel -1 SHALL survive schema validation and JSON round trips.
These are source facts; their presence SHALL NOT imply construction validity.

#### Scenario: Qualifier-bearing vehicle crosses the catalog boundary

- **GIVEN** one of the six pinned vehicle qualifier fixtures
- **WHEN** it is converted, written through the schema gate and read through UnitContract
- **THEN** every explicit qualifier SHALL retain its value and transporter order
- **AND** transport capacity, doors, bay identity and other colon-delimited qualifiers SHALL remain intact

#### Scenario: Source presence and units remain explicit

- **GIVEN** BLK omni/trailer presence markers and explicit clan_engine false
- **WHEN** vehicle qualifiers are converted
- **THEN** isOmni/isTrailer SHALL indicate tag presence and clanEngine SHALL remain false
- **AND** support fuel and base-chassis weights SHALL retain source tons without rounding
- **AND** absent tags SHALL NOT acquire inferred chassis-tech defaults

LargeSupportTank and FixedWingSupport discovery remains in UL-05. Qualifier
extraction covers their source tags without claiming complete converted documents.

### Requirement: Aerospace catalog source qualifiers

The Python aerospace converter and generated unit contract SHALL preserve explicit
Omni identity, pod heat-sink counts, ordered transporter records, independent
Clan-engine flags and per-arc armor source codes. Common vehicle/aerospace fields
SHALL have one extraction rule and one schema definition. Missing qualifiers SHALL
remain absent; zero, false and empty transporter lists SHALL survive round trips.

#### Scenario: Aerospace qualifiers cross the catalog boundary

- **GIVEN** one of the eight pinned aerospace qualifier fixtures
- **WHEN** converted, written through the schema gate and read through UnitContract
- **THEN** explicit qualifiers and transporter order SHALL survive unchanged
- **AND** armor.typeByArc SHALL preserve integer source codes, including -1, keyed by normalized source location
- **AND** armor.byArc SHALL continue to carry armor points separately

#### Scenario: Aerospace armor is distinguished from support BAR armor

- **GIVEN** armor code 41 or a support BAR code 43 through 51
- **WHEN** the aerospace converter creates its catalog document
- **THEN** code 41 SHALL become AEROSPACE, and support BAR codes SHALL become BAR
- **AND** barRating SHALL come only from an explicit barrating tag
- **AND** code 7 SHALL retain PATCHWORK alongside its explicit per-arc codes

Catalog hydration, construction validity, equipment/export and BV remain open.

### Requirement: MTF source rules-level numbering

The Python MTF converter SHALL decode numeric source rules levels using the
one-based pinned mapping: 1 Introductory, 2 Standard, 3 Advanced, 4 Experimental
and 5 Unofficial. The existing shared enum table SHALL own this mapping.
Existing named aliases and the legacy zero alias SHALL retain their values.
Correcting this field SHALL NOT change other serialized unit facts or BV results.
This correction SHALL NOT regenerate shipped unit catalogs.

#### Scenario: Javelin retains its box-set source level

- **GIVEN** the pinned Javelin JVN-10U source with `rules level:1`
- **WHEN** the Python MTF converter produces the serialized unit
- **THEN** `rulesLevel` SHALL be `INTRODUCTORY`
- **AND** its other serialized source facts SHALL remain unchanged

#### Scenario: Other valid source levels retain their meaning

- **GIVEN** an Inner Sphere source with level 1 through 5 or a Clan or Mixed source with level 2 through 5
- **WHEN** the Python MTF converter reads its numeric rules level
- **THEN** the serialized value SHALL match pinned `MtfFile.java:828-902`
- **AND** existing named aliases SHALL NOT acquire a numeric offset

Authority: MegaMek `48fcb2f64` `MtfFile.java:828-902`, `Mek.java:5205-5207`
and `TechConstants.java:104-106`; MegaMekLab `62bf193` `UnitUtil.java:2001-2002`.

### Requirement: FrankenMek donor structure metadata

Both MTF importers SHALL preserve explicit per-location structure types in the
optional `structure.typeByLocation` map alongside existing donor tonnages.
Canonical structure identities and location names SHALL share schema definitions.
An absent map SHALL preserve legacy global-structure behavior; old documents
SHALL remain readable without adding inferred donor types.

#### Scenario: Typed donors cross the import boundary

- **GIVEN** a FrankenMek with IS and Clan donor structures
- **WHEN** either importer reads the native MTF
- **THEN** the donor types and tonnages SHALL survive schema validation
- **AND** unprefixed types SHALL use the chassis tech base while explicit qualifiers retain their identity
- **AND** an unknown explicit native type SHALL fail with its location and spelling

#### Scenario: Missing donor declarations and old documents

- **GIVEN** missing or scalar Hybrid donor declarations
- **WHEN** imported
- **THEN** their omitted type entries SHALL retain native Standard defaults
- **AND** existing tonnage payloads SHALL remain unchanged
- **GIVEN** an old document without `typeByLocation`
- **WHEN** validated
- **THEN** the map SHALL remain absent and its existing structure data SHALL remain unchanged

### Requirement: FrankenMek donor metadata persistence

The BattleMech editor SHALL preserve explicit structure donor types and tonnages
through loading, draft persistence, custom-library serialization, reopening,
duplication and undo/redo. Each boundary SHALL own copies of both donor maps.
Missing donor maps SHALL remain absent; an explicit empty map SHALL remain
present. Retaining these facts SHALL NOT change construction mass, BV or
construction validity before the section-weighted mass rule is enabled.

#### Scenario: Save and reopen donor structure facts

- **GIVEN** an imported FrankenMek with explicit donor types and tonnages
- **WHEN** its editor saves to the custom library and a cold session reopens it
- **THEN** both donor maps SHALL retain their values and presence
- **AND** the calculation configuration SHALL survive the round trip
- **AND** modifying an input, duplicate or serialized map SHALL NOT mutate the source editor

#### Scenario: Replace global material and undo donor edits

- **GIVEN** an editor retaining explicit donor facts
- **WHEN** its global structure material is explicitly replaced
- **THEN** donor overrides SHALL be cleared
- **AND** undo SHALL restore them and redo SHALL clear them again
- **GIVEN** an edit that adds donor metadata to a legacy editor
- **WHEN** undone
- **THEN** metadata SHALL return to absence and the clean draft state SHALL be restored
- **AND** edits to either donor map SHALL participate in draft and library fingerprints

#### Scenario: Old and empty donor documents remain distinct

- **GIVEN** a global-only, tonnage-only or explicitly empty donor-type map
- **WHEN** loaded, saved and reopened
- **THEN** the type map SHALL NOT be inferred or removed
- **AND** existing global mass arithmetic SHALL remain unchanged

### Requirement: Consistent structure calculation context

The BattleMech editor and construction validation projections SHALL forward
effective configuration and optional FrankenMek donor metadata to the existing
structure mass owner. Adding this context SHALL preserve existing arithmetic
until the section-weighted mass rule is enabled separately.

#### Scenario: All editor consumers retain structure context

- **GIVEN** an editor unit with effective configuration and explicit donor metadata
- **WHEN** editor statistics, Overview, the Structure tab or weight validation calculates mass
- **THEN** each consumer SHALL pass both facts through the shared calculation hook to the structure mass owner
- **AND** a metadata-only edit SHALL refresh each consumer's calculation input

#### Scenario: Public construction and validation callers forward context

- **GIVEN** optional structure context supplied to a construction or validation weight calculation
- **WHEN** the aggregate, structure step or public structure lookup calls the mass owner
- **THEN** the supplied context SHALL reach that owner without changing component arithmetic or unknown-type admission checks

#### Scenario: Context forwarding preserves legacy results

- **GIVEN** an existing design with or without donor metadata
- **WHEN** the context-forwarding change is applied without enabling the native mass rule
- **THEN** component weights, Battle Value and construction validity SHALL remain unchanged
- **AND** absent donor metadata SHALL remain absent

### Requirement: OmniMek source facts

The MTF converter SHALL preserve the three OmniMek facts of a BattleMech source as
optional unit fields: `isOmni` (true exactly when the `Config:` value contains
`Omni`), `baseChassisHeatSinks` (the integer of the `base chassis heat sinks:` line
exactly as written, `-1` meaning unspecified) and `clanName` (the `clanname:` text,
on Inner Sphere and Clan chassis alike). The unit contract SHALL declare
`baseChassisHeatSinks` and `clanName` as optional, so a unit without them SHALL
remain valid. A non-Omni source SHALL NOT gain `isOmni`, and a derived effective
heat-sink value SHALL NOT overwrite the stored source value. An unparsable
`base chassis heat sinks:` value SHALL fail the conversion with the offending value.

#### Scenario: Omni facts survive conversion

- **GIVEN** a `Config:Quad OmniMek` source with `base chassis heat sinks:8`, `heat sinks:12` and `clanname:Howler`
- **WHEN** it is converted
- **THEN** `isOmni` SHALL be true, `baseChassisHeatSinks` SHALL be 8 and `clanName` SHALL be `Howler`
- **AND** the heat-sink count SHALL remain 12

#### Scenario: Non-Omni sources and old documents

- **GIVEN** a `Config:Biped` source without the lines, or a document that predates the fields
- **WHEN** converted or validated
- **THEN** none of the three fields SHALL be added or required
- **GIVEN** a non-Omni source with a `clanname:` line
- **WHEN** converted
- **THEN** `clanName` SHALL be retained and `isOmni` SHALL remain absent

#### Scenario: Saved documents and malformed sources

- **GIVEN** a custom mech saved with the default `baseChassisHeatSinks` of `-1`
- **WHEN** validated against the contract
- **THEN** it SHALL be accepted
- **GIVEN** a source whose `base chassis heat sinks:` value is not an integer
- **WHEN** converted
- **THEN** the conversion SHALL fail naming the value instead of omitting the fact

Authority: MegaMek `48fcb2f64` `MtfFile.java:326`, `:358-359`, `:371`, `:601-606`,
`:1717-1718` and `:1745-1746`; `Engine.java:1307-1320`.
