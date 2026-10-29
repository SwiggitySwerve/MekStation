## ADDED Requirements

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

- **GIVEN** a native source with Biped, Quad or WiGE motion, compared case-insensitively
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
