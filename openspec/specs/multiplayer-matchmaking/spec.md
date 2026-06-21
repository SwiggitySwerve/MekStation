# multiplayer-matchmaking Specification

## Purpose

Defines Multiplayer Matchmaking requirements for Joinable-Lobby Query, Joinable-Lobby Endpoint, and Match Browser, preserving the source-of-truth scope introduced by archived change add-matchmaking-and-spectator.

## Requirements
### Requirement: Joinable-Lobby Query

The system SHALL provide a query over the durable match store that returns every match in `status: 'lobby'` with at least one open `kind: 'human'` seat. Each result SHALL be projected to a compact shape carrying the match id, room code, layout, host display name, and a seat-occupancy summary. Matches that have transitioned out of `status: 'lobby'` SHALL NOT be returned.

#### Scenario: Open lobby is listed

- **GIVEN** a match in `status: 'lobby'` with one occupied and one open human seat
- **WHEN** the joinable-lobby query runs
- **THEN** the match SHALL be returned with its layout, host display name, and seat-occupancy summary

#### Scenario: Full lobby is excluded

- **GIVEN** a match in `status: 'lobby'` whose every human seat is occupied
- **WHEN** the joinable-lobby query runs
- **THEN** the match SHALL NOT be returned

#### Scenario: Launched match is excluded

- **GIVEN** a match that has transitioned to `status: 'active'`
- **WHEN** the joinable-lobby query runs
- **THEN** the match SHALL NOT be returned

### Requirement: Joinable-Lobby Endpoint

The system SHALL expose an authenticated REST endpoint that returns the joinable-lobby query result. The endpoint SHALL require a valid player token, consistent with the other multiplayer endpoints.

#### Scenario: Authenticated request returns lobbies

- **GIVEN** a client with a valid player token
- **WHEN** the client requests the joinable-lobby endpoint
- **THEN** the response SHALL contain the joinable-lobby projection

#### Scenario: Unauthenticated request rejected

- **GIVEN** a client with no player token
- **WHEN** the client requests the joinable-lobby endpoint
- **THEN** the response SHALL be `401 Unauthorized`

### Requirement: Match Browser

The system SHALL render a match browser on the multiplayer hub listing joinable lobbies with their layout, host, and seat occupancy. The browser SHALL refresh on an interval and on an explicit user refresh, and SHALL offer a one-click join per row.

#### Scenario: Browser lists joinable lobbies

- **GIVEN** the joinable-lobby endpoint returns two open lobbies
- **WHEN** the match browser renders
- **THEN** both lobbies SHALL be shown with their layout, host, and seat occupancy

#### Scenario: One-click join navigates into the lobby

- **GIVEN** a match browser row for a joinable lobby
- **WHEN** the player clicks "Join" on that row
- **THEN** the player SHALL be navigated to `/multiplayer/lobby/[roomCode]` for that lobby

#### Scenario: Browser reflects lobby lifecycle changes

- **GIVEN** a match browser showing an open lobby
- **WHEN** that lobby fills up or launches and the browser refreshes
- **THEN** the lobby SHALL no longer appear in the list

#### Scenario: Empty browser state

- **GIVEN** the joinable-lobby endpoint returns no lobbies
- **WHEN** the match browser renders
- **THEN** the browser SHALL show an empty state rather than an error

