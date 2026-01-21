# vault-sync Specification

## Purpose
TBD - created by archiving change add-p2p-vault-sync. Update Purpose after archive.
## Requirements
### Requirement: Peer Connection Management

The system SHALL provide peer-to-peer connection capabilities for real-time vault synchronization.

#### Scenario: Create sync room

- **GIVEN** a user wants to share their vault
- **WHEN** they click "Create Sync Room"
- **THEN** a unique room code is generated
- **AND** the room code is displayed for sharing
- **AND** the user becomes the room host

#### Scenario: Join sync room

- **GIVEN** a user has a room code from another player
- **WHEN** they enter the room code and click "Join"
- **THEN** a WebRTC connection is established
- **AND** they appear in the host's peer list
- **AND** sync begins automatically

#### Scenario: Connection failure

- **GIVEN** a user attempts to join a room
- **WHEN** the connection fails (timeout, invalid code, etc.)
- **THEN** an error message is displayed
- **AND** the user can retry or enter a different code

### Requirement: Real-Time Sync

The system SHALL synchronize vault items between connected peers in real-time using CRDTs.

#### Scenario: Unit sync

- **GIVEN** two peers are connected
- **WHEN** peer A modifies a synced unit
- **THEN** the change appears on peer B within 2 seconds
- **AND** no data is lost

#### Scenario: Concurrent edits

- **GIVEN** two peers edit the same unit simultaneously
- **WHEN** the edits are synced
- **THEN** changes are merged using CRDT rules
- **AND** both peers see the same final state

#### Scenario: Offline changes

- **GIVEN** a peer goes offline
- **WHEN** they make changes while offline
- **AND** they reconnect
- **THEN** offline changes sync to other peers
- **AND** conflicts are resolved automatically

### Requirement: Selective Sync

The system SHALL allow users to choose which vault items to sync.

#### Scenario: Enable sync for item

- **GIVEN** a user has a unit in their vault
- **WHEN** they enable sync for that unit
- **THEN** the unit is marked for synchronization
- **AND** it syncs to connected peers

#### Scenario: Disable sync

- **GIVEN** a synced unit
- **WHEN** the user disables sync
- **THEN** the unit stops syncing
- **AND** peers retain their last-synced copy

### Requirement: Sync Status Display

The system SHALL display sync status for vault items and connections.

#### Scenario: Show sync indicator

- **GIVEN** a synced vault item
- **WHEN** viewing the vault
- **THEN** a sync badge shows the item's sync state
- **AND** states include: synced, pending, syncing, conflict

#### Scenario: Show connection status

- **GIVEN** the user is in a sync room
- **WHEN** viewing the sync panel
- **THEN** connection quality is displayed
- **AND** connected peer count is shown

