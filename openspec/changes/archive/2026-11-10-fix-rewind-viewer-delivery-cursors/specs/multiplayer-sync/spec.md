## ADDED Requirements

### Requirement: Match Supersession Invalidates Durable Viewer Resume Data Atomically

Match-tail supersession SHALL delete every durable viewer delivery record and
acknowledgement for that match in the same transaction as the event, publication
outbox and command-receipt supersession. It SHALL preserve other matches' data
and existing superseded authority history.

#### Scenario: Rewind replays to attached viewers

- **WHEN** a live rewind discards in-memory delivery cursors and replays the rebuilt stream
- **THEN** new delivery records SHALL start at zero without primary-key collisions or persist-failure warnings
- **AND** a receipt from the superseded stream SHALL NOT prevent a lower receipt in the rebuilt stream

#### Scenario: Restart follows rewind

- **WHEN** a process reopens the durable store after a rewind and recovers the activated branch
- **THEN** it SHALL NOT restore superseded delivery mappings or acknowledgements
- **AND** the resumed replay SHALL persist only rebuilt-stream delivery records without collisions

#### Scenario: A later supersession statement fails

- **WHEN** receipt deletion fails after viewer resume data was deleted inside the transaction
- **THEN** delivery records, acknowledgements and live authority rows SHALL remain unchanged
- **AND** other matches' rows SHALL remain unchanged

#### Scenario: Coordinated correction leaves the live counter running

- **WHEN** coordinated source correction supersedes storage without resetting the live viewer counter
- **THEN** continued delivery SHALL NOT collide with superseded durable slots
- **AND** a non-contiguous durable record SHALL be rejected on reload so resume falls back to full replay instead of restoring a shifted mapping
