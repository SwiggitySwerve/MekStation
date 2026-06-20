## ADDED Requirements

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

The preview pipeline SHALL return explicit deferred or unsupported results for domains that are not implemented in the current slice.

#### Scenario: Deferred domain does not mutate state
- **GIVEN** the economy domain is not implemented
- **WHEN** the GM previews a merchant transaction reversal
- **THEN** the preview pipeline SHALL return a deferred or unsupported result
- **AND** finances and inventory SHALL remain unchanged
