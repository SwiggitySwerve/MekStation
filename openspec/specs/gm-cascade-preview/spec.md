# gm-cascade-preview Specification

## Purpose

Defines the preview-before-commit pipeline for GM interventions, including pure cascade projection, approval, cancellation, unsupported-domain handling, and separation from normal player undo.
## Requirements
### Requirement: Preview Before Commit

The system SHALL compute a cascade preview before applying any GM intervention. The preview SHALL include public net effect, GM-private context, affected state references, projected event effects, and conflicts. No state mutation SHALL occur until the GM approves the preview or completes manual takeover.

#### Scenario: Preview does not mutate state
- **GIVEN** a current game state `S`
- **WHEN** the GM requests a preview for a damage correction
- **THEN** the system SHALL return the projected net effect
- **AND** the current game state SHALL remain equal to `S`
- **AND** no intervention event SHALL be appended

### Requirement: Approval and Cancellation

The system SHALL append an intervention record only after GM approval. Cancelling a preview SHALL append no intervention and SHALL leave state unchanged.

#### Scenario: Approval appends accepted intervention
- **GIVEN** a ready GM intervention preview
- **WHEN** the GM approves the preview
- **THEN** the system SHALL append the approved intervention to canonical history
- **AND** the derived game state SHALL reflect the approved net effect

#### Scenario: Cancellation appends nothing
- **GIVEN** a ready GM intervention preview
- **WHEN** the GM cancels the preview
- **THEN** no intervention record SHALL be appended
- **AND** derived game state SHALL remain unchanged

### Requirement: Conflict and Manual Takeover Result

The preview pipeline SHALL return a manual-takeover result when the system cannot safely resolve a cascade automatically. The system SHALL NOT append the intervention until the GM resolves or accepts the conflict handling.

#### Scenario: Conflict requires manual takeover
- **GIVEN** a GM intervention preview with conflicts the system cannot resolve safely
- **WHEN** the preview is returned
- **THEN** the preview status SHALL indicate manual takeover is required
- **AND** the system SHALL NOT append the intervention until the GM resolves or accepts the conflict handling

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
