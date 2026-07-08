## MODIFIED Requirements

### Requirement: Dev-Mode In-Memory Store

The system SHALL ship an in-memory `IMatchStore` implementation for
development and testing, clearly labeled as non-production. The default store SHALL resolve to exactly one instance per server process regardless of how many module graphs load the store factory, so matches created through REST routes are visible to the WebSocket upgrade handler and every other consumer in the same process.

#### Scenario: Dev store works for session

- **GIVEN** the server is configured with `InMemoryMatchStore`
- **WHEN** a client creates a match and appends events
- **THEN** the events SHALL be retrievable via `getEvents`
- **AND** the match SHALL behave identically to a persistent store for
  the duration of the process

#### Scenario: Dev store warns loudly

- **GIVEN** the server starts with `InMemoryMatchStore`
- **WHEN** the startup log is inspected
- **THEN** a warning SHALL be present stating the store is dev-only
- **AND** the warning SHALL include `"configure a persistent store for
production"`

#### Scenario: One store instance across module graphs

- **GIVEN** a dev server whose REST routes and WebSocket upgrade handler load the store factory through different module graphs
- **WHEN** a match is created through a REST route and a client then opens a socket for that match
- **THEN** the upgrade handler SHALL resolve the match from the same store instance and accept the connection (no `unknown-match` close)
- **AND** the dev-only store warning SHALL appear exactly once per process
