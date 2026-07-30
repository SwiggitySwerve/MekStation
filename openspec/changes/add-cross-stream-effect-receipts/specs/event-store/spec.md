## ADDED Requirements

### Requirement: Cross-Stream Effects Use Durable Outbox and Inbox Receipts
A source-stream transaction SHALL persist each requested cross-stream effect in an outbox row with immutable canonical semantic-command UTF-8 bytes, command-schema and canonicalizer versions, digest, source stream/branch/event and effective generation, effect type/version, and server-derived target authority plus binding revision. A worker SHALL load those durable bytes after restart and SHALL NOT regenerate the command from current projections. Before target append, a leased row SHALL be atomically promoted to durable admitted state against the unfenced source generation; the admission SHALL bind that complete identity, both versions, and digest. Ingestion SHALL re-resolve the authoritative source-to-target binding, validate and re-canonicalize the delivered command under its stored versions, and verify the admitted delivery token, binding revision, active target branch, canonical bytes, and digest. The target-stream transaction SHALL persist the uniquely target-scoped inbox receipt, both versions, digest, and resulting target event batch atomically. Delivery MAY retry, but the effect SHALL apply once.

#### Scenario: Target commit succeeds but acknowledgement is lost
- **WHEN** the target stream commits the inbox receipt and event batch but the source does not receive acknowledgement
- **THEN** matching redelivery SHALL find and return the original target receipt before applying a current target-head precondition
- **AND** it SHALL not append another target event batch

#### Scenario: First delivery payload disagrees with admission
- **WHEN** a delivery's independently derived semantic-command digest differs from its admitted outbox digest
- **THEN** target ingestion SHALL return a typed integrity conflict
- **AND** it SHALL append no inbox receipt, target event, or projection mutation

#### Scenario: Committed receipt identity is retried with changed content
- **WHEN** a delivery matches an existing target-scoped receipt identity but not its semantic-command digest
- **THEN** target ingestion SHALL return a typed integrity conflict rather than the prior receipt
- **AND** it SHALL append no target event or projection mutation

#### Scenario: Replay reads source fact
- **WHEN** source history is replayed
- **THEN** the projector SHALL not dispatch the outbox effect
- **AND** only committed pending outbox rows SHALL be eligible for delivery

#### Scenario: Process restarts after source commit
- **WHEN** the source outcome and outbox commit but the process stops before delivery
- **THEN** recovery SHALL deliver the stored canonical command bytes under their stored schema and canonicalizer versions
- **AND** it SHALL NOT derive replacement command content from current projection state

#### Scenario: Effect names the wrong campaign
- **WHEN** delivery target identity disagrees with the authoritative match-to-campaign binding or current target authority scope
- **THEN** target ingestion SHALL reject with a typed scope conflict
- **AND** it SHALL append no inbox receipt, campaign event, or projection mutation

### Requirement: Effect Command Digest Is Reproducible
`EffectCommandCanonicalizer` v1 SHALL apply RFC 8785 JSON canonicalization to UTF-8 digest-material bytes containing `canonicalizerVersion`, effect type/version, source stream/ID/branch/event/effective-generation, target campaign and binding revision, command schema version, and the complete server-derived semantic command. It SHALL preserve command array order, perform no Unicode normalization, reject non-finite or unsupported values, and encode SHA-256 as lowercase hexadecimal. Source and target SHALL use the same implementation. The canonical bytes and both versions SHALL persist with the source outbox; both versions and digest SHALL persist with admission and receipt. The bytes and digest SHALL remain server-internal rather than enter viewer timelines or exports.

#### Scenario: Equivalent command objects hash identically
- **WHEN** source and target canonicalize a fixed v1 effect command whose object keys are deliberately shuffled
- **THEN** both SHALL produce the published UTF-8 fixture bytes and lowercase digest
- **AND** reordering object keys SHALL NOT change the digest

#### Scenario: Semantic command material changes
- **WHEN** any included identity, version, binding, schema, or command field changes, or an unsupported value is supplied
- **THEN** a valid changed input SHALL produce a different digest and an unsupported input SHALL be rejected
- **AND** no source outbox or target receipt SHALL be written for a rejected input

#### Scenario: Pending effect uses an unsupported stored version
- **WHEN** a worker or target cannot execute the outbox row's command-schema or canonicalizer version after an upgrade
- **THEN** the effect SHALL enter typed `blocked` state without regenerating, reinterpreting, or applying the command
- **AND** target authority SHALL remain unchanged until a compatible implementation handles the stored bytes

### Requirement: Effect Delivery Admission Is Generation-Fenced
Outbox delivery state SHALL be durable as `pending`, `leased`, `admitted`, `delivered`, `superseded`, or `blocked`. A lease SHALL bind an opaque token, expiry, and source effective generation but SHALL NOT authorize target mutation. Lease-to-admitted promotion and source-generation fence installation SHALL serialize in the source store. A fence SHALL stop new leases and admissions for that generation, supersede unleased pending rows, and allow non-admitted leases to expire. An admitted token SHALL remain durable until its idempotent target receipt is known. Target ingestion SHALL reject leased-only, unknown-admission, or mismatched delivery without a receipt or target mutation.

#### Scenario: Source generation is fenced while an effect is leased
- **WHEN** a source-generation fence commits while one of that generation's outbox rows is leased but not admitted
- **THEN** the lease SHALL NOT become admitted after the fence
- **AND** no new lease or admission SHALL be issued for that generation

#### Scenario: Lease expires before target append
- **WHEN** a worker presents a lease without a durable delivery admission or after its expiry
- **THEN** target ingestion SHALL reject without an inbox receipt or event batch
- **AND** the fenced source MAY supersede the non-admitted row

#### Scenario: Admission commits before a source-generation fence
- **WHEN** delivery admission commits before a source-generation fence
- **THEN** the admitted token SHALL remain valid only for its bound effect until the target receipt is known
- **AND** the fence SHALL NOT silently revoke, duplicate, or reinterpret that admitted effect

### Requirement: Cross-Stream Causality Does Not Duplicate Authority
Source event, delivery attempts, target receipt, and target event range SHALL share correlation and causation identities while remaining distinct records in their owning streams.

#### Scenario: Match outcome changes campaign
- **WHEN** a terminal match outcome produces campaign consequences
- **THEN** the match event SHALL remain owned by the match stream
- **AND** the campaign SHALL own a causally linked reconciliation event rather than a duplicate match event
