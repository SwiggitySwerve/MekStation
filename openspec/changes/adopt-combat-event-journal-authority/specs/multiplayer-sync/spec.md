## ADDED Requirements

### Requirement: Combat Synchronization Resumes from Durable Committed History
Combat replay, reconnect, and live delivery SHALL originate from committed journal history and SHALL preserve contiguous per-stream application. The client SHALL acknowledge only after its reducer successfully applies a committed projected event.

#### Scenario: Replay overlaps live delivery
- **WHEN** a reconnecting client receives the same projected event through replay and live delivery
- **THEN** it SHALL apply the event once by stable identity and sequence
- **AND** it SHALL not acknowledge past a missing or conflicting revision

#### Scenario: Process restarts during reconnect
- **WHEN** the server restarts while a client is behind
- **THEN** replay SHALL resume from the durable applied cursor
- **AND** the client SHALL converge on the same committed state digest
