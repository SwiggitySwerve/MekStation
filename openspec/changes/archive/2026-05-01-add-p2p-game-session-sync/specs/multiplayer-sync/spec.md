# multiplayer-sync Specification Delta

## ADDED Requirements

### Requirement: Peer Event Channel

The system SHALL provide a peer-to-peer channel that transmits
`IGameEvent` records between two peers in a shared sync room, in the
order they are appended on the authoring peer.

#### Scenario: Host-appended event reaches guest

- **GIVEN** a host peer and a guest peer in the same sync room with an
  active networked match
- **WHEN** the host engine appends an event via `appendEvent`
- **THEN** the event SHALL be broadcast on the peer channel
- **AND** the guest SHALL receive the event within the next animation
  frame
- **AND** the guest's mirror session SHALL apply the event via its own
  `appendEvent` reducer

#### Scenario: Event ordering preserved

- **GIVEN** the host appends events `E1`, `E2`, `E3` in that order
- **WHEN** the events arrive on the guest
- **THEN** they SHALL be applied to the guest's session in the same
  order
- **AND** the guest's `currentState` after `E3` SHALL match the host's
  `currentState` after `E3`

#### Scenario: Own events are not re-applied

- **GIVEN** the host broadcasts an event `E1`
- **WHEN** the host's own channel subscription receives `E1`
- **THEN** the host SHALL detect that `E1.authorPeerId === localPeerId`
- **AND** the host SHALL NOT append `E1` a second time

### Requirement: Host-Authoritative RNG

The system SHALL designate exactly one peer as the host in any networked
match, and all random rolls SHALL originate on the host and be embedded
in the event payload so the guest can replay them deterministically.

#### Scenario: Host generates rolls via default DiceRoller

- **GIVEN** a host engine resolving an initiative event
- **WHEN** the host's `rollInitiative()` is called
- **THEN** the default `DiceRoller` SHALL be used
- **AND** the resulting dice values SHALL be stored on the emitted event
  under `payload.rolls`

#### Scenario: Guest replays rolls from event payload

- **GIVEN** a guest receiving a peer event with `payload.rolls = [3, 5]`
- **WHEN** the guest's mirror engine needs a dice result for the
  corresponding action
- **THEN** the guest's `replayDiceRoller` SHALL return those exact values
- **AND** the guest SHALL NOT invoke any non-deterministic randomness

#### Scenario: Two sessions converge under identical events

- **GIVEN** a seeded host session and a guest mirror session, both
  created from the same config
- **WHEN** the host plays out 5 full turns and every emitted event is
  replicated to the guest in order
- **THEN** at every event boundary the host and guest `currentState`
  SHALL be deep-equal

### Requirement: Host Election and Role Assignment

The system SHALL elect exactly one host per networked match and assign
the other participant the role `guest`.

#### Scenario: Room creator becomes host

- **GIVEN** a peer creates a sync room and launches a networked match
- **WHEN** the match session is created
- **THEN** that peer's role SHALL be `host`
- **AND** the peer id SHALL be recorded on the session under
  `hostPeerId`

#### Scenario: Second joiner becomes guest

- **GIVEN** a host has created a networked match in a sync room
- **WHEN** another peer joins the room and accepts the match
- **THEN** that peer's role SHALL be `guest`
- **AND** the peer id SHALL be recorded on the session under
  `guestPeerId`

#### Scenario: Third joiner is rejected

- **GIVEN** a networked 1v1 match already has a host and a guest
- **WHEN** a third peer joins the room and attempts to join the match
- **THEN** the match SHALL refuse the join
- **AND** the third peer's UI SHALL surface `"Match is full"`

### Requirement: Side Ownership

The system SHALL record which peer controls which game side, and SHALL
forbid local event production for sides not owned by the local peer.

#### Scenario: Peer cannot append for foreign side

- **GIVEN** a guest peer whose side is `GameSide.Opponent`
- **WHEN** the guest tries to append a MovementDeclared event for a unit
  whose `side` is `GameSide.Player`
- **THEN** the append SHALL be rejected
- **AND** the UI SHALL surface a `peer-rejected` toast

#### Scenario: Intent round-trip for owned side

- **GIVEN** a guest peer whose side is `GameSide.Opponent`
- **WHEN** the guest commits a movement for a unit they control
- **THEN** the guest SHALL broadcast an `IGameIntent` with type
  `declareMovement` to the host
- **AND** the host SHALL validate the intent and append a corresponding
  `MovementLocked` event
- **AND** the resulting event SHALL replicate back to the guest

### Requirement: Abort on Host Disconnect

The system SHALL end a networked match with `reason: 'aborted'` if the
host peer disconnects during an active session.

#### Scenario: Host disconnect aborts the guest's session

- **GIVEN** an active networked match
- **WHEN** the host peer's Yjs awareness is lost for more than
  5 seconds
- **THEN** the guest's session SHALL append a local `GameEnded` event
  with `reason: 'aborted'` and `winner: 'draw'`
- **AND** the guest's UI SHALL route to the victory screen with
  `"Match aborted — host disconnected"`

### Requirement: Intent Protocol for Guest Actions

The system SHALL define an `IGameIntent` contract that the guest uses to
request actions the host must validate and execute.

#### Scenario: Intent shape

- **GIVEN** a guest wants to commit an action
- **WHEN** the intent is constructed
- **THEN** it SHALL include `type`, `payload`, and `authorPeerId`
- **AND** `type` SHALL be one of `declareMovement`, `declareAttack`,
  `declarePhysical`, `confirmHeat`, `endPhase`, `concede`

#### Scenario: Host rejects intent for out-of-phase action

- **GIVEN** the session is in the Movement phase
- **WHEN** the host receives a `declareAttack` intent from the guest
- **THEN** the host SHALL NOT append an event
- **AND** the host SHALL broadcast a `peer-rejected` notification to the
  guest indicating `reason: 'wrong-phase'`
