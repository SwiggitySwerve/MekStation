## ADDED Requirements

### Requirement: Single in-flight library save

The customizer SHALL permit at most one library save request per mounted save controller at a time. While that request is pending, the save dialog SHALL display its saving state and prevent resubmission, designation changes, cancellation, and replacement by another save dialog. All terminal results SHALL release the pending state. Existing library receipt and concurrent-edit checks SHALL continue to decide whether save completion can close the source tab.

#### Scenario: Duplicate create or overwrite

- **GIVEN** a create or overwrite request is pending
- **WHEN** another confirmation occurs before a React render or with a different designation
- **THEN** only the first request reaches the library API

#### Scenario: Pending dialog dismissal

- **GIVEN** a library save is pending
- **WHEN** the user presses Cancel or Escape, clicks the close button or backdrop, or attempts to open another save dialog
- **THEN** the original save dialog remains open with its original target, designation, and close-after-save intent
- **AND** Save, Overwrite, Save As New, Suggest, and designation inputs remain disabled

#### Scenario: Successful save before closing a tab

- **GIVEN** the user chose Save when closing a modified tab
- **WHEN** the pending library write and existing browser receipt checks succeed
- **THEN** the original source tab closes exactly once after completion

#### Scenario: Failure and retry

- **GIVEN** a library save fails, throws, or returns no valid saved identity
- **WHEN** the operation completes
- **THEN** the pending state clears, the dialog remains available for retry or cancellation, and no successful library receipt or tab closure is invented

#### Scenario: Newer edits remain unsaved

- **GIVEN** the source draft changes during the library request
- **WHEN** that request succeeds
- **THEN** the existing concurrent-edit warning and dirty-state handling remain in effect and the source tab stays open
