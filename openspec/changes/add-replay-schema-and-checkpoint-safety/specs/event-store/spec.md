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
Recovery SHALL validate event identity, contiguous stream revisions, branch lineage, receipt uniqueness, and required digests before admitting commands or publication.

#### Scenario: Healthy session survives another session corruption
- **WHEN** one campaign or match fails recovery validation
- **THEN** only that authority scope SHALL be quarantined
- **AND** a healthy control scope SHALL continue accepting and publishing committed commands
