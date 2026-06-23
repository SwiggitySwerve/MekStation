## ADDED Requirements

### Requirement: Wave 8 Campaign Ledger QC Proof

The intervention ledger abstraction SHALL provide a focused QC validator for Wave 8 post-combat and base-economy GM ledger coverage. The validator MUST prove that supported campaign intervention domains preview, approve, replay, redact, and append through the shared intervention/action ledger contract without silently mutating campaign state before approval.

#### Scenario: Focused validator covers supported campaign domains

- **GIVEN** registered campaign intervention implementers for `post-combat`, `economy`, `repair`, and `salvage`
- **WHEN** the Wave 8 campaign ledger QC validator runs
- **THEN** it SHALL verify coverage anchors for every supported campaign domain
- **AND** it SHALL verify affected campaign roots for finances, repair tickets, salvage allocations, parts inventory, and base unit state or configuration

#### Scenario: Preview proof preserves no-mutation and redaction boundaries

- **GIVEN** a post-combat or base-economy correction with GM-private rationale and player-visible net effect
- **WHEN** the validator inspects the preview and focused tests before approval
- **THEN** campaign state SHALL remain unchanged before approval
- **AND** player-public projection SHALL expose only visible net effect and changed state references
- **AND** GM-private projection SHALL retain rationale, hidden notes, default outcome, and manual takeover notes

#### Scenario: Approval proof appends and replays deterministically

- **GIVEN** a ready campaign correction preview
- **WHEN** the GM approves it through the normal cascade pipeline
- **THEN** the intervention ledger SHALL append an approved campaign intervention record
- **AND** the shared action ledger SHALL append a GM intervention action after prior normal actions
- **AND** replaying the approved projected effects SHALL derive the same corrected campaign state

#### Scenario: Manual or blocked campaign preview appends nothing

- **GIVEN** a campaign correction preview that is blocked, unsupported, deferred, stale, or requires manual takeover
- **WHEN** normal approval is attempted
- **THEN** approval SHALL be blocked
- **AND** no intervention ledger record or action ledger record SHALL be appended
- **AND** campaign state SHALL remain unchanged
