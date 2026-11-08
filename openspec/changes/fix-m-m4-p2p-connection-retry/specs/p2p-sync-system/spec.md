## MODIFIED Requirements

### Requirement: Sync Room Management

The system SHALL manage P2P sync room lifecycle including creation, joining, and cleanup.

#### Scenario: Create sync room

- **GIVEN** a user wants to share their vault
- **WHEN** they create a room with optional password
- **THEN** a Yjs document is created
- **AND** a WebRTC provider is initialized with the room code
- **AND** IndexedDB persistence is enabled for offline support
- **AND** the room becomes the active room
- **AND** connection state transitions to "connecting"

#### Scenario: Join existing room

- **GIVEN** a user has a valid room code
- **WHEN** they join the room with optional password
- **THEN** a Yjs document is created for that room
- **AND** WebRTC provider connects to the room
- **AND** existing room data syncs from peers
- **AND** the user appears in peer lists

#### Scenario: Leave room

- **GIVEN** a user is connected to a room
- **WHEN** they leave the room
- **THEN** the WebRTC provider disconnects
- **AND** IndexedDB persistence is destroyed
- **AND** the Yjs document is destroyed
- **AND** connection state transitions to "disconnected"
- **AND** a "disconnected" event is emitted
- **AND** no reconnection attempt is scheduled or left pending for that room
- **AND** the room is not recreated by a later timer

#### Scenario: Switching rooms

- **GIVEN** a user holds an active room
- **WHEN** they create or join a different room
- **THEN** any reconnection pending for the previous room is cancelled
- **AND** the new room remains the active room

#### Scenario: Automatic reconnection

- **GIVEN** a user is connected to a room
- **WHEN** the provider reports the connection as lost
- **THEN** reconnection attempts begin with exponential backoff
- **AND** retry delays are: 1s, 2s, 4s, 8s, 16s (capped at 30s)
- **AND** jitter (0-20%) is added to prevent thundering herd
- **AND** each attempt emits a "reconnecting" event with attempt, maxAttempts and delayMs
- **AND** each attempt re-arms the same provider, keeping the same Yjs document and room options
- **AND** no "disconnected" event is emitted and the active room is not replaced
- **AND** after 5 failed attempts, reconnection stops and an "error" event is emitted

### Requirement: Connection State Management

The system SHALL track and expose connection state for UI display.

#### Scenario: Connection state transitions

- **GIVEN** a sync room lifecycle
- **WHEN** state changes occur
- **THEN** state transitions follow: disconnected → connecting → connected
- **OR** connected → connecting (reconnecting, room retained) → connected
- **OR** connecting → error (retries exhausted)
- **AND** state changes emit events to listeners
- **AND** the state is "connected" only while an active room is held

#### Scenario: Peer tracking

- **GIVEN** peers join and leave the room
- **WHEN** peer events occur
- **THEN** "peer-joined" events include peer ID and connection time
- **AND** "peer-left" events include peer ID
- **AND** the peer list is updated in the store
- **AND** peer count is calculated excluding self

#### Scenario: Retry state exposure

- **GIVEN** reconnection is in progress
- **WHEN** UI queries retry state
- **THEN** isRetrying flag indicates active retry
- **AND** attempts shows current retry count
- **AND** maxAttempts shows retry limit (5)
- **AND** the connection quality indicator reads "Reconnecting" while connecting with attempts above 0
