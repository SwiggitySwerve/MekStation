# multiplayer-game-surface Delta — reconcile-multiplayer-coop-reality

## ADDED Requirements

### Requirement: Lobby Terminal Multiplayer-Unavailable State

The lobby surface SHALL render a terminal "multiplayer unavailable" state
instead of reconnecting indefinitely when the WebSocket transport cannot
serve a match. When the socket closes with the not-yet-wired stub marker,
or after a bounded number of failed reconnect attempts, the lobby SHALL
stop the auto-reconnect loop, render a terminal panel naming multiplayer
as unavailable, and offer a route back. This prevents the lobby from
hammering the stub server (which closes every socket) with no
user-visible resolution.

#### Scenario: Stub close yields a terminal panel, not a reconnect loop

- **GIVEN** a player on `/multiplayer/lobby/[roomCode]` whose socket closes
  with the not-yet-wired stub marker (`server.js:277`, `code: 1011`,
  `reason: 'wave-2-stub'`)
- **WHEN** the lobby handles the close
- **THEN** the lobby SHALL render a terminal "multiplayer unavailable"
  panel
- **AND** the lobby SHALL stop the auto-reconnect loop rather than
  re-opening a socket against the stub.

#### Scenario: Bounded reconnect failures resolve to the terminal state

- **GIVEN** a lobby whose socket repeatedly fails to establish a live
  session
- **WHEN** the configured reconnect-attempt bound is exceeded
- **THEN** the lobby SHALL transition to the terminal
  multiplayer-unavailable state
- **AND** the terminal panel SHALL offer a route back to the multiplayer
  hub.

#### Scenario: A live session is unaffected by the terminal-state gate

- **GIVEN** the live transport is wired and the lobby establishes a normal
  session
- **WHEN** the lobby renders
- **THEN** the lobby SHALL show the lobby panel (and, on `status: 'active'`,
  the networked game surface) per the existing surface requirements
- **AND** the terminal multiplayer-unavailable state SHALL NOT be shown for
  a healthy live session.
