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
