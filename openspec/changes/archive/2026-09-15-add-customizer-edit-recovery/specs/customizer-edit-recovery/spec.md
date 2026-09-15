## ADDED Requirements

### Requirement: Observable draft and library state
The customizer SHALL visibly distinguish completed browser writes, failed browser writes, and the last known saved library version. Library identity SHALL come from a successful server response and SHALL survive draft reload separately from source provenance.

#### Scenario: Save and edit a library design
- **GIVEN** a BattleMech draft is saved successfully as version 2
- **WHEN** the user edits it and reloads
- **THEN** the UI identifies version 2 as the last library save and reports draft changes separately from browser-write status

#### Scenario: Failed write or save
- **WHEN** a browser write or library save fails
- **THEN** the failure is visible and no successful receipt is invented

#### Scenario: Reopen Save with an unchanged designation
- **GIVEN** the unit has a saved library identity
- **WHEN** Save opens again without changing the designation
- **THEN** name validation checks the server library and offers Overwrite for the matching saved identity, while Save remains disabled until the fresh validation completes

### Requirement: Restore saved history into the selected draft
The customizer SHALL offer saved history for a known library identity and SHALL restore a selected historical version as one undoable draft operation. Library history SHALL remain immutable.

#### Scenario: Restore an earlier version
- **GIVEN** two open units and multiple saved versions of one unit
- **WHEN** the user restores an earlier version into that draft
- **THEN** only that draft changes, its identity remains stable, the library versions remain unchanged, and undo restores the previous draft

#### Scenario: Stale or failed history request
- **WHEN** a preview or restore request fails, the selected unit changes, or intervening edits occur
- **THEN** stale data cannot replace a different or newer draft and the user can recover without data loss

#### Scenario: Restore an otherwise identical saved draft
- **WHEN** restoring a saved version regenerates only temporary equipment identifiers
- **THEN** the draft remains clean, while actual changes to editor-only fields still mark it modified

### Requirement: Independent bounded undo and redo
The BattleMech editor SHALL record complete user operations per unit with a maximum of 50 undo entries, preserving cascaded changes and restoring normal derived metrics and validation. Session history SHALL reset on reload and SHALL exclude successful-save metadata and no-op operations.

#### Scenario: Compound edits and separate units
- **WHEN** the user changes engine structure, auto-allocates armor, and places or removes equipment, then switches units
- **THEN** each operation undoes and redoes as one complete transaction on its original unit, with correct serialized construction and derived metrics

#### Scenario: Branching and capacity
- **WHEN** the user edits after undo or exceeds 50 operations
- **THEN** redo is cleared for the branch and only the oldest undo entries are discarded

#### Scenario: Accessible editing controls
- **WHEN** the user uses a narrow viewport or keyboard shortcuts
- **THEN** recovery controls remain accessible and native input undo and open dialogs retain their keyboard behavior

#### Scenario: Save applies a designation after an earlier edit
- **GIVEN** a draft edit is followed by saving under a new variant designation
- **WHEN** the user undoes the earlier edit
- **THEN** the saved designation and library receipt remain intact while the labeled edit is undone
