## ADDED Requirements

### Requirement: Cross-Stream Effects Use Durable Outbox and Inbox Receipts
A source-stream transaction SHALL persist each requested cross-stream effect in an outbox row with immutable source stream/branch/event, source effective generation, effect type/version, canonical semantic-command digest, and server-derived target authority plus binding revision. Before target append, a leased row SHALL be atomically promoted to durable admitted state against the unfenced source generation; the admission SHALL bind that complete identity and digest. Ingestion SHALL re-resolve the authoritative source-to-target binding, independently derive the delivered semantic-command digest, and verify the admitted delivery token, binding revision, active target branch, and digest. The target-stream transaction SHALL persist the uniquely target-scoped inbox receipt, its digest, and resulting target event batch atomically. Delivery MAY retry, but the effect SHALL apply once.

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

#### Scenario: Effect names the wrong campaign
- **WHEN** delivery target identity disagrees with the authoritative match-to-campaign binding or current target authority scope
- **THEN** target ingestion SHALL reject with a typed scope conflict
- **AND** it SHALL append no inbox receipt, campaign event, or projection mutation

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
