## ADDED Requirements

### Requirement: Reset Dialog Timer Lifecycle

The reset dialog SHALL stop its progress interval when confirmation succeeds
or fails. Closing or unmounting SHALL cancel its progress and auto-close timers.
Each new opening SHALL start at selection with cleared progress and errors.
Completion from a disposed opening SHALL neither update a later opening nor
schedule an auto-close timer.

#### Scenario: Successful reset

- **WHEN** reset confirmation succeeds
- **THEN** progress stops and the success result appears
- **AND** the dialog closes once after two seconds

#### Scenario: Failed reset

- **WHEN** reset confirmation fails
- **THEN** progress stops and the failure result remains open for dismissal
- **AND** no auto-close timer is scheduled

#### Scenario: Close and reopen before auto-close

- **GIVEN** a successful reset is awaiting its auto-close deadline
- **WHEN** the user or parent closes the dialog and reopens it
- **THEN** the dialog starts at selection
- **AND** the old deadline cannot close the new opening

#### Scenario: Dispose a pending reset

- **GIVEN** reset confirmation is pending
- **WHEN** the parent closes or unmounts the dialog
- **THEN** its progress timer is cancelled
- **AND** a subsequent success or failure cannot alter another opening,
  stop its progress interval, call close, or schedule an auto-close timer

#### Scenario: Unmount a completed reset

- **GIVEN** a successful reset is awaiting auto-close
- **WHEN** the dialog unmounts
- **THEN** the auto-close timer is cancelled without calling close
