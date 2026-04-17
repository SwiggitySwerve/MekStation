# multiplayer-server Specification Delta

## ADDED Requirements

### Requirement: Authenticated Multiplayer Endpoints

The multiplayer server SHALL require a valid player token on every REST
and WebSocket endpoint except the health check.

#### Scenario: REST without token

- **GIVEN** a client POSTs `/api/multiplayer/matches` without an
  `Authorization` header
- **WHEN** the server handles the request
- **THEN** the response SHALL be `401 Unauthorized`

#### Scenario: REST with invalid token

- **GIVEN** a client POSTs with `Authorization: Bearer invalid`
- **WHEN** the server verifies the token
- **THEN** verification SHALL fail
- **AND** the response SHALL be `401 Unauthorized`

#### Scenario: WebSocket without token

- **GIVEN** a WebSocket upgrade request missing a token in both
  header and query string
- **WHEN** the server handles the upgrade
- **THEN** the server SHALL respond `401 Unauthorized`
- **AND** SHALL NOT upgrade the connection

### Requirement: Host Authority Gated by Identity

Only the match's `hostPlayerId` SHALL be able to close or modify match
configuration via privileged operations.

#### Scenario: Non-host close rejected

- **GIVEN** a player whose `playerId != hostPlayerId`
- **WHEN** they DELETE `/api/multiplayer/matches/:id`
- **THEN** the server SHALL respond `403 Forbidden`
- **AND** the match SHALL remain active

#### Scenario: Host close succeeds

- **GIVEN** a player whose `playerId == hostPlayerId`
- **WHEN** they DELETE `/api/multiplayer/matches/:id`
- **THEN** the server SHALL mark the match completed
- **AND** all connected clients SHALL receive a `Close` envelope

### Requirement: Seat Binding Uses Authenticated Player

The server SHALL bind seat occupancy to the `playerId` verified at
WebSocket upgrade time and SHALL reject any `OccupySeat` intent that
references a different `playerId`.

#### Scenario: Seat binds to socket identity

- **GIVEN** an authenticated WebSocket for `pid_abc`
- **WHEN** the client sends `OccupySeat {slotId: 'alpha-1'}`
- **THEN** the server SHALL assign `occupant = {playerId: 'pid_abc'}`
- **AND** SHALL NOT let the client claim a different player id

#### Scenario: Attempting to occupy on behalf of another player

- **GIVEN** an authenticated WebSocket for `pid_abc`
- **WHEN** the client sends `OccupySeat {slotId: 'alpha-1', claimed
Player: 'pid_xyz'}`
- **THEN** the server SHALL ignore `claimedPlayer` and bind the seat
  to `pid_abc`
- **AND** the server MAY respond with a warning envelope

### Requirement: Match Participation Recorded Server-Side

The server SHALL record each participant's match participation in the
`IPlayerStore` when a match transitions from `'lobby'` to `'active'`.

#### Scenario: Each human participant gets recorded

- **GIVEN** a match launching with 4 human players
- **WHEN** the server processes `LaunchMatch`
- **THEN** `recordMatchParticipation(playerId, matchId)` SHALL be
  called exactly once for each human participant
- **AND** AI-occupied seats SHALL NOT produce participation records
