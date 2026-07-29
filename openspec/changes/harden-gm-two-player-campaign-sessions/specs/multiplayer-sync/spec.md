## ADDED Requirements

### Requirement: Delivery Is At-Least-Once and Application Is Exactly-Once
The synchronization protocol SHALL permit at-least-once replay and live delivery while requiring idempotent server effects and exactly-once client reducer application using stable event identity and the viewer's delivery sequence.

#### Scenario: Duplicate frame applies once
- **WHEN** the same projected event arrives more than once
- **THEN** the client SHALL apply it once and SHALL acknowledge only the resulting contiguous delivery sequence

#### Scenario: Replay and live overlap applies once
- **WHEN** replay and live delivery overlap for the same event
- **THEN** the client SHALL deduplicate by branch, delivery sequence, event identity, and projection digest

### Requirement: Stable Intent Identity Survives Retries
The client SHALL create a stable intent identifier and idempotency identity before first send, persist them for the pending attempt, and reuse them until a terminal receipt is known.

#### Scenario: Reconnect retries same identity
- **WHEN** the connection drops after intent submission and before receipt
- **THEN** the client SHALL retry with the same identity rather than create a new command

#### Scenario: Terminal receipt clears pending state
- **WHEN** the client receives a committed, rejected, vetoed, timed-out, or integrity-conflict receipt
- **THEN** it SHALL clear only the matching pending command state

### Requirement: Authority and Viewer Sequences Are Separate
The server SHALL maintain a private global authority sequence and SHALL assign a gapless delivery sequence independently for each viewer projection stream. Player payloads SHALL NOT expose hidden authority identifiers or gaps that reveal concealed events.

#### Scenario: Hidden GM event creates no player gap
- **WHEN** a GM-only event advances the authority sequence
- **THEN** each player SHALL continue receiving a gapless authorized delivery sequence with no identifier that reveals the hidden event

#### Scenario: Viewer cursor resumes correct stream
- **WHEN** a participant reconnects
- **THEN** replay SHALL resume from that participant's branch and delivery cursor rather than a global player-visible authority sequence

### Requirement: Sequence Gaps and Collisions Fail Explicitly
The client SHALL track the next contiguous viewer delivery sequence and SHALL stop normal application on a gap or conflicting identity.

#### Scenario: Missing delivery requests resync
- **WHEN** a delivery sequence arrives beyond the next expected value
- **THEN** the client SHALL enter syncing or behind state and request a missing tail or fresh authorized baseline

#### Scenario: Sequence collision blocks
- **WHEN** two different event identities or projection digests claim the same branch and delivery sequence
- **THEN** the client SHALL enter a typed integrity-blocked state and SHALL not advance its cursor

### Requirement: Acknowledgements Are Durable After Application
The client SHALL acknowledge a delivery sequence only after its projected reducer successfully applies the event, and the server SHALL persist the participant's highest contiguous acknowledgement.

#### Scenario: Reducer failure does not acknowledge
- **WHEN** client application fails
- **THEN** the client SHALL not acknowledge the failed sequence and SHALL request controlled recovery

#### Scenario: Restart resumes after last applied event
- **WHEN** the client and server restart after prior acknowledgements
- **THEN** replay SHALL resume after the last durably acknowledged contiguous delivery sequence

### Requirement: Heartbeat Is Bidirectional
The sync protocol SHALL define client and server heartbeat messages and SHALL reset liveness only on valid protocol traffic.

#### Scenario: Quiet connection stays active
- **WHEN** no gameplay event occurs and both peers exchange valid heartbeat traffic
- **THEN** the connection SHALL remain active

#### Scenario: Missing response triggers reconnect
- **WHEN** a peer fails to answer beyond the configured liveness timeout
- **THEN** only that participant SHALL transition to disconnected and reconnecting state

### Requirement: Catch-Up Is Chunked and Memory-Bounded
Replay and resynchronization SHALL use bounded chunks and SHALL honor per-viewer authorization on every chunk.

#### Scenario: Large tail catches up in chunks
- **WHEN** a player is 1,000 or more eligible events behind
- **THEN** the server SHALL stream bounded chunks and the client SHALL apply them contiguously without unbounded queue growth

#### Scenario: Live tail during catch-up is bounded
- **WHEN** new events commit while replay is in progress
- **THEN** the client SHALL buffer or resynchronize within configured limits and SHALL not apply live events ahead of a gap
