# game-session-management Specification Delta

## ADDED Requirements

### Requirement: Session Creation from Peer-Sourced Loadouts

The system SHALL accept a session-creation configuration that sources
one side's loadout from a remote peer's vault, so networked matches can
start with units neither player had to pre-export.

#### Scenario: Create session with host + guest loadouts

- **GIVEN** a completed 1v1 lobby with `hostLoadout` and `guestLoadout`
- **WHEN** the host invokes session creation with
  `{hostLoadout, guestLoadout, mapConfig, hostPeerId, guestPeerId}`
- **THEN** a session SHALL be created with units from both loadouts
- **AND** `sideOwners[GameSide.Player]` SHALL equal `hostPeerId`
- **AND** `sideOwners[GameSide.Opponent]` SHALL equal `guestPeerId`
- **AND** the initial `GameCreated` event SHALL reference the remote
  guest's units even though the host's vault did not own them

#### Scenario: Guest units are not imported to host vault

- **GIVEN** a networked session created from a guest's loadout
- **WHEN** the host inspects their vault after session creation
- **THEN** the guest's units SHALL NOT appear in the host's vault
- **AND** the units SHALL exist only on the live session's event log

### Requirement: Match Id Propagation From Lobby

The system SHALL treat the `matchId` field written into lobby state as
the definitive session id, so both peers route to the same session
URL without out-of-band coordination.

#### Scenario: Both peers navigate via shared matchId

- **GIVEN** a host launches a match and the lobby state now contains
  `matchId: 'sess_abc123'`
- **WHEN** the guest observes the lobby update
- **THEN** the guest's router SHALL navigate to
  `/gameplay/games/sess_abc123`
- **AND** both peers' `InteractiveSession` instances SHALL use that
  same id
