## ADDED Requirements

### Requirement: Timeline Preserves Branch and Supersession Lineage
The audit timeline SHALL represent effective, building, blocked, and superseded branches without deleting prior facts.

#### Scenario: GM inspects rewind lineage
- **WHEN** the GM opens a rewound combat or campaign timeline
- **THEN** the view SHALL show the selected base, old and new branches, cutoff, actor, reason, invalidated artifacts, rebuild result, and effective head

#### Scenario: Player inspects rewound timeline
- **WHEN** a player opens the same timeline
- **THEN** the view SHALL show the authorized public or owned correction and branch transition without GM-private reason or hidden facts

### Requirement: Audit Captures Action Provenance
Every accepted, rejected, vetoed, timed-out, corrected, superseded, rebuilt, and published action SHALL preserve actor identity, authenticated role, command identity, expected and resulting branch/revision, reason reference, causality, audience classification, timestamps, result, and integrity digests appropriate to that action.

Rejected commands SHALL be written append-once to a separate access-controlled rejection-audit store before the terminal rejection is returned. The record SHALL be idempotently keyed by session and command identity, SHALL contain only actor, safe rejection class, base branch/revision, recovery action, timestamps, and integrity linkage, and SHALL create no gameplay journal event, recipient outbox row, cursor movement, replay/export fact, or player-visible secret.

#### Scenario: Rejected action remains auditable
- **WHEN** a command rejects without a domain mutation
- **THEN** exactly one authorized rejection-audit record SHALL retain the actor, rejection class, base branch/revision, and recovery action across retries without creating a committed gameplay fact or exposing the record through player surfaces

#### Scenario: Publication preserves audience provenance
- **WHEN** one authority fact produces different GM, Player 1, and Player 2 projections
- **THEN** the audit system SHALL retain authorized projection digests and delivery outcomes without storing private fields in player-safe records

### Requirement: Combat and Campaign Causality Is Traceable
The timeline SHALL link combat terminal facts, outcome outbox, campaign inbox receipt, campaign consequence batch, later corrections, and supersession.

#### Scenario: Trace outcome into campaign
- **WHEN** an authorized viewer selects a reconciled combat outcome
- **THEN** the timeline SHALL trace to the receipt and campaign event range appropriate to that viewer

#### Scenario: Trace corrected outcome
- **WHEN** a later outcome version supersedes the first
- **THEN** the timeline SHALL retain both versions and SHALL identify the effective consequence branch

### Requirement: Private GM Audit Is Separate and Access-Controlled
GM-private reasons, draft metadata, and hidden impact details SHALL live in a separate server-only record whose authorization is enforced before lookup. Player-safe timeline rows and exports SHALL contain none of those fields.

#### Scenario: Player requests private record
- **WHEN** a player directly requests a GM-private audit identifier
- **THEN** authorization SHALL fail without disclosing existence, content, or correlated authority sequence

#### Scenario: GM opens private record
- **WHEN** the authenticated GM requests the private audit detail
- **THEN** the server SHALL return it with access itself recorded in the audit trail

### Requirement: Timeline and Export Use the Same Viewer Projection
Timeline queries and audit exports SHALL use the same durable viewer context and projection rules as live and replay delivery.

#### Scenario: Player timeline and export agree
- **WHEN** a player exports a timeline range
- **THEN** the export SHALL contain the same authorized facts and no additional private fields

#### Scenario: Superseded history remains authorized
- **WHEN** an authorized viewer includes superseded branches
- **THEN** each branch fact SHALL still be projected according to that viewer's permissions at query time

### Requirement: Rewind Impact Preview Is Auditable but Non-Mutating
Generating an impact preview SHALL record an authorized GM review action without changing campaign or combat state.

#### Scenario: Preview lists affected domains
- **WHEN** the GM previews a campaign rewind
- **THEN** the preview SHALL list affected dates, missions, contracts, finances, transactions, loans, roster, units, pilots, salvage, repairs, inventory, markets, outcome receipts, scenario artifacts, activity, and audit projections

#### Scenario: Cancelled preview changes nothing
- **WHEN** the GM cancels the preview
- **THEN** no branch or gameplay mutation SHALL occur
