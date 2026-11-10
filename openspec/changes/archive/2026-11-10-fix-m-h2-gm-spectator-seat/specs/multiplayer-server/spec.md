## ADDED Requirements

### Requirement: Automatic cleanup keeps the live host's own spectator seat

The server SHALL release a spectator seat during automatic cleanup, meaning the
last-socket detach and the boot sweep, only when that seat is not held by the
match's `hostPlayerId` or the match is completed. While the match is live, the seat
a co-op campaign GM host holds SHALL survive a detach in every match status, SHALL
keep that GM a match member, and SHALL leave the host privilege with the GM when
host migration is refused for a campaign GM. A viewer's seat SHALL still be
released. The rule SHALL apply to automatic cleanup only: it SHALL NOT change the
seat removal primitives, explicit close (`DELETE`, `closeMatch`), or the removal of
a completed match.

#### Scenario: The GM's socket drops in an active match

- **GIVEN** an active co-op campaign match whose GM holds a spectator seat
- **WHEN** the GM's last socket detaches
- **THEN** the GM's seat and membership SHALL remain and the GM SHALL be able to bind again
- **AND** `hostPlayerId` SHALL remain the GM

#### Scenario: A viewer leaves beside the GM

- **GIVEN** a registered viewer and the GM both hold spectator seats
- **WHEN** the viewer's last socket detaches
- **THEN** only the viewer's seat SHALL be released

#### Scenario: The match is over

- **GIVEN** a completed match whose GM still holds a spectator seat
- **WHEN** the GM's last socket detaches
- **THEN** the GM's seat SHALL be released like any other spectator seat

#### Scenario: Explicit close

- **GIVEN** a live match with a GM bound
- **WHEN** the match is closed through `DELETE` or `closeMatch`
- **THEN** the match SHALL be completed, the GM's socket SHALL be closed, and a later bind SHALL be refused as an unknown match
