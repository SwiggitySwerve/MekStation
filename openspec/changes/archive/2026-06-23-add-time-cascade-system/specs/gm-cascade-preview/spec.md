## MODIFIED Requirements

### Requirement: Deferred Domain Result

The preview pipeline SHALL return explicit deferred or unsupported results for domains that are not implemented in the current slice. The accumulated `time` domain SHALL be supported when a time-cascade implementer is registered, while unregistered domains SHALL remain explicit unsupported or deferred results.

#### Scenario: Registered time domain previews without mutation
- **GIVEN** the accumulated time domain implementer is registered
- **WHEN** the GM previews a travel or accumulated time correction
- **THEN** the preview pipeline SHALL return a ready, blocked, or manual-takeover result from the implementer
- **AND** campaign time, travel state, repair progress, contract windows, markets, pilot recovery, and upkeep SHALL remain unchanged until approval

#### Scenario: Registered economy domain is not deferred
- **GIVEN** the economy domain implementer is registered
- **WHEN** the GM previews a merchant transaction reversal
- **THEN** the preview pipeline SHALL return a ready, blocked, or manual-takeover result from the implementer
- **AND** the preview SHALL NOT be normalized to deferred merely because it targets campaign economy state

#### Scenario: Unknown domain remains unsupported
- **GIVEN** no implementer is registered for a campaign domain
- **WHEN** the GM previews a correction for that domain
- **THEN** the preview pipeline SHALL return a deferred or unsupported result
- **AND** the system SHALL NOT mutate campaign state

## ADDED Requirements

### Requirement: Time Cascade Preview Shape

The preview pipeline SHALL represent accumulated time cascades with public net effect, GM-private context, affected campaign state references, projected time effects, generated day summaries, and conflicts before commit.

#### Scenario: Time preview exposes public and private projections separately
- **GIVEN** a GM requests a time advancement, travel window, repair progression, market refresh, pilot recovery, upkeep, or accumulated campaign effect correction
- **WHEN** the preview is produced
- **THEN** the preview SHALL include player-visible net effect in the public projection
- **AND** the preview SHALL preserve GM reason, default outcome, hidden notes, conflict analysis, and manual takeover notes in the private projection only

#### Scenario: Manual time preview cannot be approved automatically
- **GIVEN** a time preview includes a conflict marked as requiring manual takeover
- **WHEN** the GM attempts normal preview approval
- **THEN** the approval pipeline SHALL return blocked
- **AND** no intervention ledger record or action ledger record SHALL be appended
