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
