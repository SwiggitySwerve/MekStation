## REMOVED Requirements

### Requirement: MTF Import Service

**Reason**: Owner ruling O2 retires the unused legacy service and its JSON-only helpers. Its import, validation and equipment-resolution scenarios no longer describe a supported service contract.

**Migration**: MTF source import uses `importMTFDefinition` behind `POST /api/units/import`. There are no live callers of the retired service to migrate.

## ADDED Requirements

### Requirement: Versioned portable unit documents

The canonical unit JSON Schema SHALL own the portable document version and its
generated reader. Saved editable designs SHALL write the current version from
one exported constant. Identity SHALL remain `(family, id)`; a family-less
reference SHALL mean BattleMech. The contract documentation SHALL describe all
families, field units, technology/year semantics, extensions and provenance.

#### Scenario: Legacy and compatible documents

- **WHEN** a unit document omits `schemaVersion`
- **THEN** the reader SHALL report version `1.0.0` without adding the field to the loaded record or rewriting catalogs
- **WHEN** its version is any strict `1.MINOR.PATCH` string
- **THEN** the reader SHALL accept and retain that version
- **AND** minor changes SHALL introduce only additive optional fields
- **AND** breaking changes SHALL require a different major

#### Scenario: Unsupported or malformed version

- **WHEN** a document declares another major or violates `MAJOR.MINOR.PATCH` syntax
- **THEN** validation SHALL reject it with the found version and supported major
- **AND** leading zeros, prerelease and build suffixes SHALL be rejected
- **AND** combat projection SHALL reject an invalid document version before stripping library metadata

#### Scenario: Save and recorded combat compatibility

- **WHEN** any supported editable family is saved
- **THEN** its document SHALL carry the current `schemaVersion`
- **AND** the field SHALL NOT enter recorded combat snapshots
- **AND** the exact 21-key BattleMech construction and recorded bytes SHALL remain unchanged

#### Scenario: Explicit legacy migration and generated examples

- **WHEN** a consumer explicitly migrates an unversioned or current legacy document
- **THEN** one version-keyed owner SHALL normalize older armor/BAR layouts and remove retired turret mass caches without changing points or live turret configuration
- **AND** it SHALL preserve unknown extensions, refuse conflicting identities/facts and reject unsupported majors before migration
- **AND** a family-less reference SHALL mean BattleMech while non-Mech references SHALL carry family
- **WHEN** the committed examples are regenerated from real catalog designs through the serializers
- **THEN** one example per family SHALL validate, round-trip and reproduce deterministically
- **AND** the capital example SHALL use document serialization without adding capital editing

#### Scenario: Independent consumer conformance

- **WHEN** a reader built only from the contract document and JSON Schema reads every committed catalog record and example
- **THEN** each SHALL conform with its `(family, id)` identity, and an absent version SHALL read as `1.0.0` without adding the field
- **AND** battle armor tonnage SHALL remain a nominal trooper count, and missing, stored, complete and defensive-only BV SHALL stay distinct
- **AND** the reader SHALL import no application loader or converter, and its tests SHALL run in CI

### Requirement: Immutable source inventory

The conversion boundary SHALL enumerate the pinned source tree independently of working-tree edits and directory-based family assumptions. It SHALL retain repository identity, resolved commit, relative path, format, Git blob identity and SHA-256 for each source definition, and explicitly list other entries. An inventory SHALL NOT claim successful entity loading or numerical parity.

#### Scenario: Reproduce a dirty checkout's pinned inventory

- **GIVEN** a valid source commit and modified, deleted or untracked working files
- **WHEN** inventory runs twice against that commit
- **THEN** the ordered source records and content hashes SHALL match exactly
- **AND** equal filenames in different directories SHALL remain separate entries

#### Scenario: Retain an explicitly supplied repository identity

- **GIVEN** an immutable source commit from an upstream repository or a fork
- **WHEN** inventory runs with the caller's required repository identity
- **THEN** that identity SHALL be retained exactly without a hardcoded upstream default
- **AND** absent, empty or surrounding-whitespace identities SHALL fail
- **AND** the report SHALL NOT attest repository ownership or remote availability

