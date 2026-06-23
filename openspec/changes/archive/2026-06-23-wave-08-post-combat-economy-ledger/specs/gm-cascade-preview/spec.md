## ADDED Requirements

### Requirement: Command-Backed Campaign Correction Preview Proof

The GM cascade preview pipeline SHALL keep a command-backed proof that post-combat and base-economy corrections are previewed before commit, preserve public/private projection boundaries, and block automatic approval when manual takeover is required.

#### Scenario: Campaign preview proof covers public and private projections

- **GIVEN** a GM campaign correction for salvage, repair, funds, inventory, or base unit state
- **WHEN** the campaign ledger QC validator runs
- **THEN** it SHALL validate anchors proving the preview contains player-visible net effect
- **AND** it SHALL validate anchors proving GM-private reason, default outcome, hidden notes, and manual takeover notes remain private

#### Scenario: Campaign preview proof covers blocked approval

- **GIVEN** a campaign correction preview with unresolved conflicts or invalid targets
- **WHEN** the campaign ledger QC validator runs
- **THEN** it SHALL validate focused tests proving normal approval appends no intervention record
- **AND** it SHALL validate focused tests proving normal approval appends no action ledger record
