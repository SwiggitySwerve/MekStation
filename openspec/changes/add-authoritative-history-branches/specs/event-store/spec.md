## ADDED Requirements

### Requirement: Branches Preserve Immutable Parent and Base Lineage
Each branch SHALL identify its stream, opaque server-generated identity, parent branch, base revision, base event identity, base digest, creator, reason, and typed status. The root SHALL use a null base event, the defined genesis digest, and the linear stream's persisted effective generation `1`. Parent/base identity SHALL resolve in the same stream without cycles, and prior events and lineage SHALL remain immutable. Ordinary commands SHALL append only to the current effective branch.

#### Scenario: Authorized rewind creates replacement branch
- **WHEN** an authorized rewind selects a trusted prior head
- **THEN** the journal SHALL create a building branch anchored to that exact branch, revision, event, and digest
- **AND** the prior branch SHALL remain unchanged and effective until activation succeeds

#### Scenario: Invalid ancestry is proposed
- **WHEN** a parent/base does not resolve in the same stream, would form a cycle, or its event/digest does not match
- **THEN** branch creation SHALL reject without appending branch or domain records

#### Scenario: Ordinary player choice is accepted
- **WHEN** a player chooses one legal action among alternatives
- **THEN** the resulting command batch SHALL append linearly to the effective branch
- **AND** unchosen alternatives SHALL not become stored branches

### Requirement: Branch Resolution Preserves Contiguous Order and Integrity
A child head SHALL resolve the immutable parent prefix through its base revision followed by its own contiguous suffix beginning at `baseRevision + 1`. Every resolved event and checkpoint SHALL verify event identity, revision, digest linkage, event schema version, and projector compatibility before use.

#### Scenario: Authorized prior head is resolved
- **WHEN** an authorized reader requests an explicit branch and revision
- **THEN** the resolver SHALL return the verified parent prefix and child suffix at that head
- **AND** it SHALL not substitute the current effective head

#### Scenario: Branch suffix has a gap or digest mismatch
- **WHEN** resolution encounters a missing revision, wrong base, or broken digest chain
- **THEN** the branch SHALL be quarantined or blocked with a typed integrity error
- **AND** it SHALL not be activated or projected as authoritative

### Requirement: Effective Generation Is Positive and Monotonic
Effective generation SHALL be a positive safe integer stored with the effective head. The root linear stream SHALL begin at generation `1`. No replay, restart, backfill, candidate build, failed activation, or revision change SHALL alter it. A verified atomic activation SHALL increment the prior effective generation by exactly one in the same transaction that installs the replacement head, and no other operation MAY increment it. If the prior generation has no next safe integer, activation SHALL reject with typed `GENERATION_EXHAUSTED` before mutation.

#### Scenario: Candidate build or failed activation completes
- **WHEN** a candidate is built, blocked, abandoned, or fails compare-and-swap activation
- **THEN** the effective branch and generation SHALL remain unchanged
- **AND** candidate revision or event count SHALL NOT influence the generation

#### Scenario: Verified replacement activates
- **WHEN** a candidate passes every gate and atomically replaces generation `N`
- **THEN** the new effective head SHALL be stored at generation `N + 1`
- **AND** the supersession, fences, and any replacement outbox SHALL bind that same transition

#### Scenario: Generation range is exhausted
- **WHEN** a verified candidate would increment beyond the maximum safe integer
- **THEN** activation SHALL reject with `GENERATION_EXHAUSTED`
- **AND** the effective head, generation, fences, candidate, outbox, admission, receipt, and saga state SHALL remain unchanged

### Requirement: Branch Activation Is Verified, Compare-and-Swap, and Atomic
A candidate SHALL become effective only after deterministic replay, domain validation, affected-artifact validation, required viewer projections, and the prior-generation delivery fence pass. A durable correction lease SHALL carry an opaque lease ID, owner, expiry, and monotonically increasing fencing epoch and bind the build to the expected effective branch, revision, digest, and generation. Expiry or takeover SHALL mint a higher epoch. Fence installation SHALL serialize against lease-to-admitted promotion. While an existing lease remains unexpired or an admitted delivery has an unknown target result, the candidate SHALL remain non-effective and the prior branch SHALL remain effective. If an admitted prior effect has an accepted target receipt, the source activation transaction SHALL also commit the higher-version correction, immutable replacement outbox, and `pending` saga state. The same transaction SHALL lock and verify the current unexpired lease ID, owner, and epoch while comparing the expected head/generation, then activate the candidate, increment the generation by exactly one, supersede the prior branch, publish artifact invalidations, and enable new-generation effects. It SHALL NOT wait for a replacement receipt that cannot exist before activation.

