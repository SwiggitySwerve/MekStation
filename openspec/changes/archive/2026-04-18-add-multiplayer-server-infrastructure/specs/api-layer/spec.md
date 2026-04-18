# api-layer Specification Delta

## ADDED Requirements

### Requirement: Multiplayer REST Surface

The api-layer SHALL expose a thin REST surface for multiplayer match
lifecycle that complements the WebSocket event channel.

#### Scenario: Create match

- **GIVEN** an authenticated player wants to host a match
- **WHEN** they POST `/api/multiplayer/matches` with body
  `{config, players: IPlayerRef[]}`
- **THEN** the response SHALL be `200 OK` with
  `{matchId, wsUrl, hostPlayerId}`
- **AND** the match SHALL be created in the `IMatchStore` with `status:
'lobby'`

#### Scenario: Fetch match meta

- **GIVEN** a match id
- **WHEN** GET `/api/multiplayer/matches/:id` is called
- **THEN** the response SHALL return `IMatchMeta` with `matchId,
hostPlayerId, playerIds, sideAssignments, status, createdAt,
updatedAt`
- **AND** the payload SHALL NOT include event-log content

#### Scenario: Close match (host only)

- **GIVEN** an authenticated host owns a match
- **WHEN** they DELETE `/api/multiplayer/matches/:id`
- **THEN** the server SHALL append `GameEnded {reason: 'host-closed'}`
  to the match
- **AND** the store SHALL mark the match `status: 'completed'`

#### Scenario: Non-host cannot close

- **GIVEN** an authenticated player who is NOT the match host
- **WHEN** they DELETE `/api/multiplayer/matches/:id`
- **THEN** the response SHALL be `403 Forbidden`

### Requirement: WebSocket Endpoint Documentation

The api-layer SHALL document the multiplayer WebSocket endpoint path,
upgrade requirements, and envelope types alongside the REST surface.

#### Scenario: Endpoint is documented

- **GIVEN** the api-layer documentation set
- **WHEN** inspected
- **THEN** the path `/api/multiplayer/socket` SHALL be listed as a
  WebSocket endpoint
- **AND** the docs SHALL enumerate the envelope kinds

#### Scenario: Upgrade auth

- **GIVEN** a WebSocket upgrade request
- **WHEN** the server handles it
- **THEN** an `Authorization` header or `?token=...` query parameter
  SHALL be present with a valid player token
- **AND** if missing or invalid, the server SHALL respond `401
Unauthorized` and NOT upgrade
