# multiplayer-game-surface Specification

## Purpose

Defines Multiplayer Game Surface requirements for Networked Game Surface, Client Mirror Session From Event Stream, Intent Emission Over the Server WebSocket, and Turn-Ownership Gate, preserving the source-of-truth scope introduced by archived change complete-multiplayer-game-surface.

## Requirements
### Requirement: Networked Game Surface

The system SHALL render a playable networked game surface whenever a match a player has joined transitions to `status === 'active'`, replacing the prior placeholder. The surface SHALL render the tactical map from a client mirror of the authoritative session and SHALL collect the player's actions as intents.

#### Scenario: Active match renders the game surface

- **GIVEN** a player connected to a match in `status: 'lobby'`
- **WHEN** the match transitions to `status: 'active'`
- **THEN** the surface SHALL render the networked tactical map instead of a placeholder
- **AND** the surface SHALL NOT direct the player to the single-player gameplay route

#### Scenario: Lobby surface still renders before launch

- **GIVEN** a match in `status: 'lobby'`
- **WHEN** the page renders
- **THEN** the lobby panel SHALL be shown
- **AND** the networked game surface SHALL NOT be mounted

### Requirement: Client Mirror Session From Event Stream

The system SHALL build a client mirror `IGameSession` by applying every received `IGameEvent` through the `appendEvent` reducer in ascending `sequence` order. The mirror SHALL be the render input for the tactical map and SHALL NOT be mutated by local controls or local engine resolution.

#### Scenario: Mirror reflects authoritative state

- **GIVEN** a networked match with events broadcast by the server
- **WHEN** the client applies each `Event` to the mirror session in `sequence` order
- **THEN** the mirror's `currentState` SHALL match the authoritative server state at the same `sequence`

#### Scenario: Join replay rebuilds the board

- **GIVEN** a player joining a match already in progress
- **WHEN** the server streams `ReplayStart`, one or more `ReplayChunk`, and `ReplayEnd` followed by live `Event` messages
- **THEN** the mirror SHALL apply the replayed events before the live events in one continuous `sequence` order
- **AND** the resulting board SHALL be identical to that of a continuously-connected player

#### Scenario: Mirror is never mutated locally

- **GIVEN** a player using the networked game surface
- **WHEN** the player triggers a movement control
- **THEN** the mirror session SHALL NOT change until the corresponding server `Event` arrives
- **AND** no local engine resolution SHALL be run against the mirror

### Requirement: Intent Emission Over the Server WebSocket

The system SHALL encode each player action as an `IGameIntent` wrapped in an `Intent` envelope and send it over the existing match WebSocket. The client SHALL NOT resolve actions locally and SHALL wait for the server's broadcast `Event` to update the mirror.

#### Scenario: Player action becomes an intent

- **GIVEN** a player on the networked game surface during their side's movement phase
- **WHEN** the player declares a movement for a unit they own
- **THEN** the client SHALL send an `Intent` envelope carrying a `declareMovement` `IGameIntent`
- **AND** the unit SHALL move on the map only after the server's resulting `Event` is applied to the mirror

#### Scenario: Rejected intent surfaces without breaking the surface

- **GIVEN** a player who submits an action the server rejects
- **WHEN** the server replies with an `Error` envelope
- **THEN** the surface SHALL show a non-fatal notification with the rejection reason
- **AND** the WebSocket connection SHALL remain open
- **AND** the mirror session SHALL be unchanged

### Requirement: Turn-Ownership Gate

The system SHALL enable intent-producing controls only when the local player's side is the active side for a phase that accepts that side's intents. At all other times the surface SHALL render a passive "waiting for opponent" indicator.

#### Scenario: Controls enabled on the local side's turn

- **GIVEN** a networked match whose current phase is the movement phase for the local player's side
- **WHEN** the surface renders
- **THEN** the movement controls SHALL be enabled

#### Scenario: Controls disabled during the opponent's turn

