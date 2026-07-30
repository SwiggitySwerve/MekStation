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
A candidate branch SHALL become effective only after deterministic replay, domain validation, affected-artifact validation, and required viewer projections pass. One transaction SHALL activate the candidate and supersede the prior effective branch.

#### Scenario: Candidate verification fails
- **WHEN** replay, projection, integrity, or affected-artifact validation fails
- **THEN** the candidate SHALL remain blocked
- **AND** the prior branch SHALL remain authoritative

### Requirement: Branch Promotion Revalidates Commands
The system SHALL NOT generically merge event sets or state snapshots. Promotion from a simulation or replacement branch SHALL revalidate semantic commands against the current target head and append newly authorized target events with provenance.

#### Scenario: Proposed command conflicts with current target
- **WHEN** a branch command no longer satisfies current funds, ownership, chronology, damage, or readiness invariants
- **THEN** promotion SHALL reject that command or require an explicit domain correction
- **AND** it SHALL not silently interleave the conflicting histories
