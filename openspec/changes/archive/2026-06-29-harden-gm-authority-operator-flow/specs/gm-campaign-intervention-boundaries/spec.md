## ADDED Requirements

### Requirement: Player-Safe Campaign Ledger Route

The campaign GM intervention route SHALL separate mutable GM controls from player-public ledger review. A viewer without campaign GM authority SHALL be allowed to inspect public campaign correction effects when they are part of that campaign mirror, but SHALL NOT access GM-private metadata or mutation controls.

#### Scenario: Player mirror direct route is read-only

- **GIVEN** a campaign mirror containing approved GM campaign or time-cascade projected effects
- **AND** the local viewer has no campaign GM authority
- **WHEN** the viewer opens the GM ledger route directly
- **THEN** the route SHALL render public summaries for the projected effects
- **AND** it SHALL not render preview, approve, or manual-takeover buttons
- **AND** it SHALL not render GM rationale, hidden notes, default outcome, or manual takeover notes

#### Scenario: Owning GM route remains mutable

- **GIVEN** a single-player campaign owner or co-op host opens the GM ledger route
- **WHEN** the route renders
- **THEN** the GM preview, approval, and manual-takeover controls SHALL remain available
- **AND** the GM-private projection MAY include private metadata for that owner/host viewer
