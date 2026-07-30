## ADDED Requirements

### Requirement: Event Schema Evolution Is Explicit and Deterministic
Each event SHALL retain its original event type and schema version. Replay SHALL validate the stored payload and apply a registered pure upcast path before the current projector consumes it, while leaving the stored payload unchanged. Event schema version and projector version SHALL remain separate identities.

#### Scenario: Supported historical version replays
- **WHEN** replay reads an older supported event version
- **THEN** registered upcasters SHALL deterministically produce the current payload
- **AND** repeated replay SHALL produce the same result digest without changing the stored row

#### Scenario: Unsupported history fails closed
- **WHEN** replay encounters an unknown type, unsupported version, invalid payload, or failed upcast
- **THEN** the affected authority scope SHALL enter a truthful quarantine
- **AND** no partial projection, publication, or side effect SHALL occur

### Requirement: Replay Captures Nondeterministic Inputs
Accepted history SHALL retain resolved outcomes or stable versioned input references for randomness, time, catalog data, rules data, and external responses needed by projection. Replay and upcast code MUST NOT draw randomness, read the current clock, call the network, or dispatch side effects.

#### Scenario: Historical combat uses prior resolved roll
- **WHEN** a combat event depended on a random roll
- **THEN** replay SHALL consume the stored resolved result or version-pinned input
- **AND** it SHALL NOT draw a new random value

### Requirement: Checkpoints Are Verified Disposable Caches
A checkpoint SHALL identify stream, branch, revision, projector ID/version, source digest, and state digest. Recovery MAY use a compatible checkpoint plus a contiguous tail, but full replay SHALL remain authoritative and MUST produce the same result.

#### Scenario: Compatible checkpoint matches full replay
- **WHEN** the checkpoint identities and digests match the requested history
- **THEN** checkpoint-plus-tail and full replay SHALL produce identical state and viewer-projection digests

#### Scenario: Checkpoint is incompatible or corrupt
- **WHEN** a projector version, source digest, state digest, or tail continuity check fails
- **THEN** recovery SHALL discard that checkpoint and use an earlier valid base or quarantine the affected scope
- **AND** it SHALL NOT publish the incompatible state

### Requirement: Corruption Isolated to One Authority Scope
Before replacement branches exist, recovery SHALL validate event identity, the deterministic root-branch identity, contiguous stream revisions, receipt uniqueness, canonicalizer compatibility, and required predecessor/event digests before admitting commands or publication. Full parent/base/supersession lineage validation SHALL become mandatory when the authoritative-history-branches change introduces branch records.

#### Scenario: Healthy session survives another session corruption
- **WHEN** one campaign or match fails recovery validation
- **THEN** only that authority scope SHALL be quarantined
- **AND** a healthy control scope SHALL continue accepting and publishing committed commands

## MODIFIED Requirements

### Requirement: Chunked Storage
The system MAY retain mission-aligned chunks and SHALL treat checkpoints as immutable acceleration artifacts rather than authority. Every checkpoint SHALL bind its owning stream/branch revision, projector ID/version, source-tail digest, and state digest. A checkpoint that is incompatible or corrupt SHALL be discarded without changing authoritative events.

#### Scenario: Compatible checkpoint accelerates recovery
- **GIVEN** a checkpoint whose identities and digests match the requested root-branch history
- **WHEN** recovery loads the checkpoint and contiguous tail
- **THEN** the result SHALL equal full replay
- **AND** the checkpoint SHALL remain replaceable without changing authority

#### Scenario: Incompatible checkpoint is ignored
- **GIVEN** a checkpoint with a mismatched projector version, source digest, state digest, or tail
- **WHEN** recovery validates it
- **THEN** recovery SHALL use an earlier valid base or full replay
- **AND** it SHALL publish no state derived from the incompatible cache

### Requirement: State Derivation
The system SHALL derive authoritative and viewer state through registered event-schema upcasters and versioned projectors. Stored payloads SHALL remain immutable, unknown history SHALL fail closed, and replay SHALL use only recorded resolved inputs or version-pinned references.

#### Scenario: Derive current state
- **GIVEN** a supported contiguous authority stream
- **WHEN** the registered projector replays its events
- **THEN** every payload SHALL validate and upcast through the declared schema path
- **AND** the final state and digest SHALL be deterministic

#### Scenario: Derive from checkpoint
- **GIVEN** a compatible checkpoint and contiguous events after it
- **WHEN** deriving state
- **THEN** checkpoint-plus-tail SHALL equal full replay
- **AND** no clock, random, network, or effect dispatcher SHALL be available

#### Scenario: Unsupported history blocks
- **GIVEN** an unknown event type/version, missing pinned input, failed upcast, or broken root integrity chain
- **WHEN** recovery attempts projection
- **THEN** the affected authority scope SHALL quarantine
- **AND** no partial state or side effect SHALL occur
