# multiplayer-sync Specification Delta

## ADDED Requirements

### Requirement: Lobby State Shared Over Yjs

The system SHALL store pre-match lobby state in a shared Y.Map on the
existing sync room, so both peers see the same loadouts and map config
as they assemble a match.

#### Scenario: Lobby state shape

- **GIVEN** a host has created a networked 1v1 lobby
- **WHEN** the lobby is inspected
- **THEN** the shared state SHALL include `mode: '1v1'`, `hostPeerId`,
  `guestPeerId`, `hostLoadout`, `guestLoadout`, `mapConfig`,
  `hostReady`, `guestReady`, and optional `matchId`

#### Scenario: Peer update visible on other peer

- **GIVEN** both peers are on the lobby page
- **WHEN** the host edits `mapConfig.radius` from 10 to 14
- **THEN** the guest's page SHALL display `radius: 14` without reload

#### Scenario: Peer cannot modify foreign loadout slot

- **GIVEN** the host tries to update `guestLoadout`
- **WHEN** the lobby channel receives that update
- **THEN** the update SHALL be rejected
- **AND** a `peer-rejected` notification SHALL be surfaced locally with
  `reason: 'unauthorized-slot'`

### Requirement: Loadout Picking

The system SHALL let each peer pick their side's mechs and pilots from
their own local vault before the match launches.

#### Scenario: Host picks 2 mechs and 2 pilots

- **GIVEN** the host is on the lobby page
- **WHEN** the host selects 2 mechs and assigns 1 pilot each
- **THEN** `hostLoadout.units` SHALL contain 2 entries
- **AND** `hostLoadout.pilots` SHALL contain 2 entries
- **AND** the guest's view SHALL display the same 2 entries (read-only)

#### Scenario: Mismatched side counts blocks readiness

- **GIVEN** the host has picked 3 mechs and the guest has picked 2 mechs
- **WHEN** either peer attempts to toggle ready
- **THEN** the ready toggle SHALL be disabled
- **AND** a hint SHALL display `"Both sides must pick the same number
of mechs"`

### Requirement: Readiness and Launch

The system SHALL require both peers to mark themselves ready before the
host may launch the match, and SHALL lock the loadouts at launch.

#### Scenario: Both peers ready enables launch button

- **GIVEN** `hostReady = true` and `guestReady = true` and loadouts are
  valid
- **WHEN** the host's UI renders
- **THEN** the "Launch Match" button SHALL be enabled
- **AND** the guest's UI SHALL show `"Waiting for host to launch..."`

#### Scenario: Host launches match

- **GIVEN** both peers are ready
- **WHEN** the host clicks "Launch Match"
- **THEN** a new game session SHALL be created with both loadouts
  deployed per side
- **AND** `matchId` SHALL be written into the lobby state
- **AND** both peers SHALL navigate to `/gameplay/games/[matchId]`

#### Scenario: Guest cannot launch

- **GIVEN** both peers are ready
- **WHEN** the guest's UI renders
- **THEN** no launch button SHALL be visible to the guest

### Requirement: Lobby Survives Peer Reconnect (Pre-Launch)

The system SHALL keep the lobby Y.Map alive across transient peer
disconnects before a match has launched.

#### Scenario: Guest reconnect restores lobby view

- **GIVEN** a guest on the lobby with `guestLoadout` populated
- **WHEN** the guest disconnects and reconnects within 60 seconds
- **THEN** the guest SHALL land back on the lobby page
- **AND** the guest's previously-picked loadout SHALL still be present
- **AND** the guest's `guestReady` flag SHALL be `false` (auto-reset)

#### Scenario: Host disconnect closes lobby

- **GIVEN** an active lobby with a host and a guest
- **WHEN** the host disconnects for more than 60 seconds
- **THEN** the lobby SHALL be marked `closed`
- **AND** the guest SHALL be navigated to the landing page with a toast
  `"Host left the lobby"`