#### Scenario: Discover all formats and preserve unknown entries

- **GIVEN** MTF, BLK, BFS, archive and other entries under the source root
- **WHEN** inventory runs
- **THEN** every entry SHALL be accounted for by path and format
- **AND** an unknown suffix SHALL remain visible instead of being discarded

#### Scenario: Fail an unusable source selection

- **GIVEN** a nonexistent commit, unreadable object or tree with no unit definitions
- **WHEN** inventory runs
- **THEN** it SHALL return a failure and useful diagnostic
- **AND** it SHALL NOT report empty coverage as success

### Requirement: Immutable inventory provenance producer

The Python producer SHALL build the existing immutable inventory from a local repository, full commit and required asserted repository identity, and emit a schema-validated source-provenance 1.0.0 document without catalog writes. The canonical JSON Schema SHALL decide representability; the adapter SHALL NOT normalize rejected identities or accept arbitrary inventory JSON.

#### Scenario: Preserve every inventoried source origin

- **GIVEN** a pinned tree with MTF, BLK and BFS sources, equal basenames, repeated bytes, CRLF bytes and non-source metadata
- **WHEN** the producer runs despite dirty working files
- **THEN** each inventory source row SHALL appear once in the original order with exact path/case, format, blob and original-byte SHA-256
- **AND** metadata files SHALL NOT become source rows
- **AND** an independent Node/Zod consumer SHALL accept the actual producer output without row loss

#### Scenario: Reject unsupported coverage and identities

- **GIVEN** an archive entry or an identity or path the canonical schema cannot represent
- **WHEN** the producer runs
- **THEN** it SHALL fail with a useful diagnostic and no partial JSON output
- **AND** archive diagnostics SHALL identify the unsupported container paths
- **AND** absent repository identity and non-full commits SHALL fail
- **AND** success SHALL NOT imply source recovery, entity loading or numerical parity

### Requirement: Family-aware loading and persistence

Browser and Node unit services SHALL load every upstream-loadable source family through a shared validated domain contract, preserve provenance, and save/reload custom designs with unchanged subtype and mount semantics. Canonical protection SHALL apply to every family. Unsupported local data SHALL produce diagnostics.

#### Scenario: Family-qualified definition loading

- **WHEN** a caller loads a canonical definition by family and id
- **THEN** the loader SHALL resolve that family through the shared family registry and return its validated, family-typed definition without creating editor state
- **AND** an omitted family SHALL mean `battlemechs`, preserving existing BattleMech definition and editor output
- **AND** `tomahawk-c` in `battlemechs` and `aerospace` SHALL resolve independently without renaming either id
- **AND** non-BattleMech source references SHALL retain family

#### Scenario: Definition and editor admission diagnostics

- **WHEN** loading encounters an unregistered family, absent family catalog, absent unit, unavailable source or invalid definition
- **THEN** it SHALL return `unknown-family`, `family-not-found`, `not-found`, `read-failed` or `invalid-definition`, respectively
- **AND** a definition whose unit type disagrees with its requested family SHALL fail as `invalid-definition`
- **AND** strict browser and Node canonical reads SHALL propagate indexed-file read and JSON errors so definition readers report `read-failed`, while unknown IDs remain `not-found`
- **AND** tolerant canonical reads SHALL retain null results for source failures, and a corrected source SHALL load on retry without clearing caches
- **WHEN** a valid definition has no registered store mapper
- **THEN** editor loading SHALL return `unsupported-store-family` without initializing equipment or creating a BattleMech store
- **AND** the customizer SHALL preserve the requested family and keep the load dialog open on failure

#### Scenario: Open a vehicle or aerospace unit from the library

