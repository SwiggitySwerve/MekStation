## ADDED Requirements

### Requirement: Immutable source inventory

The conversion boundary SHALL enumerate the pinned source tree independently of working-tree edits and directory-based family assumptions. It SHALL retain repository identity, resolved commit, relative path, format, Git blob identity and SHA-256 for each source definition, and explicitly list other entries. An inventory SHALL NOT claim successful entity loading or numerical parity.

#### Scenario: Reproduce a dirty checkout's pinned inventory

- **GIVEN** a valid source commit and modified, deleted or untracked working files
- **WHEN** inventory runs twice against that commit
- **THEN** the ordered source records and content hashes SHALL match exactly
- **AND** equal filenames in different directories SHALL remain separate entries

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
