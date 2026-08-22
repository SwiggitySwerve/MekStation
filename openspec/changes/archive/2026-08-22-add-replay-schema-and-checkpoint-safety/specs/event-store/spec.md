## ADDED Requirements

### Requirement: Event Schema Evolution Is Explicit and Deterministic
Each normalized replay event SHALL identify its original event type and an explicit schema version. Journal events SHALL retain their stored version; a versionless legacy event MAY receive baseline v1 only through a named source-format adapter. Replay SHALL validate the stored payload with a strict concrete schema and apply a registered pure upcast path before the current projector consumes it, while leaving the stored payload unchanged. The registered baseline set SHALL exactly cover every canonical event discriminant that the domain claims to support. Generic unknown/any payloads, unconstrained records, passthrough/catch-all objects, structural type guards, or representative-only fixtures MUST NOT establish payload support. Event schema version and projector version SHALL remain separate identities.

#### Scenario: Supported historical version replays
- **WHEN** replay reads an older supported event version
- **THEN** registered upcasters SHALL deterministically produce the current payload
- **AND** repeated replay SHALL produce the same result digest without changing the stored row

#### Scenario: Baseline registry is exhaustive and concrete
- **WHEN** the current campaign or combat event discriminant set is compared with its composed baseline registry
- **THEN** every discriminant SHALL have one explicit current target schema and at least one valid and invalid payload fixture
- **AND** a missing registration, placeholder validator, missing field, extra field, or ill-typed field SHALL fail validation rather than establish support

#### Scenario: Named legacy format supplies baseline version
- **WHEN** replay reads a versionless event from a registered legacy source-format identifier and format version
- **THEN** that adapter MAY attribute the event to its declared baseline schema v1 after binding exact pre-parse bytes for a byte-backed source or a versioned canonical pre-normalization snapshot for an object-backed source
- **AND** normalization or caller mutation SHALL NOT change the bound source evidence or digest
- **AND** replay SHALL reject an unknown format/version or a missing journal `eventVersion` instead of applying a global implicit version default

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

#### Scenario: Required replay input is absent
- **WHEN** a supported event requires resolved randomness, time, catalog, rules, or external provenance that its stored payload or pinned reference does not provide
- **THEN** replay SHALL return a typed unsupported-history result
- **AND** it SHALL NOT recompute the input from current services or publish partial state

### Requirement: Checkpoints Are Verified Disposable Caches
A checkpoint SHALL identify stream, branch, revision, the deterministic fingerprint of every target schema and upcaster transition used for its prefix, projector ID/version, source digest, and state digest. Recovery MAY use a compatible checkpoint plus a contiguous tail, but full replay SHALL remain authoritative and MUST produce the same result.

#### Scenario: Compatible checkpoint matches full replay
- **WHEN** the checkpoint identities and digests match the requested history
- **THEN** checkpoint-plus-tail and full replay SHALL produce identical state and viewer-projection digests

#### Scenario: Checkpoint is incompatible or corrupt
- **WHEN** a schema-pipeline fingerprint, projector version, source digest, state digest, or tail continuity check fails
- **THEN** recovery SHALL discard that checkpoint and use an earlier valid base or quarantine the affected scope
- **AND** it SHALL NOT publish the incompatible state

#### Scenario: Upcast pipeline changes without a projector change
- **WHEN** a target schema or upcaster registration changes while the projector ID/version remains unchanged
- **THEN** the prior checkpoint's schema-pipeline fingerprint SHALL no longer be compatible
- **AND** recovery SHALL rebuild from an earlier compatible base or full replay

### Requirement: Corruption Isolated to One Authority Scope
Before replacement branches exist, recovery SHALL validate event identity, the deterministic root-branch identity, contiguous stream revisions, receipt uniqueness, canonicalizer compatibility, and required predecessor/event digests before admitting commands or publication. Full parent/base/supersession lineage validation SHALL become mandatory when `add-authoritative-history-branches` introduces branch records.

#### Scenario: Healthy session survives another session corruption
- **WHEN** one campaign or match fails recovery validation
- **THEN** only that authority scope SHALL be quarantined
- **AND** a healthy control scope SHALL continue accepting and publishing committed commands

## MODIFIED Requirements

### Requirement: Chunked Storage
The system MAY retain mission-aligned chunks and SHALL treat checkpoints as immutable acceleration artifacts rather than authority. Every checkpoint SHALL bind its owning stream/branch revision, schema-pipeline fingerprint, projector ID/version, source-tail digest, and state digest. A checkpoint that is incompatible or corrupt SHALL be discarded without changing authoritative events.

#### Scenario: Compatible checkpoint accelerates recovery
- **GIVEN** a checkpoint whose identities and digests match the requested root-branch history
- **WHEN** recovery loads the checkpoint and contiguous tail
- **THEN** the result SHALL equal full replay
- **AND** the checkpoint SHALL remain replaceable without changing authority

#### Scenario: Incompatible checkpoint is ignored
- **GIVEN** a checkpoint with a mismatched schema-pipeline fingerprint, projector version, source digest, state digest, or tail
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

#### Scenario: Intentional no-state-change is explicit
- **GIVEN** a supported event that does not change a projector's state
- **WHEN** the projector registry processes that event
- **THEN** it SHALL use a named, versioned, tested no-state-change registration
- **AND** a missing projector handler SHALL fail closed rather than be interpreted as an implicit no-op
