## ADDED Requirements

### Requirement: Version View Request Isolation

Version history and diff views SHALL accept data, errors, and loading completion
only from the current request run. History refreshes after rollback SHALL obey
the same rule. Changing item identity or unmounting SHALL invalidate pending
work, including rollback callbacks associated with the previous item.

#### Scenario: An older request completes after a newer request

- **GIVEN** a version view starts a request and then starts a newer request
- **WHEN** the older request succeeds or fails
- **THEN** its data and error SHALL NOT replace the newer request's state
- **AND** its completion SHALL NOT clear the newer request's loading indicator

#### Scenario: The item changes during rollback

- **GIVEN** a rollback POST or its history refresh is pending
- **WHEN** the view changes to another item
- **THEN** the old operation SHALL NOT alter the new item's history or errors
- **AND** a stale POST completion SHALL NOT invoke the new view's rollback callback

#### Scenario: A diff selection becomes invalid

- **GIVEN** a diff request is pending or has failed
- **WHEN** either version is zero or the source version is not older than the target
- **THEN** the view SHALL clear diff data, loading, and error state
- **AND** the invalidated request SHALL NOT restore any of those states

### Requirement: Version Operation Error Reporting

The version history panel SHALL distinguish history load failures from rollback
failures. Rollback failure SHALL preserve loaded history and appear in the
confirmation dialog. A successful rollback followed by a failed refresh SHALL
report mutation success and refresh failure separately.

#### Scenario: Rollback fails

- **GIVEN** history is loaded and the rollback dialog is open
- **WHEN** the rollback POST fails
- **THEN** the dialog SHALL show the rollback error and permit retry
- **AND** loaded history SHALL remain available
- **AND** the successful rollback callback SHALL NOT run

#### Scenario: Rollback succeeds but history refresh fails

- **GIVEN** a rollback POST succeeds
- **WHEN** its history refresh returns an HTTP error or rejects
- **THEN** the rollback callback SHALL run exactly once and the dialog SHALL close
- **AND** the view SHALL retain loaded history and report that rollback succeeded but refresh failed
