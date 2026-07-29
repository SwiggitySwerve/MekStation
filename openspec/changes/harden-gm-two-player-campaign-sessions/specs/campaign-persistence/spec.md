## ADDED Requirements

### Requirement: Server Journal Is Campaign Authority
For a shared live campaign, the durable server journal and effective branch SHALL be the mutation authority. Browser-local Zustand, session storage, local activity logs, and materialized snapshots SHALL be projections or caches only.

#### Scenario: Browser state differs from server
- **WHEN** a client reconnects with stale or missing browser-local state
- **THEN** it SHALL hydrate from the authorized server baseline and tail before commands are enabled

#### Scenario: Materialized snapshot differs from journal
- **WHEN** recovery detects that a cached snapshot digest does not match authoritative replay
- **THEN** the system SHALL rebuild or block truthfully and SHALL not treat the stale snapshot as authority

### Requirement: Campaign Journal Migration Is Additive and Idempotent
The authority migration SHALL add journal, branch, participant, cursor, command-receipt, and projection metadata without deleting existing campaign snapshots. Backfill and cutover SHALL be idempotent and SHALL fail closed on ambiguous ownership.

#### Scenario: Existing campaign backfills once
- **WHEN** migration runs repeatedly for an eligible existing campaign
- **THEN** it SHALL produce one equivalent genesis branch and membership set without duplicate receipts or events

#### Scenario: Ambiguous ownership blocks cutover
- **WHEN** an existing campaign cannot unambiguously map units or forces to the two player slots
- **THEN** automatic cutover SHALL stop and require an audited GM remapping rather than infer ownership

#### Scenario: Rollback preserves authoritative history
- **WHEN** application rollback is required after cutover
- **THEN** committed journal, branch, receipt, and audit rows SHALL remain intact and the rollback path SHALL not rewrite them

### Requirement: Campaign Command Receipts Persist
Campaign command and idempotency receipts SHALL remain durable for the campaign authority lifetime.

#### Scenario: Retry after long disconnect is idempotent
- **WHEN** a client retries an uncertain prior campaign command after reconnect or process restart
- **THEN** the server SHALL return the prior receipt and SHALL not apply the mutation again

### Requirement: Campaign Activity Is a Role-Scoped Projection
Campaign activity feeds SHALL derive from authoritative journal and audit facts and SHALL be projected by viewer role rather than stored only in browser-global state.

#### Scenario: GM activity survives restart
- **WHEN** the GM reloads the campaign
- **THEN** authorized full campaign activity SHALL recover from durable facts

#### Scenario: Player activity omits private facts
- **WHEN** a player opens activity history
- **THEN** the feed SHALL include public and owned facts while excluding GM-private reasons and opposing-player hidden data

### Requirement: Same-Field Stale Updates Cannot Overwrite
The campaign persistence boundary SHALL validate server-authored commands against expected revision and declared affected fields. It SHALL NOT resolve a conflict by resubmitting the same stale whole-campaign envelope.

#### Scenario: Stale same-field write rejects
- **WHEN** a command attempts to change data modified since its expected revision
- **THEN** the server SHALL reject it with current revision and safe resync or rebase guidance and SHALL preserve the intervening change

#### Scenario: Disjoint command serializes
- **WHEN** a stale command affects fields disjoint from intervening committed facts and passes revalidation
- **THEN** the server MAY commit it at the current revision with full actor provenance

### Requirement: Recovery Quarantines Only the Affected Campaign
Campaign startup recovery SHALL validate journal continuity, branch lineage, projection digests, membership, and outcome-receipt uniqueness before enabling commands.

#### Scenario: Corrupt campaign is blocked
- **WHEN** one campaign fails recovery validation
- **THEN** that campaign SHALL show a truthful blocked state and SHALL publish no partial recovery while unrelated campaigns remain available

### Requirement: Retroactive Campaign Changes Rebuild Declared Families
A finalized retroactive correction SHALL create a replacement branch from a trusted base and SHALL declare every affected family before activation: campaign date, missions and contracts, finances, transactions, loans, reputation, rewards, salvage, repairs, inventory, roster, unit state, pilot state, personnel, markets, outcome receipts, scenario artifacts, activity, audit, and viewer projections.

#### Scenario: Time rewinds across day-pipeline effects
- **WHEN** the GM commits a rewind to before payroll, repair, medical, contract, or market effects
- **THEN** the system SHALL rebuild declared families from the trusted base and SHALL NOT represent the operation as a negative forward-day loop

#### Scenario: Retroactive contract correction rebuilds consequences
- **WHEN** the GM corrects a prior contract result after downstream effects committed
- **THEN** the replacement branch SHALL recompute every declared linked family and SHALL explicitly invalidate stale scenario artifacts

#### Scenario: Impact preview is non-mutating
- **WHEN** the GM requests the correction or rewind impact manifest
- **THEN** the system SHALL list affected days, scenarios, outcomes, families, and artifacts without changing the effective branch

### Requirement: Campaign Rebuild Is Gated
While a replacement campaign branch is rebuilding, client commands SHALL reject with retryable `PROJECTION_REBUILDING`; they SHALL NOT be queued invisibly. Activation SHALL occur only after deterministic state and every required viewer projection verify.

#### Scenario: Command during rebuild rejects
- **WHEN** a participant submits a campaign command during rebuild
- **THEN** the server SHALL return `PROJECTION_REBUILDING` with active branch and revision and SHALL append nothing

#### Scenario: Successful rebuild activates once
- **WHEN** all declared state, receipt, artifact, audit, and viewer-projection checks pass
- **THEN** one atomic branch activation SHALL make the replacement branch effective

#### Scenario: Failed rebuild preserves prior authority
- **WHEN** any rebuild check fails
- **THEN** the candidate branch SHALL remain blocked and the prior effective branch SHALL remain authoritative
