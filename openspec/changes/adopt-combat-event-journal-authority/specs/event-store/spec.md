## ADDED Requirements

### Requirement: Match Streams Use the Shared Journal Authority
Each new authoritative match SHALL own one journal stream whose committed batches are the source for restart recovery, replay, and publication. Imported legacy matches SHALL preserve retained event identity and SHALL label any unrecorded prefix as a baseline rather than inventing facts.

#### Scenario: Match restarts from durable history
- **WHEN** the authoritative process restarts after a committed combat command
- **THEN** it SHALL rebuild the match from the journal to the same state digest
- **AND** the next accepted command SHALL append at the next contiguous revision

#### Scenario: Browser mirror diverges
- **WHEN** IndexedDB history is truncated, replaced, or no longer an immutable prefix of the committed match stream
- **THEN** the client SHALL stop treating the mirror as recoverable
- **AND** it SHALL request authoritative resynchronization without writing a false suffix
