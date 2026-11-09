## ADDED Requirements

### Requirement: Development startup preserves existing port owners

Development startup and production-evidence startup SHALL default to port 3600,
honor a valid PORT override, and refuse an occupied selected port without
terminating its holder. Both development modes SHALL share this boundary.

#### Scenario: Another process holds the selected port

- **GIVEN** a process is listening on the selected port
- **WHEN** development or production-evidence startup runs
- **THEN** startup SHALL fail before synchronization, build, or server launch
- **AND** the error SHALL name the port and listener PID and suggest PORT
- **AND** the original listener SHALL remain running

#### Scenario: PID enumeration is unavailable

- **GIVEN** the selected port is occupied and OS PID enumeration fails
- **WHEN** startup checks the port
- **THEN** startup SHALL refuse the port and explain the PID lookup failure
- **AND** SHALL NOT terminate any process

#### Scenario: A caller selects a free alternate port

- **GIVEN** PORT names a free TCP port in the range 1 through 65535
- **WHEN** either development mode starts
- **THEN** the guard and server SHALL use that port
- **AND** configuration synchronization SHALL finish successfully before server launch
- **AND** Next E2E mode SHALL retain webpack and receive an explicit port

#### Scenario: PORT is malformed

- **WHEN** PORT is empty, nonnumeric, fractional, or outside the TCP port range
- **THEN** startup SHALL fail clearly before synchronization or server launch

#### Scenario: Existing E2E callers retain their contracts

- **WHEN** Playwright or a hosted CI E2E job starts its server
- **THEN** explicit server-command overrides and readiness-token matching SHALL remain unchanged
- **AND** production-evidence commands SHALL use the shared guard before building

#### Scenario: Startup or shutdown fails

- **WHEN** configuration synchronization fails
- **THEN** startup SHALL preserve its exit status and SHALL NOT launch a server
- **WHEN** the server exits or startup receives a termination signal
- **THEN** the launcher SHALL preserve the exit outcome and forward signals only to its own child
