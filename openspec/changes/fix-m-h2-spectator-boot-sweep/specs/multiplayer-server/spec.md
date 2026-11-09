## ADDED Requirements

### Requirement: Boot recovery releases crash-leftover spectator seats

The server SHALL release every spectator seat of every active match during the full
boot recovery pass, because no socket survives a restart, and SHALL do so through
the guarded seat writer so the release is revision-checked. The release SHALL leave
playing seats, the roster, side assignments, match status and retained viewer
delivery cursors unchanged, SHALL write nothing for a match without a spectator
seat, and SHALL NOT stop recovery of other matches when one release fails. A
recovery scoped to a single match id SHALL NOT release spectator seats.

#### Scenario: A crash left spectators behind

- **GIVEN** an active match whose persisted seats include spectator seats and no sockets
- **WHEN** the server boots and runs the full recovery pass
- **THEN** every spectator seat SHALL be gone and the playing seats SHALL be unchanged

#### Scenario: A co-op host is rebuilt at runtime

- **GIVEN** a spectator has registered for an active match and not yet attached
- **WHEN** recovery runs scoped to that match id
- **THEN** the spectator seat SHALL remain

#### Scenario: Lobby and completed matches

- **GIVEN** lobby and completed matches that carry a spectator seat
- **WHEN** the full recovery pass runs
- **THEN** their metadata SHALL be unchanged

### Requirement: The runner wire-intent lists follow the intent table routes

The repository SHALL fail its tests when the runner's engine wire-intent list differs
from the intent table's engine-routed kinds, or its non-combat list differs from the
table's lobby-routed and rewind-routed kinds.

#### Scenario: A kind is dropped from a runner list

- **GIVEN** a wire intent kind present in the intent table
- **WHEN** it is missing from the runner list for its route
- **THEN** the multiplayer intent-table test SHALL fail
