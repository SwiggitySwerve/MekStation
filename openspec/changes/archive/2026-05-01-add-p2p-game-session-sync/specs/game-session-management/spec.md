# game-session-management Specification Delta

## ADDED Requirements

### Requirement: Host-Authoritative Networked Sessions

The system SHALL support a networked mode where exactly one peer hosts
the authoritative session and other peers run mirror sessions that apply
events received over a peer channel.

#### Scenario: Host session owns the engine

- **GIVEN** a networked match with `hostPeerId=P1` and `guestPeerId=P2`
- **WHEN** events are appended
- **THEN** only the peer whose `localPeerId === hostPeerId` SHALL invoke
  phase resolvers, dice rolls, and damage pipelines
- **AND** the guest peer's engine SHALL remain idle aside from applying
  events received on the peer channel

#### Scenario: Intent-mediated guest actions

- **GIVEN** a guest wants their unit to move
- **WHEN** the guest's UI commits the action
- **THEN** the commit SHALL produce an `IGameIntent` on the peer channel
  instead of appending a local event
- **AND** the host SHALL validate the intent and, on success, append the
  corresponding event

### Requirement: Abort End Condition

The system SHALL accept `'aborted'` as a valid `reason` on `GameEnded`
events for sessions terminated by host disconnect or equivalent fatal
transport failure in networked play.

#### Scenario: Aborted reason accepted

- **GIVEN** a networked match whose host has disconnected
- **WHEN** the guest's client appends `GameEnded` with
  `{winner: 'draw', reason: 'aborted'}`
- **THEN** the event SHALL be accepted
- **AND** `currentState.status` SHALL become `GameStatus.Completed`

#### Scenario: Aborted session blocks further appends

- **GIVEN** a session ended with `reason: 'aborted'`
- **WHEN** any subsequent `appendEvent` call is attempted
- **THEN** the call SHALL throw `"Game is not active"` per existing
  lifecycle rules

### Requirement: Peer Ownership on Session

The system SHALL record peer ownership on networked sessions so rule
engines and UI can distinguish authoritative vs. mirror participants.

#### Scenario: Session carries host and guest peer ids

- **GIVEN** a networked 1v1 match is created
- **WHEN** the session is inspected
- **THEN** it SHALL carry `hostPeerId: string` and
  `guestPeerId: string | null` (null until guest joins)
- **AND** it SHALL carry `sideOwners: Record<GameSide, string>`
  mapping each side to the peer id that controls its units

#### Scenario: Local session has no peer ownership

- **GIVEN** a hot-seat (non-networked) match
- **WHEN** the session is inspected
- **THEN** `hostPeerId` and `guestPeerId` SHALL both be `null`
- **AND** `sideOwners` SHALL be `null` or an empty object