#### Scenario: Candidate verification fails
- **WHEN** replay, projection, integrity, or affected-artifact validation fails
- **THEN** the candidate SHALL remain blocked
- **AND** the prior branch SHALL remain authoritative

#### Scenario: Effective head changed before activation
- **WHEN** activation finds a branch, revision, digest, or generation other than the lease-bound expected head
- **THEN** activation SHALL fail as stale without changing either branch
- **AND** the authority SHALL require a new preview/build rather than silently rebase

#### Scenario: Expired correction owner resumes after takeover
- **WHEN** an expired owner attempts activation after another owner acquired a higher lease epoch while the expected head stayed unchanged
- **THEN** activation SHALL reject with `STALE_CORRECTION_LEASE`
- **AND** it SHALL append no branch, supersession, invalidation, saga, or outbox records

#### Scenario: Candidate waits for leased delivery
- **WHEN** verification passes but a prior-generation effect has an active lease
- **THEN** the candidate SHALL enter a non-effective waiting state
- **AND** activation SHALL wait for safe expiry or a known target result for the winning admission

#### Scenario: Prior receipt requires replacement after activation
- **WHEN** the winning prior-generation admission has an accepted target receipt
- **THEN** source activation SHALL atomically create the higher-version replacement outbox and `pending` saga on the newly effective generation
- **AND** the replacement effect SHALL dispatch only after activation while cross-stream progression remains gated

### Requirement: Branch Promotion Revalidates Commands
The system SHALL NOT generically merge event sets or state snapshots. Any separately approved promotion SHALL revalidate versioned semantic command bytes against the current target head and append newly authorized target events with provenance.

#### Scenario: Proposed command conflicts with current target
- **WHEN** a proposed command no longer satisfies current funds, ownership, chronology, damage, or readiness invariants
- **THEN** promotion SHALL reject that command or require an explicit domain correction
- **AND** it SHALL not silently interleave the conflicting histories

### Requirement: Only the Effective Branch Dispatches Effects
Outbox effects belonging to a building, waiting, blocked, or superseded branch SHALL NOT acquire a delivery lease. Candidate activation SHALL fence the prior effective generation, preventing new leases/admissions and superseding unleased pending rows. A lease alone SHALL NOT authorize target mutation. Effects with an accepted target receipt SHALL require a higher-version coordinated correction instead of cancellation.

#### Scenario: Candidate reaches terminal combat state
- **WHEN** a building combat branch contains a terminal outcome
- **THEN** its outcome outbox SHALL remain non-dispatchable until branch activation
- **AND** a failed candidate SHALL never affect the campaign

#### Scenario: Prior branch outcome already has a receipt
- **WHEN** activating a replacement would supersede an outcome already accepted by the campaign
- **THEN** source activation SHALL atomically start the coordinated higher-version correction workflow on the new effective generation
- **AND** it SHALL not delete, silently cancel, or wait on a pre-activation replacement receipt

#### Scenario: Prior branch admission wins the fence race
- **WHEN** old-generation delivery admission commits before the activation fence
- **THEN** the prior branch SHALL remain effective through target acceptance
- **AND** activation SHALL route through the higher-version correction workflow before supersession

### Requirement: Branch Rollback Preserves the Effective Head and Generation
Rollback SHALL disable new branch creation and activation while preserving every branch, supersession, effective-head/generation, fence, outbox/admission/receipt, and saga row. It SHALL reopen the exact last verified effective branch, revision, digest, and generation through a reader compatible with the persisted journal schema, upcasters, canonicalizer, and branch/generation contract. A non-effective candidate MAY remain stored. Rollback SHALL NOT substitute the root, a prior or superseded branch, or generation `1`. If no compatible reader exists, command, effect, and correction admission SHALL stop and the stream SHALL expose a typed truthful blocked state.

#### Scenario: Rollback restarts after a replacement activation
- **WHEN** rollback restarts a stream whose effective generation is greater than `1`
- **THEN** it SHALL reopen the same effective branch/revision/digest/generation and associated delivery fences
- **AND** it SHALL not reactivate the root or any superseded branch

#### Scenario: Rollback reader is incompatible
- **WHEN** the available reader cannot interpret the persisted journal, upcasters, canonicalizer, or branch/generation metadata
- **THEN** the stream SHALL enter a typed blocked state without command, effect, or correction admission
- **AND** all authority, candidate, delivery, receipt, and saga records SHALL remain unchanged
