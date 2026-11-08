## ADDED Requirements

### Requirement: Independent active-change metadata

New changes SHALL write accounting metadata only to
`openspec/changes/<name>/.ledger.json`. The active-change CI validator SHALL discover
every immediate non-archive change directory and require accounting from colocated
metadata or the legacy `allowedActiveChanges` inventory. Every accounting entry
SHALL contain a matching change name, nonblank string status and reason, and a
real `YYYY-MM-DD` calendar date in `lastReviewed`.

#### Scenario: Independent additions share no ledger path

- **GIVEN** two new change directories with valid colocated metadata
- **WHEN** the CI validator runs without additions to the legacy inventory
- **THEN** both changes SHALL be accounted for successfully

#### Scenario: Unaccounted or invalid metadata fails

- **WHEN** an active change lacks accounting, a required field is missing or
  invalid, JSON is malformed, or a colocated name differs from its directory
- **THEN** the CI validator SHALL fail and identify the affected accounting source
- **AND** valid metadata in the other format SHALL NOT mask invalid metadata

#### Scenario: Archived colocated metadata is excluded

- **GIVEN** an archived package with a colocated accounting file
- **WHEN** the CI validator discovers active changes
- **THEN** archived metadata SHALL NOT enter the active inventory

### Requirement: Lossless legacy compatibility

The migration SHALL preserve the existing legacy document and reproduce all of its
entries exactly after normalization. The validator SHALL accept legacy-only entries
for active changes, deduplicate identical cross-format entries, and reject
conflicting metadata, duplicate legacy names and legacy entries for missing or
archived changes. Normalization SHALL preserve each required string's bytes.

#### Scenario: Migration matches the original inventory

- **GIVEN** the current legacy entries and their generated colocated copies
- **WHEN** both inventories are normalized independently
- **THEN** the inventories SHALL have identical serialized bytes

#### Scenario: In-flight legacy addition remains accepted

- **GIVEN** an active change accounted for only by a valid legacy entry
- **WHEN** the validator runs after migration
- **THEN** that change SHALL remain accounted for

#### Scenario: Duplicates and stale entries fail explicitly

- **WHEN** entries disagree across formats, a legacy name is repeated, or a legacy
  name has no active directory
- **THEN** the validator SHALL fail instead of selecting or discarding metadata
- **AND** identical entries appearing once in each format SHALL count once

### Requirement: Accounting provenance remains bound to the cited revision

CAMP provenance SHALL support both accounting formats at the cited merge SHA and
require the cited change's tasks file at that SHA. Legacy-only historical
membership semantics SHALL remain supported. Colocated metadata SHALL be fully
validated and SHALL agree with a matching legacy entry when both are present.

#### Scenario: Historical and colocated citations work

- **GIVEN** a valid cited revision with legacy membership or valid colocated metadata
- **WHEN** CAMP verifies accounting and the tasks file at that revision
- **THEN** it SHALL accept the accounting proof

#### Scenario: Later metadata cannot satisfy an earlier citation

- **GIVEN** accounting metadata added after the cited revision
- **WHEN** CAMP verifies that earlier revision
- **THEN** it SHALL reject the citation as unaccounted

#### Scenario: Invalid colocated metadata cannot fall back to legacy membership

- **GIVEN** malformed, incomplete, mismatched or conflicting colocated metadata
- **WHEN** CAMP verifies the cited revision
- **THEN** it SHALL reject the accounting proof
