## ADDED Requirements

### Requirement: Closed lobby is inert and its host reopens it

A P2P lobby marked `closed` before launch SHALL NOT be launchable. While
`closed`, the lobby SHALL reject `joinGuest`, `setReady`, loadout and map
edits, `setHostSide` and `launch` with a local `lobby-closed` rejection and
SHALL leave its state unchanged, and `canLaunchLobby` SHALL be false. The
lobby panel SHALL say "This lobby is closed" and disable ready, launch, loadout
and map controls. A peer SHALL NOT close the lobby because it sees itself
missing from awareness, and a lobby that is already closed SHALL NOT be
rewritten by a later peer disconnect. On a host route, a lobby that is
`closed` with no `matchId` SHALL be replaced by a fresh lobby owned by the
local peer, whether the close arrived live from a guest or was restored from
persistence. A launched lobby (`matchId` set) SHALL never be replaced.

#### Scenario: Closed lobby cannot launch

- **GIVEN** a lobby with both sides ready that is marked `closed`
- **WHEN** the host launches
- **THEN** the launch SHALL be rejected as `lobby-closed` and no `matchId` SHALL be written
- **AND** building a session from that lobby SHALL fail

#### Scenario: Guest closes the lobby while the host is present

- **GIVEN** a host on the lobby page and a guest that no longer sees the host
- **WHEN** the guest marks the lobby `closed`
- **THEN** the host SHALL replace it with a fresh open lobby it owns

#### Scenario: Returning host finds a persisted closed lobby

- **GIVEN** the room's persisted lobby state is `closed` with no `matchId`
- **WHEN** the host opens the lobby page on a host route
- **THEN** the host SHALL start a fresh open lobby for its own peer id
- **AND** a guest route SHALL leave the closed state unchanged

#### Scenario: Peer sees only itself missing

- **GIVEN** an open lobby
- **WHEN** the local peer reports its own id as disconnected
- **THEN** the lobby SHALL remain open
