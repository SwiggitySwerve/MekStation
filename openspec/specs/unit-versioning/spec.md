# unit-versioning Specification

## Purpose

TBD - created by archiving change add-custom-unit-persistence. Update Purpose after archive.

## Requirements

### Requirement: Version Increment on Save

The system SHALL increment the version number each time a unit is saved.

**Rationale**: Version numbers provide clear ordering and identity for each save point.

**Priority**: Critical

#### Scenario: First save

- **GIVEN** a newly created custom unit
- **WHEN** unit is saved for the first time
- **THEN** version SHALL be 1
- **AND** created_at and updated_at timestamps SHALL be set

#### Scenario: Subsequent save

- **GIVEN** a custom unit at version 5
- **WHEN** unit is saved with modifications
- **THEN** version SHALL increment to 6
- **AND** updated_at timestamp SHALL be updated
- **AND** previous version 5 SHALL be stored in history

#### Scenario: Version number is monotonic

- **GIVEN** any unit with version history
- **THEN** version numbers SHALL always increase
- **AND** gaps in version numbers SHALL NOT occur

---

### Requirement: Version Snapshot Storage

The system SHALL store complete unit data for each version.

**Rationale**: Full snapshots enable reliable restoration without complex delta reconstruction.

**Priority**: Critical

#### Scenario: Store version snapshot

- **GIVEN** a unit is being saved
- **WHEN** creating version history entry
- **THEN** store complete ISerializedUnit data as JSON
- **AND** store timestamp of save
- **AND** optionally store user-provided save note

#### Scenario: Version data integrity

- **GIVEN** a version snapshot is stored
- **THEN** snapshot SHALL be immutable
- **AND** loading version N SHALL always return same data

---

### Requirement: Version History Listing

The system SHALL list all versions for a unit in reverse chronological order.

**Rationale**: Users need to browse version history to find points to restore.

**Priority**: High

#### Scenario: List versions

- **GIVEN** unit has versions 1, 2, 3, 4, 5
- **WHEN** listing version history
- **THEN** return versions in order [5, 4, 3, 2, 1]
- **AND** each entry includes: version number, saved_at timestamp, notes (if any)

#### Scenario: Version count limit

- **GIVEN** version history limit is configured to 50
- **WHEN** saving creates version 51
- **THEN** version 1 (oldest) SHALL be pruned
- **AND** versions 2-51 SHALL remain

#### Scenario: Empty history

- **GIVEN** unit has only current version (version 1, never re-saved)
- **WHEN** listing version history
- **THEN** return array with single entry for version 1

---

### Requirement: Version Restoration

The system SHALL restore unit state from any stored version.

**Rationale**: Users need to undo changes by reverting to earlier configurations.

**Priority**: High

#### Scenario: Revert creates new version

- **GIVEN** unit at version 5
- **WHEN** reverting to version 2
- **THEN** create new version 6 with data from version 2
- **AND** unit's current_version becomes 6
- **AND** version 2 data remains unchanged in history

#### Scenario: Revert preserves history

- **GIVEN** unit has versions 1-5
- **WHEN** reverting to version 3
- **THEN** versions 1-5 SHALL remain in history
- **AND** version 6 is added with data copied from version 3

#### Scenario: Revert with note

- **GIVEN** user reverts to version 3
- **WHEN** creating the revert
- **THEN** new version note SHALL indicate "Reverted from version 3"

---

### Requirement: Version Comparison

The system SHALL support comparing two versions of a unit.

**Rationale**: Users may want to see what changed between versions before reverting.

**Priority**: Medium

#### Scenario: Compare versions

- **GIVEN** unit has versions 3 and 5
- **WHEN** comparing version 3 to version 5
- **THEN** return structured diff showing:
  - Changed fields (e.g., armor values, equipment list)
  - Added items
  - Removed items

#### Scenario: Compare with current

- **GIVEN** unit at version 5 with unsaved changes
- **WHEN** comparing current state to version 5
- **THEN** show differences between saved version 5 and working state

---

### Requirement: Version Metadata

The system SHALL track metadata for each version.

**Rationale**: Metadata helps users understand version history context.

**Priority**: Medium

#### Scenario: Required metadata

- **GIVEN** any version entry
- **THEN** it SHALL include:
  - version: integer version number
  - saved_at: ISO timestamp
  - unit_id: reference to parent unit

#### Scenario: Optional metadata

- **GIVEN** any version entry
- **THEN** it MAY include:
  - notes: user-provided description of changes
  - revert_source: version number if this was created by revert

---

### Requirement: Version Pruning

The system SHALL limit version history to prevent unbounded growth.

**Rationale**: Storage management and performance.

**Priority**: Medium

#### Scenario: Automatic pruning

- **GIVEN** maximum version history is 50
- **AND** unit has 50 versions
- **WHEN** saving creates version 51
- **THEN** delete version 1 (oldest)
- **AND** retain versions 2-51

#### Scenario: Pruning configuration

- **GIVEN** environment variable `MAX_VERSION_HISTORY` is set to 100
- **WHEN** pruning logic runs
- **THEN** use 100 as the limit
- **AND** default to 50 if not configured

#### Scenario: Never prune version 1

- **GIVEN** pruning is needed
- **WHEN** selecting versions to prune
- **THEN** version 1 (original) MAY be pruned if limit requires
- **AND** pruning always removes oldest versions first

---