- **GIVEN** the load dialog lists every family's catalog entries with their family name
- **WHEN** the user opens a Tank, VTOL, support vehicle, aerospace fighter, conventional fighter or small craft
- **THEN** editor loading SHALL map the definition through its family's registered store mapper
- **AND** the customizer SHALL register the result in the vehicle or aerospace store and open one tab of the unit's type, adding no tab type
- **AND** library save SHALL remain unavailable for that tab
- **AND** a DropShip, JumpShip, WarShip or Space Station SHALL map to a frozen read-only view and open one tab of its unit type without creating a store
- **AND** a battle armor or infantry unit SHALL keep the dialog open with copy that says why it cannot open, without suggesting a retry
- **AND** a BattleMech SHALL open exactly as before

#### Scenario: Load and clone a support aircraft

- **GIVEN** a FixedWingSupport definition with known equipment
- **WHEN** either canonical service loads it and a custom copy is saved/reloaded
- **THEN** its support construction family and all design facts SHALL survive
- **AND** its custom identity SHALL differ from its immutable source identity

#### Scenario: Preserve a local loading gap

- **GIVEN** a source definition the local domain cannot yet represent
- **WHEN** loading is attempted
- **THEN** the service SHALL identify the source and unsupported facts
- **AND** it SHALL NOT substitute a different family or default equipment

### Requirement: VTOL and SmallCraft source loading diagnostics

The BLK parser and registered VTOL/SmallCraft handlers SHALL distinguish source
loading from construction validation. Representable source tonnage and zero
movement SHALL survive loading even when existing construction checks reject
them. The handlers SHALL expose those checks through `validate`, and the loaded
unit's `isValid` and `validationErrors` SHALL agree with that result. Loading
success SHALL NOT certify upstream construction validity or numerical parity.
Existing armor, equipment, locations and derived formulas SHALL remain unchanged
by this boundary correction.

#### Scenario: Retain an upstream-loaded construction outlier

- **GIVEN** a pinned upstream-loaded VTOL above 30 tons or SmallCraft below 100 tons
- **WHEN** the BLK document is loaded through its registered handler
- **THEN** loading SHALL succeed with its original tonnage, armor and equipment
- **AND** existing construction tonnage errors SHALL remain visible

#### Scenario: Retain zero movement without certifying construction validity

- **GIVEN** a VTOL with zero cruise MP or SmallCraft with zero safe thrust
- **WHEN** its source is loaded
- **THEN** movement SHALL remain zero without a fabricated minimum
- **AND** construction validation SHALL retain its existing movement error

#### Scenario: Reject unusable numeric source fields

- **GIVEN** missing, malformed, nonfinite or negative movement, or malformed or nonfinite tonnage
- **WHEN** a VTOL or SmallCraft handler attempts to load the source
- **THEN** it SHALL fail with a field diagnostic rather than substitute zero
- **AND** missing required identity, unknown types and unsupported dispatch cases SHALL retain explicit outcomes

### Requirement: Native ProtoMek source projection

The existing BLK parser and ProtoMech handler SHALL admit native `ProtoMek`
sources. The source adapter SHALL preserve declared rules level, native chassis,
base movement, armor locations and main-gun topology. Successful loading SHALL
retain existing construction diagnostics without certifying numerical, equipment,
editor or persistence parity.

#### Scenario: Native configurations and engine rating

- **GIVEN** a native source with Biped, Quad or WiGE motion (including its Glider alias), compared case-insensitively
- **WHEN** the registered handler loads it
- **THEN** Quad and WiGE SHALL resolve to Quad and Glider regardless of tonnage
- **AND** Biped SHALL retain the existing Ultraheavy representation at 10 tons or more
- **AND** base movement and rules level SHALL survive, with engine rating from the existing chassis-aware owner
- **AND** an ignored engine tag SHALL NOT override that rating

#### Scenario: Armor locations and main-gun topology

- **GIVEN** five or six armor entries in Head, Torso, Right Arm, Left Arm, Legs, optional Main Gun order
- **WHEN** loading a source with asymmetric arms or no main-gun equipment
- **THEN** each armor value SHALL retain its location and a sixth entry SHALL indicate a main-gun mount even when zero
- **AND** export SHALL emit the same order and omit the sixth entry when no mount exists
- **AND** export SHALL include native motion and `ProtoMek` identity so reloading preserves these fields

