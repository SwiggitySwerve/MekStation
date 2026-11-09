## ADDED Requirements

### Requirement: Version Preview Selection Lifecycle

The version history dialog SHALL preserve an already-selected version's preview
when that version is selected again. Preview loading SHALL be inactive when
the dialog is closed or no version is selected. Existing request cancellation
SHALL prevent obsolete preview results from replacing the current preview.

#### Scenario: Re-select a loaded version

- **GIVEN** a version preview has loaded
- **WHEN** the user selects that same version again
- **THEN** its preview remains visible without starting another request
- **AND** preview loading remains inactive

#### Scenario: Re-select a pending version

- **GIVEN** the selected version's preview request is pending
- **WHEN** the user selects that version again
- **THEN** the existing request remains responsible for its preview
- **AND** selecting a different version continues to load that version

#### Scenario: Close and reopen while a preview is pending

- **GIVEN** a preview request is pending
- **WHEN** the dialog closes and then reopens
- **THEN** preview loading is cleared while closed and without a selection
- **AND** completion of the old request cannot replace a newly selected preview
