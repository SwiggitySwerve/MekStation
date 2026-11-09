## ADDED Requirements

### Requirement: Boot recovery releases crash-leftover spectator seats

The server SHALL release every viewer's spectator seat of every active match during
the full boot recovery pass, because no socket survives a restart, and SHALL do so
through the guarded seat writer so the release is revision-checked. The seat the
co-op GM host holds SHALL be kept, since it is that GM's match membership. The
release SHALL leave playing seats, the roster, side assignments, match status and
retained viewer delivery cursors unchanged, SHALL write nothing for a match without a spectator
seat, and SHALL NOT stop recovery of other matches when one release fails. A
recovery scoped to a single match id SHALL NOT release spectator seats.

#### Scenario: A crash left spectators behind

- **GIVEN** an active match whose persisted seats include spectator seats and no sockets
- **WHEN** the server boots and runs the full recovery pass
- **THEN** every spectator seat SHALL be gone and the playing seats SHALL be unchanged

#### Scenario: A co-op GM sits in a spectator seat

- **GIVEN** an active co-op campaign match whose GM host holds a spectator seat beside registered viewers
- **WHEN** the server boots and runs the full recovery pass
- **THEN** the viewers' seats SHALL be gone and the GM's seat and match membership SHALL remain

#### Scenario: A co-op host is rebuilt at runtime

- **GIVEN** a spectator has registered for an active match and not yet attached
- **WHEN** recovery runs scoped to that match id
- **THEN** the spectator seat SHALL remain

#### Scenario: Lobby and completed matches

- **GIVEN** lobby and completed matches that carry a spectator seat
- **WHEN** the full recovery pass runs
- **THEN** their metadata SHALL be unchanged

### Requirement: A refused spectator registers again once and resumes

The spectate page SHALL register again, once, when its socket is refused with
`AUTH_REJECTED`, and SHALL then rebind so the viewer resumes without a page reload.
It SHALL allow at most one such registration between two successful binds, SHALL
NOT register for any other close, and SHALL show a registration the server refuses
as an error without retrying.

#### Scenario: The server restarted and released the seat

- **GIVEN** a spectator is watching and the server restarts, releasing their seat
- **WHEN** the reconnect is refused with `AUTH_REJECTED`
- **THEN** the page SHALL register once, rejoin the session and drain the replay

#### Scenario: Registration is refused

- **GIVEN** the match completed while the viewer was disconnected
- **WHEN** the page registers again and the server answers 409
- **THEN** the page SHALL show "Cannot spectate" with the server's reason and open no further socket

#### Scenario: The rebind is refused too

- **GIVEN** a registration was accepted but the rebind is refused again
- **WHEN** no successful bind has happened since
- **THEN** the page SHALL NOT register a third time

### Requirement: The runner wire-intent lists follow the intent table routes

The repository SHALL fail its tests when the runner's engine wire-intent list differs
from the intent table's engine-routed kinds, or its non-combat list differs from the
table's lobby-routed and rewind-routed kinds.

#### Scenario: A kind is dropped from a runner list

- **GIVEN** a wire intent kind present in the intent table
- **WHEN** it is missing from the runner list for its route
- **THEN** the multiplayer intent-table test SHALL fail