#### Scenario: Invalid source and legacy compatibility

- **GIVEN** native missing or unsupported motion, unusable tonnage/cruise/jump, mixed or unknown technology, malformed armor or an armor count other than five or six
- **WHEN** loading is attempted
- **THEN** it SHALL fail with a field diagnostic without substituting a chassis or dropping an armor value
- **AND** zero cruise and construction-invalid tonnage SHALL retain their values when structurally representable
- **GIVEN** a legacy ProtoMech/Protomech document without native motion
- **WHEN** it is loaded
- **THEN** existing glider/quad flag precedence and omitted-speed default SHALL remain available
- **AND** an explicitly provided unsupported motion SHALL still fail
- **AND** every spelling SHALL reject missing, mixed or unknown technology with a diagnostic instead of defaulting to Inner Sphere or Clan

#### Scenario: Equipment or armor without a main-gun mount

- **GIVEN** five armor entries and Main Gun equipment in any supported ProtoMech spelling
- **WHEN** the handler loads the document
- **THEN** it SHALL retain the equipment with an explicit warning that the absent mount causes upstream to ignore it
- **GIVEN** store data with Main Gun equipment or nonzero Main Gun armor but no mount
- **WHEN** export is requested
- **THEN** it SHALL fail with a Main Gun diagnostic and no content rather than silently lose those fields
- **AND** source diagnostics and export rejection SHALL call the same construction-owner rule

### Requirement: ProtoMek source booster equipment

The BLK adapter SHALL derive undamaged ProtoMek booster state from the exact
equipment identities recognized by pinned MegaMek at 48fcb2f6. Existing raw
equipment records SHALL remain intact. Equipment legality and full mount
semantics SHALL remain distinct from the movement effect.

#### Scenario: Native identity and source location

- **WHEN** any of the six pinned misc equipment types carrying F_MASC is loaded in a source location that upstream visits
- **THEN** the handler SHALL set the booster flag and the running owner SHALL consume it without changing base Walk or engine rating
- **AND** exact internal, registered and display aliases SHALL be compared case-insensitively without fuzzy punctuation matching
- **AND** lookup SHALL use the source technology prefix and the pinned fallback (`Clan ` only for Clan Level 2, otherwise `IS `), including unqualified `Super Charger`
- **AND** case-variant equipment blocks SHALL use the first retained block, without claiming recovery of identical duplicate tags already overwritten by the shared parser
- **AND** a Main Gun block SHALL contribute no booster when no mount exists
- **AND** the separate myomerbooster tag SHALL NOT override equipment for any locally accepted ProtoMech spelling

#### Scenario: Equipment syntax and preserved records

- **WHEN** native rear-mount, size or shot-count syntax precedes lookup
- **THEN** the source adapter SHALL decode it before determining the equipment effect
- **AND** shot counts SHALL admit Java BMP decimal digits and ASCII signs within the nonnegative signed-32-bit range, retaining Java's rejection of supplementary digits
- **AND** unusable numeric suffixes SHALL return a structured equipment diagnostic rather than throw or silently activate equipment
- **AND** every processed entry SHALL be checked even if an earlier entry enables the booster
- **AND** original equipment names, strings and locations SHALL remain available without catalog regeneration

#### Scenario: Native whitespace and display case

- **WHEN** ProtoMek equipment contains boundary controls, Unicode whitespace or Unicode display-name case variants
- **THEN** parsing SHALL retain meaningful characters and interpretation SHALL use Java trimming and display-name matching
- **AND** comment preprocessing SHALL recognize CR, LF and CRLF and apply native trimming before discarding ProtoMek lines, including when UnitType follows equipment
- **AND** Unicode-padded hash entries SHALL remain equipment and malformed suffixes SHALL fail even before or after a valid booster
- **AND** registered aliases SHALL retain their distinct lookup semantics, so `MAſC` matches but `CLMAſC` does not
- **AND** a successful export SHALL preserve the same native booster effect; native-invalid size whitespace SHALL fail without content
- **AND** other unit families SHALL retain their existing parser behavior

