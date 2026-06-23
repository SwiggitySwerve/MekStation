## MODIFIED Requirements

### Requirement: Deferred Domain Result

The preview pipeline SHALL return explicit deferred or unsupported results for domains that are not implemented in the current slice. The accumulated `time` domain SHALL remain deferred in this slice, while registered post-combat, economy, repair, and salvage implementers SHALL return normal ready, blocked, or manual-takeover previews.

#### Scenario: Time domain does not mutate state
- **GIVEN** the accumulated time domain is not implemented
- **WHEN** the GM previews a travel or accumulated time correction
- **THEN** the preview pipeline SHALL return a deferred or unsupported result
- **AND** campaign time, travel state, repair progress, contract windows, markets, pilot recovery, and upkeep SHALL remain unchanged

#### Scenario: Registered economy domain is not deferred
- **GIVEN** the economy domain implementer is registered
- **WHEN** the GM previews a merchant transaction reversal
- **THEN** the preview pipeline SHALL return a ready, blocked, or manual-takeover result from the implementer
- **AND** the preview SHALL NOT be normalized to deferred merely because it targets campaign economy state

## ADDED Requirements

### Requirement: Campaign Correction Preview Shape

The preview pipeline SHALL represent post-combat and base-economy corrections with public net effect, GM-private context, affected campaign state references, projected campaign effects, and conflicts before commit.

#### Scenario: Campaign preview exposes public and private projections separately
- **GIVEN** a GM requests a salvage, repair, funds, inventory, or base-state correction
- **WHEN** the preview is produced
- **THEN** the preview SHALL include player-visible net effect in the public projection
- **AND** the preview SHALL preserve GM reason, default outcome, hidden notes, and manual takeover notes in the private projection only

#### Scenario: Manual campaign preview cannot be approved automatically
- **GIVEN** a campaign preview includes a conflict marked as requiring manual takeover
- **WHEN** the GM attempts normal preview approval
- **THEN** the approval pipeline SHALL return blocked
- **AND** no intervention ledger record or action ledger record SHALL be appended
