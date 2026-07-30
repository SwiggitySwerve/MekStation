## ADDED Requirements

### Requirement: Campaign Catch-Up and Live Delivery Have No Subscription Gap
The server SHALL establish a high-water mark and buffered live subscription before completing authorized campaign catch-up. Each viewer SHALL receive a contiguous delivery sequence that does not reveal hidden authority gaps.

#### Scenario: Event commits during catch-up
- **WHEN** a new campaign event commits while a client is replaying through the captured high-water mark
- **THEN** the server SHALL buffer or resynchronize that viewer
- **AND** the client SHALL not apply the live event ahead of a missing authorized delivery

#### Scenario: Viewer acknowledges only applied events
- **WHEN** a projected event fails validation or reducer application
- **THEN** the client SHALL not advance its acknowledgement cursor
- **AND** the server SHALL resume from the highest durable contiguous acknowledgement