#### Scenario: Corpus and round-trip evidence

- **WHEN** all 86 pinned ProtoMek sources are loaded and exported through the existing service adapter
- **THEN** booster state and running movement SHALL match actual pinned Java observations, including the five previously missed boosters
- **AND** unchanged source fields, exports and reloaded equipment SHALL be checked separately from changed local BV terms
- **AND** direct editor flags without corresponding equipment, production source-to-store flows, equipment legality, damage and complete BV SHALL remain explicitly unverified

### Requirement: ProtoMek booster export integrity

The BLK exporter SHALL refuse a declared booster state that its emitted
equipment cannot retain on reload, using the source equipment owner and the
writer's shared projection. It SHALL NOT silently synthesize or remove mounts.

#### Scenario: Flag and emitted equipment disagree

- **WHEN** the booster flag differs from the effect of the emitted equipment blocks
- **THEN** export SHALL fail with a booster/equipment diagnostic and no content
- **AND** input equipment, movement, stored BV and persistence SHALL remain untouched
- **AND** omitted locations SHALL NOT count toward the emitted effect
- **AND** the decoder SHALL use the exact technology declaration emitted by the exporter
- **AND** equipment normalized from an ignored source location SHALL NOT silently gain a booster effect through export and reload
- **AND** the existing absent Main Gun rejection SHALL remain enforced

#### Scenario: Unrepresentable equipment text

- **WHEN** an emitted equipment name contains a line break or angle bracket, or its native numeric suffix is malformed
- **THEN** export SHALL fail with a structured equipment diagnostic and no content
- **AND** suffix interpretation SHALL use the same source decoder as loading

#### Scenario: Consistent export retains its effect

- **WHEN** the declared booster and representable emitted equipment agree
- **THEN** existing export bytes SHALL remain unchanged and reload SHALL preserve the booster effect and base Walk
- **AND** native derived Run SHALL be compared separately from arbitrary legacy saved flank values
- **AND** all 86 pinned source exports and representative successful equipment projections SHALL be reloaded by pinned Java
- **AND** full equipment topology, legality, numerical parity and production editor/save workflows SHALL remain open work

### Requirement: ProtoMek equipment source syntax

ProtoMek mounts SHALL retain optional original BLK syntax from the shared source
decoder, separate from current equipment identity and normalized location.
Metadata SHALL describe the parsed entry rather than claim resolved native
equipment, effective ammunition state, native placement or full file bytes.

#### Scenario: Preserve parsed source qualifiers

- **WHEN** a retained equipment entry is loaded through any accepted ProtoMek spelling
- **THEN** its source metadata SHALL retain the exact parsed block key and entry string, stripped lookup name, explicit shot count, explicit size and presence of this entry's uppercase rear prefix
- **AND** absent qualifiers SHALL remain distinguishable from explicit zero
- **AND** source order, duplicate entries and existing equipment names/IDs SHALL remain unchanged
- **AND** the existing decoder's Java whitespace, Unicode decimal digits, suffix order and diagnostic policy SHALL remain unchanged

#### Scenario: Preserve unvisited diagnostics

- **WHEN** a retained block is ignored by native booster interpretation
- **THEN** syntax diagnostics for its entries SHALL remain available in source metadata without changing existing unit admission
- **AND** visited malformed entries SHALL still fail with the existing diagnostic exactly once

#### Scenario: Typed projection and persistence

- **WHEN** a loaded mount is projected into the handler or store BV shape, saved and rehydrated
- **THEN** its original source metadata SHALL survive without changing numerical results
- **AND** legacy/editor-created mounts without metadata SHALL remain supported
- **WHEN** a current mount name or location is edited
- **THEN** export SHALL use that current value while retaining original metadata as provenance
- **AND** representable BLK export/reload SHALL retain the emitted source syntax

