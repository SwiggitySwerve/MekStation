## ADDED Requirements

### Requirement: Session-scoped desktop settings saves

The desktop settings dialog SHALL admit at most one Save or Apply operation at a time in its current session. It SHALL persist only changed keys, preserve unsaved edits through incoming settings updates, and apply asynchronous completion only to the session and API owner that admitted it. A successful Save SHALL close only when no newer unsaved edits remain; Apply SHALL remain open.

#### Scenario: Duplicate submission

- **GIVEN** an edited desktop settings dialog
- **WHEN** Save and Apply are invoked repeatedly before a render or while a write is pending
- **THEN** only one settings write SHALL be issued
- **AND** conflicting close or reset actions SHALL not be admitted

#### Scenario: Changed-key persistence

- **GIVEN** one edited preference and an unrelated main-process window-bounds update
- **WHEN** the user saves
- **THEN** only the changed preference SHALL be submitted
- **AND** incoming settings events SHALL preserve the unsaved preference
- **AND** reverting a preference to its current saved value SHALL require no write

#### Scenario: Obsolete completion

- **GIVEN** a pending settings write
- **WHEN** the dialog closes, reopens, unmounts, or changes API owner before completion
- **THEN** its completion SHALL not close, clean, or unlock a replacement session
- **AND** an obsolete settings-hook owner SHALL not publish settings or errors

#### Scenario: Newer draft edits

- **GIVEN** a pending save and a newer draft edit
- **WHEN** the earlier save succeeds or its settings events arrive
- **THEN** the newer edit SHALL remain unsaved
- **AND** the dialog SHALL remain open
- **AND** the next Apply SHALL submit only the remaining changed keys

#### Scenario: Save failure and retry

- **GIVEN** an edited desktop settings dialog
- **WHEN** the write returns failure or rejects
- **THEN** the draft SHALL remain available and dirty
- **AND** the pending state SHALL clear so the user can retry
- **AND** the dialog SHALL not close as if the save succeeded
