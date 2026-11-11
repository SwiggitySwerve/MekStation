## MODIFIED Requirements

### Requirement: Action Lifecycle Provenance Is Idempotent and Separate
The authority SHALL preserve append-once provenance for accepted, rejected, vetoed, timed-out, and published command lifecycles. Accepted records SHALL link to committed batches and publication receipts. Rejected, vetoed, and timed-out records SHALL remain access-controlled audit facts and SHALL create no gameplay event, outbox row, projection mutation, or player delivery-sequence entry. Repeating the same terminal command identity SHALL return the existing audit record. A rejected row SHALL appear in the action timeline and match-history export only when its server-derived actor principal equals the requesting viewer principal, including GM viewers. Other viewers SHALL receive no rejected command identity, class, timestamp, actor, or row. Committed-event projection SHALL retain its existing authorization rules. Timeline digests SHALL describe the requesting viewer's returned rows and MAY differ across viewers.

#### Scenario: Invalid command is retried
- **WHEN** the same invalid command identity and digest is delivered repeatedly
- **THEN** exactly one terminal rejection-audit record SHALL exist
- **AND** gameplay history and player delivery sequences SHALL remain unchanged

#### Scenario: Accepted command publishes
- **WHEN** an accepted command commits and its viewer-safe result publishes
- **THEN** action provenance SHALL link server-derived actor, command receipt, committed event range, and publication receipt
- **AND** it SHALL not duplicate the domain events

#### Scenario: Vetoed or timed-out action resolves
- **WHEN** policy vetoes a pending action or its authoritative deadline expires
- **THEN** one terminal lifecycle record SHALL preserve the safe reason and causal identity
- **AND** no uncommitted requested mutation SHALL appear as gameplay fact

#### Scenario: Sender reads a retained refusal
- **GIVEN** an authorized player or GM submitted a refused command
- **WHEN** that principal reads the action timeline or full match-history export
- **THEN** both surfaces SHALL include that principal's own rejected row
- **AND** the rejection SHALL remain durably available to server operators

#### Scenario: Other viewers read after a refusal
- **GIVEN** another principal's refused command is durably audited
- **WHEN** a player, spectator, or GM requests history, a reconnect baseline, timeline, or full export
- **THEN** the returned surfaces SHALL contain nothing about that refusal
- **AND** previously committed events SHALL retain each viewer's existing projection

### Requirement: Audit Captures Action Provenance
Every accepted, rejected, vetoed, timed-out, corrected, superseded, rebuilt, and published action SHALL preserve actor identity, authenticated role, command identity, expected and resulting branch/revision, reason reference, causality, audience classification, timestamps, result, and integrity digests appropriate to that action.

Rejected commands SHALL be written append-once to a separate access-controlled rejection-audit store before the terminal rejection is returned. The record SHALL be idempotently keyed by session and command identity, SHALL contain only actor, safe rejection class, base branch/revision, recovery action, timestamps, and integrity linkage, and SHALL create no gameplay journal event, recipient outbox row, cursor movement, committed replay/export fact, or player-visible secret. Timeline and export reads SHALL apply the sender-only rejection projection defined by Action Lifecycle Provenance Is Idempotent and Separate.

#### Scenario: Rejected action remains auditable
- **WHEN** a command rejects without a domain mutation
- **THEN** exactly one authorized rejection-audit record SHALL retain the actor, rejection class, base branch/revision, and recovery action across retries without creating a committed gameplay fact
- **AND** only the sender SHALL receive that rejected row through the action timeline or match-history export, including when another viewer is a GM

#### Scenario: Publication preserves audience provenance
- **WHEN** one authority fact produces different GM, Player 1, and Player 2 projections
- **THEN** the audit system SHALL retain authorized projection digests and delivery outcomes without storing private fields in player-safe records