#### Scenario: Native observations and remaining boundaries

- **WHEN** explicit shot and variable-size values are verified
- **THEN** tests SHALL compare them to actual pinned Java loaded mounts
- **AND** unknown identities, Body remapping, effective rear/facing state, implicit ammunition, general handler serialization, production import/edit/save flows and complete equipment/BV parity SHALL remain separate required work

### Requirement: Read-only unit detail quirk summaries

Canonical and saved unit detail pages SHALL share read-only quirk presentation. Existing unit badges SHALL retain their raw IDs, ordering, repeats, colors, spacing and empty-state behavior. Optional weapon-quirk maps SHALL use the canonical unit contract and display each nonempty source locator with every stored quirk ID, preserving unknown IDs, distinct locators and repeated entries. Display SHALL NOT infer editor mount identity or certify gameplay effects.

#### Scenario: Committed family maps

- **GIVEN** committed aerospace, capital or vehicle weapon-quirk maps
- **WHEN** canonical detail or saved detail renders their fields
- **THEN** every source key is shown verbatim in source order with its complete quirk list
- **AND** location, slot and weapon-name text is not replaced by a guessed live mount identity

#### Scenario: Unknown IDs and repeated source entries

- **GIVEN** unknown unit or weapon quirk IDs, repeated IDs, distinct source locators or legacy name-only keys
- **WHEN** the summary renders
- **THEN** all raw strings and repeated entries remain visible under their original source keys

#### Scenario: Optional saved metadata

- **GIVEN** missing or empty quirk fields, or a malformed optional saved weapon-quirk map
- **WHEN** saved detail projects those fields
- **THEN** a missing or empty summary adds no card and a malformed map adds no weapon list
- **AND** valid unit badges remain unchanged and the persisted payload is not modified
- **AND** editor retention, mount editing, print output and gameplay effects remain separate obligations

### Requirement: Legacy MTF importer retirement

The system SHALL retire the unused `IMTFImporter` interface and `MTFImportService`, including their exports and `services.conversion.importer` registry entry. MTF source import SHALL continue through `importMTFDefinition` behind `POST /api/units/import`.

#### Scenario: Registry access after retirement

- **WHEN** a consumer accesses the service registry
- **THEN** it SHALL NOT expose the legacy conversion importer
- **AND** the remaining persistence, equipment, unit, construction and pilot services SHALL resolve through their existing factories
- **AND** service initialization and shutdown SHALL retain their existing persistence and equipment behavior

#### Scenario: Existing source import and detector compatibility

- **WHEN** the legacy runtime-object importer is retired
- **THEN** the live MTF parser, source import API and saved unit formats SHALL remain unchanged
- **AND** the legacy generic-detector MTF bucket SHALL retain its existing classification and filtering behavior

### Requirement: Direct MTF source import API

The unit import API SHALL accept explicit MTF source text, use the existing MTF parser and shared family-aware definition admission, and persist accepted BattleMech definitions as custom units without changing native parser or construction rules. Existing JSON import behavior SHALL remain available.

#### Scenario: Import and reload original source facts

- **GIVEN** a representable MTF source submitted as `sourceFormat: mtf` and `sourceText`
- **WHEN** the API imports the source
- **THEN** it SHALL allocate a custom identity and persist the validated definition with its original source text, parsed identity, construction fields, mounts and diagnostics
- **AND** the saved definition SHALL reload through the existing family-aware contract with an omitted family meaning BattleMech
- **AND** a name conflict SHALL return 409 without overwriting an existing unit

#### Scenario: Source failure and structural admission

- **WHEN** source text is absent, malformed or contains a fact the existing definition contract cannot represent
- **THEN** the API SHALL return client diagnostics, retain parser warnings and create no saved unit
- **AND** successful structural admission SHALL NOT certify construction validity, equipment completeness or numerical parity
- **AND** malformed request bodies and unsupported source formats SHALL return 400
- **AND** BLK import and browser file selection SHALL remain separate obligations

#### Scenario: Browser MTF selection, drop and conflict rename

