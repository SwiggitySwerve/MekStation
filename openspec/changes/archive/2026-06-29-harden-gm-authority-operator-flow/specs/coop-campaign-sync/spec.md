## ADDED Requirements

### Requirement: Campaign GM Ledger Respects Host Authority

The co-op campaign route surface SHALL treat the host as the campaign GM and the guest as a player mirror for GM ledger controls. Guest mirrors SHALL NOT expose controls that preview, approve, manually take over, or reveal GM-private campaign correction context.

#### Scenario: Host sees campaign GM ledger controls

- **GIVEN** a co-op campaign with `coopSession.mode === 'host'`
- **WHEN** the campaign command navigation renders
- **THEN** the GM Ledger route SHALL be visible
- **AND** the GM Ledger page SHALL render preview, approval, and manual-takeover controls

#### Scenario: Guest sees only player-safe ledger projection

- **GIVEN** a co-op campaign with `coopSession.mode === 'guest'`
- **WHEN** the guest deep-links to `/gameplay/campaigns/[id]/gm-ledger`
- **THEN** the page SHALL omit GM preview, approval, and manual-takeover controls
- **AND** it SHALL omit GM-private ledger projection
- **AND** it SHALL show only player-public ledger summaries and an authority explanation