- **GIVEN** a networked match whose current phase belongs to the opponent's side
- **WHEN** the surface renders
- **THEN** intent-producing controls SHALL be disabled
- **AND** a "waiting for opponent" indicator SHALL be shown

### Requirement: Opponent Move Rendering Under Fog of War

The system SHALL render opponent moves from the server `Event` stream, including fog-redacted events, without crashing. A unit the local player cannot currently see SHALL be drawn at its last-known position with a "last seen" indicator, and the surface SHALL NOT animate an event it never received.

#### Scenario: Opponent unit animates on a visible move

- **GIVEN** a fog-on networked match and an opponent unit within the local player's line of sight
- **WHEN** the server broadcasts a movement event for that unit
- **THEN** the opponent unit SHALL move on the local map

#### Scenario: Hidden unit shows last-known position

- **GIVEN** a fog-on networked match and an opponent unit that has moved out of the local player's line of sight
- **WHEN** the local client stops receiving that unit's events
- **THEN** the unit SHALL be drawn at its last-known position with a "last seen" indicator
- **AND** the surface SHALL NOT crash attempting to animate an unreceived event

### Requirement: Connection-Lifecycle Surfacing in the Game Surface

The system SHALL surface the connection-lifecycle states the server broadcasts — `MatchPaused`, `MatchResumed`, and `Close` — within the networked game surface.

#### Scenario: Pause overlay blocks input

- **GIVEN** a player in an active networked match
- **WHEN** the server broadcasts `MatchPaused`
- **THEN** the surface SHALL render a blocking overlay naming the pending seat(s) and the grace countdown
- **AND** intent-producing controls SHALL be disabled

#### Scenario: Resume restores play

- **GIVEN** a networked game surface showing the pause overlay
- **WHEN** the server broadcasts `MatchResumed`
- **THEN** the overlay SHALL be removed
- **AND** intent-producing controls SHALL be re-enabled per the turn-ownership gate

#### Scenario: Close renders a terminal panel

- **GIVEN** a player in an active networked match
- **WHEN** the server broadcasts `Close`
- **THEN** the surface SHALL render a terminal panel
- **AND** the panel SHALL offer a route back to the multiplayer hub

### Requirement: Lobby Terminal Multiplayer-Unavailable State

The lobby surface SHALL render a terminal "multiplayer unavailable" state instead of reconnecting indefinitely when the WebSocket transport cannot serve a match. When the socket closes with a terminal server binding error, or after a bounded number of failed reconnect attempts, the lobby SHALL stop the auto-reconnect loop, render a terminal panel naming multiplayer as unavailable, and offer a route back. This prevents the lobby from hammering an unavailable server path with no user-visible resolution.

#### Scenario: Terminal server close yields a panel, not a reconnect loop

- **GIVEN** a player on `/multiplayer/lobby/[roomCode]` whose socket closes with a typed terminal binding error from the server (`runtime-unavailable`, `bind-failed`, or `dispatch-failed`)
- **WHEN** the lobby handles the close
- **THEN** the lobby SHALL render a terminal "multiplayer unavailable" panel
- **AND** the lobby SHALL stop the auto-reconnect loop rather than re-opening a socket against the unavailable server path.

#### Scenario: Bounded reconnect failures resolve to the terminal state

- **GIVEN** a lobby whose socket repeatedly fails to establish a live session
- **WHEN** the configured reconnect-attempt bound is exceeded
- **THEN** the lobby SHALL transition to the terminal multiplayer-unavailable state
- **AND** the terminal panel SHALL offer a route back to the multiplayer hub.

#### Scenario: A live session is unaffected by the terminal-state gate

- **GIVEN** the live transport is wired and the lobby establishes a normal session
- **WHEN** the lobby renders
- **THEN** the lobby SHALL show the lobby panel (and, on `status: 'active'`, the networked game surface) per the existing surface requirements
- **AND** the terminal multiplayer-unavailable state SHALL NOT be shown for a healthy live session.