- **WHEN** a user selects or drops a `.mtf` file in the existing import dialog
- **THEN** the dialog SHALL use `importMTFDefinition` and the source import API, retain source diagnostics and warnings, and clear an earlier preview if the next file is rejected
- **AND** existing JSON selection, drop and import behavior SHALL remain available
- **WHEN** a name conflict is retried with a nonempty alternate variant
- **THEN** the API SHALL allocate a new custom identity with that trimmed variant in both the saved model and variant fields, retaining the original source text and existing saved unit unchanged
- **AND** invalid alternate variants SHALL return 400 without persistence
- **AND** BLK import SHALL remain open work

#### Scenario: ProtoMech-only BLK source API import

- **WHEN** BLK source text is submitted to the existing unit import API
- **THEN** only ProtoMechs SHALL be admitted through the existing BLK parser, ProtoMech handler and shared family-aware structural validation
- **AND** other BLK families SHALL receive explicit unsupported-type diagnostics without persistence
- **AND** an admitted record SHALL retain family, custom identity, armor, movement and ordered mounts through API persistence and reload, with original text, parsed document and full handler facts retained in its source snapshot
- **AND** construction-invalid but structurally loadable records SHALL retain their facts and diagnostics without a new validity gate, and native blank model names SHALL remain blank
- **AND** malformed source SHALL fail with diagnostics without persistence; existing MTF/JSON behavior SHALL remain available
- **AND** other BLK families, browser BLK selection and native numerical parity SHALL remain separate obligations

### Requirement: Mounted browser unit import

The unit library SHALL expose file selection and drop for JSON, MTF and BLK through
the existing file and API client services. Native admission SHALL remain with the
source import API. Unsupported families, malformed source and server failures SHALL
retain diagnostics with a file replacement or retry action. Successful imports SHALL
refresh the library and preserve the saved identity for existing editor loading.

#### Scenario: Request ownership and terminal completion

- **WHEN** selections or conflict suggestions complete out of order
- **THEN** only the current request SHALL update its payload and rename suggestion
- **AND** duplicate clicks and Enter SHALL NOT duplicate an in-flight or successful POST
- **WHEN** the dialog closes and reopens
- **THEN** prior selections, errors, suggestions and completions SHALL NOT enter the new session

#### Scenario: Accessible import and persisted loading

- **WHEN** a user opens the mounted import dialog
- **THEN** its file input SHALL have a label, keyboard focus SHALL remain within the modal, and closing SHALL restore focus
- **WHEN** supported pinned MTF and vehicle BLK files are imported
- **THEN** both SHALL appear in the library after reload and an imported unit SHALL open through existing customizer loading

### Requirement: Native OmniMek mounted equipment pod metadata

SHALL derive pod metadata for every represented mount type on an explicitly
declared OmniMek from that mount's native critical-slot token using one shared
token decoder. MUST retain explicit saved true and false values, use fixed when
source evidence is missing, and preserve Java suffix order and mount visitation.
SHALL preserve existing load, save/reopen fingerprints and BV for units whose
Omni declaration is absent or false. MUST leave equipment discovery unchanged.

#### Scenario: Ordinary and recovered Omni mounts retain source pod flags

- **GIVEN** a declared OmniMek with represented ranged, physical, ammunition,
  miscellaneous and heat-sink mounts
- **WHEN** the loader reconstructs their native critical allocations
- **THEN** each flag SHALL match its pinned Java mount
- **AND** editor movement and removal locks SHALL use that same loaded flag
- **AND** split/spread and duplicate mounts SHALL follow their own critical cells

#### Scenario: Saved flags and legacy declarations survive reopening

- **GIVEN** explicit saved pod booleans, including false, or a legacy unit without
  an Omni declaration
- **WHEN** loaded, saved and reopened
- **THEN** explicit booleans SHALL retain their values
- **AND** legacy units SHALL retain their existing loaded and saved bytes and BV
- **AND** existing literal save-fingerprint expectations SHALL NOT be regenerated
