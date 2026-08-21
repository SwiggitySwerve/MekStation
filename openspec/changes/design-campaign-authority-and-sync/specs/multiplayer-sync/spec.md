## ADDED Requirements

### Requirement: Campaign Catch-Up and Live Delivery Have No Subscription Gap
The server SHALL establish a buffered live subscription and capture a high-water mark through a coordinated boundary in which buffering is active before the journal head is observed. It SHALL complete authorized campaign catch-up through that mark, then drain contiguous buffered delivery above it with overlap deduplication. Each viewer SHALL receive a contiguous delivery sequence that does not reveal hidden authority gaps.

#### Scenario: Event commits during catch-up
- **WHEN** a new campaign event commits while a client is replaying through the captured high-water mark
- **THEN** the server SHALL buffer or resynchronize that viewer
- **AND** the client SHALL not apply the live event ahead of a missing authorized delivery

#### Scenario: Event commits while the high-water boundary is established
- **WHEN** an event commits after buffering is active but before the journal head is captured
- **THEN** it SHALL appear in catch-up, the buffer, or both
- **AND** overlap deduplication SHALL deliver it exactly once without a replay/live gap

#### Scenario: Viewer acknowledges only applied events
- **WHEN** a projected event fails validation or reducer application
- **THEN** the client SHALL not advance its acknowledgement cursor
- **AND** the server SHALL resume from the highest durable contiguous acknowledgement
