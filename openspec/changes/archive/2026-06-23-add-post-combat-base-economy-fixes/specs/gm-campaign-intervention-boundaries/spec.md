## MODIFIED Requirements

### Requirement: First Slice Defers Campaign Cascades

The campaign intervention boundary SHALL now support ledger-backed post-combat amendments, base/economy corrections, repair corrections, and salvage corrections through registered domain implementers. Accumulated time cascades SHALL remain explicitly deferred until the time-cascade phase declares safe mutable roots and conflict handling.

#### Scenario: Base economy intervention previews without silent mutation
- **GIVEN** a GM requests a merchant transaction reversal for an owned campaign
- **WHEN** the intervention pipeline evaluates the request with the economy implementer registered
- **THEN** the system SHALL return either a ready preview or a manual-takeover preview with changed finance and inventory state references
- **AND** the system SHALL NOT mutate campaign finances or inventory before approval

#### Scenario: Post-combat, repair, and salvage interventions are routed to campaign implementers
- **GIVEN** registered intervention implementers for `post-combat`, `repair`, and `salvage`
- **WHEN** a GM previews targeted corrections for unit state, repair tickets, or salvage allocations
- **THEN** the system SHALL route those commands through the registered campaign implementers
- **AND** the preview SHALL include public net effect and GM-private metadata

#### Scenario: Time cascade intervention is still deferred
- **GIVEN** a GM requests an accumulated time correction before the time cascade phase is implemented
- **WHEN** the intervention pipeline evaluates the request
- **THEN** the system SHALL return an explicit unsupported or deferred result
- **AND** the system SHALL NOT advance or rewind campaign time

### Requirement: Future Campaign Implementer Seams

The system SHALL document and preserve extension seams for intervention ledger implementers that target post-combat, base/economy, repair, salvage, and accumulated time domains. Supported campaign-domain implementers SHALL identify the state roots they can mutate and the public projection fields that non-GM players may see. Deferred domains SHALL identify why they cannot mutate state in the current slice.

#### Scenario: Supported campaign domain declares required state roots
- **GIVEN** a campaign-domain implementer is registered
- **WHEN** it declares its intervention domain
- **THEN** it SHALL identify the state roots it can mutate
- **AND** it SHALL identify the public projection fields that non-GM players may see

#### Scenario: Deferred time domain remains explicit
- **GIVEN** the accumulated time domain has no registered safe implementer
- **WHEN** a GM previews a time correction
- **THEN** the preview SHALL identify the domain as unsupported or deferred
- **AND** the preview SHALL NOT imply that travel, repair progress, contract windows, market refreshes, pilot recovery, upkeep, or campaign dates were mutated

## ADDED Requirements

### Requirement: Ledger-Backed Campaign Correction Domains

The system SHALL provide campaign intervention implementers for `post-combat`, `economy`, `repair`, and `salvage`. These implementers SHALL support targeted corrections for salvage allocations, repair tickets, funds transactions, parts inventory lots, and base unit state or configuration roots.

#### Scenario: GM previews targeted campaign correction
- **GIVEN** the owning GM requests a targeted campaign correction
- **WHEN** the correction references an existing supported campaign root or provides a complete replacement for that root
- **THEN** the preview SHALL be ready
- **AND** the preview SHALL include changed state references for only the affected campaign roots
- **AND** no campaign state SHALL be mutated before approval

#### Scenario: Ambiguous campaign cascade requires manual takeover
- **GIVEN** a campaign correction declares unresolved cascading conflicts
- **WHEN** the GM requests a preview
- **THEN** the preview SHALL require manual takeover
- **AND** the approval pipeline SHALL NOT append the intervention automatically

#### Scenario: Approved campaign correction replays from ledger record
- **GIVEN** a ready campaign correction preview
- **WHEN** the GM approves it
- **THEN** the intervention ledger SHALL append an approved campaign intervention record
- **AND** replaying the record's projected effects SHALL derive the same corrected campaign state
