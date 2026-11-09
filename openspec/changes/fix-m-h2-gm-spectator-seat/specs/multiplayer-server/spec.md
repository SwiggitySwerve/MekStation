## ADDED Requirements

### Requirement: The host's own spectator seat is never released as a viewer registration

The server SHALL release a spectator seat when its holder's last socket detaches
only when that seat is a viewer registration, meaning it is not held by the match's
`hostPlayerId`. The seat a co-op campaign GM host holds SHALL survive a detach in
every match status, SHALL keep that GM a match member, and SHALL leave the host
privilege with the GM when host migration is refused for a campaign GM. A viewer's
seat SHALL still be released.

#### Scenario: The GM's socket drops in an active match

- **GIVEN** an active co-op campaign match whose GM holds a spectator seat
- **WHEN** the GM's last socket detaches
- **THEN** the GM's seat and membership SHALL remain and the GM SHALL be able to bind again
- **AND** `hostPlayerId` SHALL remain the GM

#### Scenario: A viewer leaves beside the GM

- **GIVEN** a registered viewer and the GM both hold spectator seats
- **WHEN** the viewer's last socket detaches
- **THEN** only the viewer's seat SHALL be released
