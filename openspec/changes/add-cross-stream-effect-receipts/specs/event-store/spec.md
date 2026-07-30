## ADDED Requirements

### Requirement: Cross-Stream Effects Use Durable Outbox and Inbox Receipts
A source-stream transaction SHALL persist each requested cross-stream effect in an outbox row with immutable source stream/branch/event, source effective generation, and server-derived target authority identities. Before target append, a leased row SHALL be atomically promoted to durable admitted state against the unfenced source generation. Ingestion SHALL re-resolve the authoritative source-to-target binding and verify the admitted delivery token plus target branch/revision. The target-stream transaction SHALL persist a uniquely target-scoped inbox receipt and resulting target event batch atomically. Delivery MAY retry, but the effect SHALL apply once.

#### Scenario: Target commit succeeds but acknowledgement is lost
- **WHEN** the target stream commits the inbox receipt and event batch but the source does not receive acknowledgement
- **THEN** redelivery SHALL return the original target receipt
- **AND** it SHALL not append another target event batch

#### Scenario: Replay reads source fact
- **WHEN** source history is replayed
- **THEN** the projector SHALL not dispatch the outbox effect
- **AND** only committed pending outbox rows SHALL be eligible for delivery

#### Scenario: Effect names the wrong campaign
- **WHEN** delivery target identity disagrees with the authoritative match-to-campaign binding or current target authority scope
- **THEN** target ingestion SHALL reject with a typed scope conflict
- **AND** it SHALL append no inbox receipt, campaign event, or projection mutation

### Requirement: Effect Delivery Admission Is Generation-Fenced
Outbox delivery state SHALL be durable as `pending`, `leased`, `admitted`, `delivered`, `superseded`, or `blocked`. A lease SHALL bind an opaque token, expiry, and source effective generation but SHALL NOT authorize target mutation. Lease-to-admitted promotion and source-generation fence installation SHALL serialize in the source store. A fence SHALL stop new leases and admissions, supersede unleased pending rows, and allow non-admitted leases to expire. An admitted token SHALL remain durable until its idempotent target receipt is known. Target ingestion SHALL reject leased-only, unknown-admission, or mismatched delivery without a receipt or target mutation.

#### Scenario: Activation encounters an active old-generation lease
- **WHEN** branch activation fences the prior effective generation while one of its outbox rows is leased
- **THEN** no new old-generation lease SHALL be issued
- **AND** the lease SHALL NOT become admitted after the fence and the prior branch SHALL remain effective until it expires

#### Scenario: Lease expires before target append
- **WHEN** a worker presents a lease without a durable delivery admission or after its expiry
- **THEN** target ingestion SHALL reject without an inbox receipt or event batch
- **AND** the fenced source MAY supersede the non-admitted row

#### Scenario: Target accepts while activation waits
- **WHEN** delivery admission serialized before the generation fence and commits its target receipt while activation waits
- **THEN** activation SHALL observe the receipt and require a higher-version correction
- **AND** it SHALL not silently cancel or duplicate the accepted consequence

### Requirement: Cross-Stream Causality Does Not Duplicate Authority
Source event, delivery attempts, target receipt, and target event range SHALL share correlation and causation identities while remaining distinct records in their owning streams.

#### Scenario: Match outcome changes campaign
- **WHEN** a terminal match outcome produces campaign consequences
- **THEN** the match event SHALL remain owned by the match stream
- **AND** the campaign SHALL own a causally linked reconciliation event rather than a duplicate match event
