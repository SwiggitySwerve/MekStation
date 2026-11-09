## ADDED Requirements

### Requirement: Failed Bundle Import Recovery

The `useVaultImport` hook SHALL preserve returned `success: false` results and
expose their error message, using "Import failed" when the message is empty.
The hook SHALL clear `importing` and return to the
entry path's existing recovery step rather than `complete`.

#### Scenario: Failed file import retains its preview

- **GIVEN** a bundle file has a populated preview
- **WHEN** `importFile` receives an unsuccessful import result
- **THEN** `step` is `preview` and the selected file and preview are retained
- **AND** the error is exposed and `importing` is `false`
- **AND** the dialog displays the preview and its recovery controls

#### Scenario: Failed conflict-resolution import returns to preview

- **GIVEN** a selected file has a preview and unresolved conflicts
- **WHEN** `resolveConflicts` receives an unsuccessful import result
- **THEN** `step` is `preview` with the existing preview retained
- **AND** the error is exposed and `importing` is `false`

#### Scenario: Failed string import returns to idle

- **GIVEN** no file or preview has been selected
- **WHEN** `importString` receives an unsuccessful import result
- **THEN** `step` is `idle` and the preview remains `null`
- **AND** the returned failure and its message are preserved
- **AND** `importing` is `false`

#### Scenario: Failed import has an empty message

- **WHEN** the import service returns a failure with an empty message
- **THEN** the hook exposes "Import failed" and uses the recovery step

#### Scenario: Retrying a failed file import succeeds

- **GIVEN** a failed file import has returned to its retained preview
- **WHEN** the user retries and the import service returns success without conflicts
- **THEN** `step` is `complete` and the previous error is cleared
- **AND** `importing` is `false`
