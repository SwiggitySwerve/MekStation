## ADDED Requirements

### Requirement: Branches Preserve Immutable Parent and Base Lineage
Each branch SHALL identify its stream, parent branch, base revision, base event identity, base digest, creator, reason, and status. Prior events SHALL remain immutable, and ordinary commands SHALL append only to the current effective branch without creating forks.

#### Scenario: Authorized rewind creates replacement branch
- **WHEN** an authorized rewind selects a trusted prior head
- **THEN** the journal SHALL create a building branch anchored to that immutable base
- **AND** the prior branch SHALL remain unchanged and effective until activation succeeds

#### Scenario: Ordinary player choice is accepted
- **WHEN** a player chooses one legal action among alternatives
- **THEN** the resulting command batch SHALL append linearly to the effective branch
- **AND** unchosen alternatives SHALL not become stored branches

### Requirement: Branch Activation Is Verified and Atomic
A candidate branch SHALL become effective only after deterministic replay, domain validation, affected-artifact validation, required viewer projections, and the prior-generation delivery fence pass. Fence installation SHALL serialize against lease-to-admitted promotion and prevent new prior-generation leases or admissions. While an existing lease remains unexpired or an admitted delivery lacks its reconciled receipt, the candidate SHALL remain non-effective and the prior branch SHALL remain effective. After every non-admitted lease has expired and every admitted delivery is reconciled, one transaction SHALL activate the candidate, increment the effective generation, and supersede the prior effective branch.

#### Scenario: Candidate verification fails
- **WHEN** replay, projection, integrity, or affected-artifact validation fails
- **THEN** the candidate SHALL remain blocked
- **AND** the prior branch SHALL remain authoritative

#### Scenario: Candidate waits for leased delivery
- **WHEN** verification passes but a prior-generation effect has an active lease
- **THEN** the candidate SHALL enter a non-effective waiting state
- **AND** activation SHALL not commit until the fence prevents admission and the lease expires, or a prior admission reaches its reconciliation receipt

### Requirement: Branch Promotion Revalidates Commands
The system SHALL NOT generically merge event sets or state snapshots. Promotion from a simulation or replacement branch SHALL revalidate semantic commands against the current target head and append newly authorized target events with provenance.

#### Scenario: Proposed command conflicts with current target
- **WHEN** a branch command no longer satisfies current funds, ownership, chronology, damage, or readiness invariants
- **THEN** promotion SHALL reject that command or require an explicit domain correction
- **AND** it SHALL not silently interleave the conflicting histories

### Requirement: Only the Effective Branch Dispatches Effects
Outbox effects belonging to a building, waiting, blocked, or superseded branch SHALL NOT acquire a delivery lease. Candidate activation SHALL first fence the prior effective generation, preventing new leases/admissions and superseding unleased pending rows. A lease alone SHALL NOT authorize target mutation. Final activation SHALL atomically make candidate rows dispatchable and supersede the prior branch only after non-admitted leases expire and admitted deliveries reach their required receipts/corrections. Effects with an accepted target receipt SHALL require a higher-version coordinated correction instead of cancellation.

#### Scenario: Candidate reaches terminal combat state
- **WHEN** a building combat branch contains a terminal outcome
- **THEN** its outcome outbox SHALL remain non-dispatchable until branch activation
- **AND** a failed candidate SHALL never affect the campaign

#### Scenario: Prior branch outcome already has a receipt
- **WHEN** activating a replacement would supersede an outcome already accepted by the campaign
- **THEN** activation SHALL require the coordinated higher-version correction workflow
- **AND** it SHALL not delete or silently cancel the accepted receipt

#### Scenario: Prior branch lease lands while activation waits
- **WHEN** old-generation delivery admission commits before the activation fence and its target receipt arrives while activation waits
- **THEN** the prior branch SHALL still be effective at target acceptance
- **AND** activation SHALL route through the higher-version correction workflow before supersession
