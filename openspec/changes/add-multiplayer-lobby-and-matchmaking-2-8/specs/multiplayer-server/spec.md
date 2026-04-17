# multiplayer-server Specification Delta

## ADDED Requirements

### Requirement: Team Layouts

The multiplayer server SHALL support configurable match team layouts
for 2–8 players, covering symmetric team play (`1v1`, `2v2`, `3v3`,
`4v4`) and free-for-all (`ffa-2` through `ffa-8`).

#### Scenario: 2v2 produces two sides of two seats

- **GIVEN** a host creates a match with `layout: '2v2'`
- **WHEN** the server initializes the match
- **THEN** the seat roster SHALL contain 4 seats
- **AND** 2 seats SHALL be on side `'Alpha'`, 2 on side `'Bravo'`

#### Scenario: ffa-5 produces five solo sides

- **GIVEN** a host creates a match with `layout: 'ffa-5'`
- **WHEN** the server initializes the match
- **THEN** the seat roster SHALL contain 5 seats
- **AND** each seat SHALL be on its own side (`'Alpha'` through
  `'Echo'`)

#### Scenario: 4v4 supports 8 total seats

- **GIVEN** a host creates a match with `layout: '4v4'`
- **WHEN** the server initializes the match
- **THEN** the seat roster SHALL contain 8 seats
- **AND** seats SHALL be evenly split between two sides

### Requirement: Seat Slot Model

The multiplayer server SHALL model each player slot as an explicit seat
with a stable id, side assignment, occupant, kind (human or AI), and
readiness flag.

#### Scenario: Seat record shape

- **GIVEN** a match with seats
- **WHEN** the seat roster is inspected
- **THEN** each seat SHALL have `slotId, side, seatNumber, occupant,
kind, ready, aiProfile?`
- **AND** `slotId` SHALL be of the form `{side-lowercase}-{seatNumber}`
  (e.g. `alpha-1`, `bravo-2`)

#### Scenario: Seat occupancy binding

- **GIVEN** an unoccupied human seat `alpha-1`
- **WHEN** player `pid_abc` sends `Intent {kind: 'OccupySeat',
slotId: 'alpha-1'}`
- **THEN** the server SHALL assign `occupant = {playerId: 'pid_abc'}`
- **AND** other clients SHALL receive a lobby update reflecting the
  new occupant

#### Scenario: Cannot occupy AI seat

- **GIVEN** a seat with `kind: 'ai'`
- **WHEN** a player sends `OccupySeat` for that slot
- **THEN** the server SHALL respond `Error {code: 'SEAT_IS_AI'}`
- **AND** occupancy SHALL NOT change

### Requirement: Room Code Invites for 2-8 Matches

The multiplayer server SHALL issue a 6-character alphanumeric room code
on match creation, usable as a shareable invite token that resolves to
the internal match id.

#### Scenario: Room code issued on create

- **GIVEN** a host POSTs `/api/multiplayer/matches` with a valid body
- **WHEN** the server creates the match
- **THEN** the response SHALL include `roomCode: string` of 6 chars
- **AND** the code SHALL use the same alphabet as the
  `p2p-sync-system` (excluding I/O/0/1)

#### Scenario: Resolve room code to match id

- **GIVEN** a match with `roomCode: 'RX7KLM'` in `status: 'lobby'`
- **WHEN** a joiner GETs `/api/multiplayer/invites/RX7KLM`
- **THEN** the response SHALL be `{matchId, status: 'lobby'}`
- **AND** the joiner SHALL use `matchId` to connect to the WebSocket

#### Scenario: Code expires at launch

- **GIVEN** a match whose `status` has transitioned to `'active'`
- **WHEN** a newcomer GETs `/api/multiplayer/invites/{roomCode}`
- **THEN** the response SHALL be `410 Gone`
- **AND** the body SHALL indicate the match is no longer accepting
  joiners

### Requirement: AI-Filled Seats

The system SHALL allow a host to mark any unoccupied human seat as AI,
and the server SHALL spawn a `BotPlayer` instance in-process to occupy
that seat at match launch.

#### Scenario: Host toggles empty seat to AI

- **GIVEN** an empty seat `bravo-2` with `kind: 'human'`
- **WHEN** the host sends `Intent {kind: 'SetAiSlot', slotId: 'bravo-2',
aiProfile: 'basic'}`
- **THEN** the seat SHALL become `kind: 'ai', aiProfile: 'basic',
ready: true`

#### Scenario: AI seat auto-ready

- **GIVEN** any seat with `kind: 'ai'`
- **WHEN** readiness is evaluated
- **THEN** the seat SHALL be considered ready without an explicit
  toggle

#### Scenario: Bot drives events at launch

- **GIVEN** a match with one or more AI seats
- **WHEN** the match launches
- **THEN** the server SHALL instantiate a `BotPlayer` per AI seat
- **AND** bot-generated intents SHALL NOT traverse the WebSocket layer
  (in-process only)

### Requirement: Readiness Gate

The system SHALL require every seat to be ready AND every human seat to
be occupied before the host may launch the match.

#### Scenario: Cannot launch with empty seat

- **GIVEN** a `'3v3'` match with 5 of 6 seats occupied and ready
- **WHEN** the host sends `Intent {kind: 'LaunchMatch'}`
- **THEN** the server SHALL respond `Error {code: 'NOT_READY',
reason: 'empty-seat'}`

#### Scenario: Cannot launch with unready human

- **GIVEN** a match where all seats are occupied but one human has
  `ready: false`
- **WHEN** the host sends `LaunchMatch`
- **THEN** the server SHALL respond `Error {code: 'NOT_READY',
reason: 'unready-player'}`

#### Scenario: Launch succeeds when fully ready

- **GIVEN** a match where all seats are occupied, all humans are
  ready, and all AI slots are configured
- **WHEN** the host sends `LaunchMatch`
- **THEN** the server SHALL emit `GameCreated` with the computed side
  assignments
- **AND** `IMatchMeta.status` SHALL become `'active'`
