## ADDED Requirements

### Requirement: Retryable Database Initialization

SQLiteService SHALL propagate the original initialization error, clear its
in-process connection handle and attempt to close the failed connection after
initialization fails. A cleanup error SHALL NOT replace the initialization
error. A subsequent call on the same instance SHALL retry initialization.
Recovery SHALL NOT delete, truncate or recreate the user's database file or
discard existing user data or committed migration records.

#### Scenario: Migration-version read failure

- **GIVEN** an existing database with recorded migrations and pending migrations
- **WHEN** reading the migrations-table existence or maximum version fails
- **THEN** initialization propagates the original error without running migrations
- **AND** the failed connection is closed and the service reports uninitialized
- **AND** getDatabase rejects access to the failed handle
- **AND** the database file identity, bytes, user data and migration records remain unchanged

#### Scenario: Retry on the same instance

- **GIVEN** initialization failed and the transient fault has been removed
- **WHEN** initialize is called again on the same service instance
- **THEN** a new connection opens the existing database and applies pending migrations
- **AND** existing user data and previously committed migration records are preserved
- **AND** subsequent successful initialize calls reuse the ready connection

#### Scenario: Connection setup fails

- **GIVEN** a connection opens but enabling WAL or foreign keys fails
- **WHEN** initialize propagates the setup error
- **THEN** the failed connection is closed and the service reports uninitialized
- **AND** removing the fault permits initialization on the same instance

#### Scenario: Migration application fails

- **GIVEN** a pending migration cannot commit its migration record
- **WHEN** initialize fails
- **THEN** the migration transaction rolls back and the failed connection is closed
- **AND** the service reports uninitialized
- **AND** removing the fault permits the same instance to apply the pending migration

#### Scenario: Connection cleanup also fails

- **GIVEN** initialization failed and closing the failed connection also throws
- **WHEN** initialize returns control to its caller
- **THEN** the caller receives the original initialization error
- **AND** the service reports uninitialized and getDatabase rejects access
- **AND** a later initialize call can open a new connection
