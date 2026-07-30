## ADDED Requirements

### Requirement: Action Lifecycle Provenance Is Idempotent and Separate
The authority SHALL preserve append-once provenance for accepted, rejected, vetoed, timed-out, and published command lifecycles. Accepted records SHALL link to committed batches and publication receipts. Rejected, vetoed, and timed-out records SHALL remain access-controlled audit facts and SHALL create no gameplay event, outbox row, projection mutation, or player delivery-sequence entry. Repeating the same terminal command identity SHALL return the existing audit record.

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

### Requirement: Private Audit Access Is Itself Auditable
Every lookup, export attempt, retention action, or erasure/redaction of a GM-private record SHALL require current authorization and SHALL append a safe access-audit record without copying the private payload.

#### Scenario: GM opens private reason
- **WHEN** an active authorized GM reads a private correction reason
- **THEN** the lookup SHALL succeed through the private repository
- **AND** an access record SHALL identify actor, scope, purpose, and time without embedding the reason

#### Scenario: Player requests private record
- **WHEN** a player or inactive member requests a private audit reference
- **THEN** the server SHALL disclose neither existence nor content beyond the viewer-safe projection policy
- **AND** it SHALL record a safe denied-access audit result
