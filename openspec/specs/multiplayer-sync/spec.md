# multiplayer-sync Specification

## Purpose

TBD - created by archiving change add-multiplayer-lobby-and-matchmaking-2-8. Update Purpose after archive.

## Requirements

### Requirement: Lobby Update Broadcast

The server SHALL broadcast lobby state to all connected clients in the
match whenever any seat or metadata changes during the lobby phase.

#### Scenario: Seat change broadcasts update

- **GIVEN** a match in `status: 'lobby'` with 4 connected clients
- **WHEN** one player occupies seat `alpha-1`
- **THEN** all 4 clients SHALL receive an `Event {type: 'lobby_
updated', payload: {seats, meta}}` within 200ms
- **AND** each client's local lobby view SHALL update to reflect the
  new seat occupant

#### Scenario: Occupant leaves broadcasts update

- **GIVEN** a seated player who sends `LeaveSeat`
- **WHEN** the server processes the intent
- **THEN** the seat's occupant SHALL be cleared
- **AND** a `lobby_updated` event SHALL be broadcast to the remaining
  clients

### Requirement: Room Code UI Contract

The system SHALL expose the 6-character room code prominently in the
lobby UI and support a one-click invite link that resolves to the
lobby page via the code.

#### Scenario: Lobby page shows code

- **GIVEN** a client lands on `/gameplay/mp-lobby/[matchId]`
- **WHEN** the page renders
- **THEN** the current `roomCode` SHALL be visible in the header
- **AND** a copy-to-clipboard button SHALL copy an absolute invite URL
  of the form `<origin>/gameplay/mp-invite/{roomCode}`

#### Scenario: Invite URL resolves and navigates

- **GIVEN** a user visits `/gameplay/mp-invite/{roomCode}`
- **WHEN** the page mounts
- **THEN** the page SHALL call `/api/multiplayer/invites/{roomCode}`
- **AND** on a valid response, SHALL navigate to
  `/gameplay/mp-lobby/{matchId}`

#### Scenario: Expired code renders error

- **GIVEN** a room code whose match is already active
- **WHEN** the user visits the invite URL
- **THEN** the page SHALL render an error message
  `"This match has already started"`
- **AND** offer a link back to the landing page
