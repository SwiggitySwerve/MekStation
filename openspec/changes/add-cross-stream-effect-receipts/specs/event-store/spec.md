## ADDED Requirements

### Requirement: Cross-Stream Effects Use Durable Outbox and Inbox Receipts
A source-stream transaction SHALL persist each requested cross-stream effect in an outbox row with immutable source stream/branch/event and server-derived target authority identities. Before target append, ingestion SHALL re-resolve the authoritative source-to-target binding and verify the target branch/revision. The target-stream transaction SHALL persist a uniquely target-scoped inbox receipt and resulting target event batch atomically. Delivery MAY retry, but the effect SHALL apply once.

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

### Requirement: Cross-Stream Causality Does Not Duplicate Authority
Source event, delivery attempts, target receipt, and target event range SHALL share correlation and causation identities while remaining distinct records in their owning streams.

#### Scenario: Match outcome changes campaign
- **WHEN** a terminal match outcome produces campaign consequences
- **THEN** the match event SHALL remain owned by the match stream
- **AND** the campaign SHALL own a causally linked reconciliation event rather than a duplicate match event
