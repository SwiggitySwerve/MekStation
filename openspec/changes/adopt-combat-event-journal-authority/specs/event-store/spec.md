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

### Requirement: Combat Rollback Preserves Journal Authority
Each cut-over match SHALL persist an immutable baseline fact containing `(streamType, streamId, branchId, revision, digest, effectiveGeneration)`. The transaction that commits the first journal-authority command batch SHALL atomically append a one-time immutable `journal-authority-started` fact containing its command ID, event range, and resulting complete head tuple. Rollback MAY use a schema-compatible legacy reader only while the active head tuple is exactly the imported baseline and no started fact exists. After the first journal-authored batch, rollback SHALL stop new command and effect admission and SHALL use a reader compatible with the persisted journal schema, upcasters, and effective-generation contract or enter a typed blocked state. It SHALL preserve the committed rows, receipts, active head, effective generation, and projection recovery state and SHALL NOT substitute an incompatible legacy log or snapshot.

#### Scenario: Rollback occurs before the first journal command
- **WHEN** a cut-over match remains exactly at its imported baseline with no journal-authority command batch
- **THEN** rollback MAY reopen it through the compatible legacy reader
- **AND** the durable cutover marker and imported baseline SHALL remain unchanged

#### Scenario: Rollback occurs after a journal command
- **WHEN** at least one journal-authority command batch has committed
- **THEN** rollback SHALL reproduce the recorded active head through a compatible journal reader or expose a typed blocked state
- **AND** it SHALL admit no new command or effect through an incompatible legacy path

#### Scenario: Process stops after the first journal batch commits
- **WHEN** the first journal-authority batch transaction commits and the process stops before any later cutover bookkeeping
- **THEN** restart SHALL observe both the committed batch and its atomic `journal-authority-started` fact
- **AND** rollback SHALL NOT select the legacy reader
