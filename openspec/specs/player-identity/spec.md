# player-identity Specification

## Purpose
TBD - created by archiving change add-player-identity-and-auth. Update Purpose after archive.
## Requirements
### Requirement: Player Reference Model

The system SHALL represent a networked player with an `IPlayerRef`
containing stable identifying fields sufficient for seat assignment,
display, and match history.

#### Scenario: Player ref shape

- **GIVEN** a player connects to the multiplayer server
- **WHEN** the server logs the player
- **THEN** the reference SHALL contain `playerId: string`,
  `displayName: string`, and optional `avatarUrl: string`
- **AND** `playerId` SHALL be of the form `pid_{base58-derived-from-
public-key}`

#### Scenario: Player id is deterministic from public key

- **GIVEN** a player with Ed25519 public key `K`
- **WHEN** `playerId` is derived
- **THEN** the result SHALL be identical for the same `K` across
  sessions and machines
- **AND** two different public keys SHALL produce different player ids

### Requirement: Token-Based Authentication

The system SHALL authenticate player connections via signed bearer
tokens. A valid token SHALL be required on all multiplayer endpoints
except the health check.

#### Scenario: Token structure

- **GIVEN** a player issues a token
- **WHEN** the token is inspected
- **THEN** it SHALL contain `playerId, issuedAt, expiresAt, publicKey,
signature`
- **AND** `signature` SHALL be an Ed25519 signature over the canonical
  string representation of `{playerId, issuedAt, expiresAt}`

#### Scenario: Server verifies token

- **GIVEN** an authenticated REST request with `Authorization: Bearer
<token>`
- **WHEN** the server's auth middleware runs
- **THEN** it SHALL verify the signature with the embedded public key
- **AND** it SHALL verify `expiresAt > now`
- **AND** it SHALL verify `playerId` is derived from `publicKey`

#### Scenario: Tampered token rejected

- **GIVEN** a token whose payload was altered after signing
- **WHEN** the server verifies it
- **THEN** signature verification SHALL fail
- **AND** the server SHALL respond `401 Unauthorized`

#### Scenario: Expired token rejected

- **GIVEN** a token whose `expiresAt` is in the past
- **WHEN** the server verifies it
- **THEN** verification SHALL fail with `reason: 'expired'`
- **AND** the server SHALL respond `401 Unauthorized`

### Requirement: Player Store Contract

The system SHALL provide a pluggable `IPlayerStore` interface that
persists player profiles and match participation history.

#### Scenario: Store interface

- **GIVEN** an `IPlayerStore` implementation
- **WHEN** the type is inspected
- **THEN** it SHALL expose `getOrCreatePlayer`, `updateProfile`,
  `recordMatchParticipation`
- **AND** every method SHALL return a `Promise`

#### Scenario: First-time connection bootstraps profile

- **GIVEN** a player with `playerId: pid_new` connecting for the first
  time
- **WHEN** the server processes the `SessionJoin`
- **THEN** `getOrCreatePlayer({playerId: 'pid_new', publicKey,
displayName, avatarUrl?})` SHALL be called
- **AND** the returned profile SHALL have `createdAt = now` and
  `lastSeenAt = now`

#### Scenario: Repeat connection updates lastSeenAt

- **GIVEN** an existing profile for `pid_abc` with `lastSeenAt` in
  the past
- **WHEN** the player reconnects
- **THEN** `lastSeenAt` SHALL be updated to the current timestamp
- **AND** the existing profile SHALL otherwise be preserved

### Requirement: Player Id Bound to WebSocket

The system SHALL attach the verified `playerId` to each WebSocket
connection at upgrade time and reject any subsequent message whose
`playerId` differs from the socket's bound identity.

#### Scenario: SessionJoin id must match socket

- **GIVEN** a WebSocket authenticated as `playerId: pid_a`
- **WHEN** the client sends `SessionJoin {playerId: 'pid_b', ...}`
- **THEN** the server SHALL respond `Error {code: 'UNAUTHORIZED'}`
- **AND** the socket SHALL be closed

#### Scenario: Intent id must match socket

- **GIVEN** an authenticated WebSocket for `pid_a`
- **WHEN** a `Intent {playerId: 'pid_b', ...}` message arrives
- **THEN** the server SHALL respond `Error {code: 'UNAUTHORIZED'}`
- **AND** no state SHALL be mutated

### Requirement: Token Rotation

The system SHALL support client-side token rotation so live matches
survive token expiry without losing the connection.

#### Scenario: Rotation on near-expiry

- **GIVEN** a client whose cached token expires in 4 minutes
- **WHEN** the client next makes a request
- **THEN** the client SHALL issue a new token before the request
- **AND** the request SHALL carry the fresh token

#### Scenario: Server accepts small clock drift

- **GIVEN** a token whose `issuedAt` is 5 seconds in the future
  (client clock ahead)
- **WHEN** the server verifies it
- **THEN** verification SHALL pass
- **AND** the drift SHALL be tolerated up to 10 seconds

