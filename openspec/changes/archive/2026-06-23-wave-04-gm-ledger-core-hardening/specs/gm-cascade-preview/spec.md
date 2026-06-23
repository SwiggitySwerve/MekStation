## MODIFIED Requirements

### Requirement: Approval and Cancellation

The system SHALL append an intervention record only after GM approval and successful application by the registered domain implementer. Cancelling a preview, blocking a preview, or failing to apply an approved preview SHALL append no intervention and SHALL leave state unchanged.

#### Scenario: Approval appends accepted intervention
- **GIVEN** a ready GM intervention preview
- **WHEN** the GM approves the preview and the registered domain implementer applies it
- **THEN** the system SHALL append the approved intervention to canonical history
- **AND** the derived game state SHALL reflect the approved net effect

#### Scenario: Cancellation appends nothing
- **GIVEN** a ready GM intervention preview
- **WHEN** the GM cancels the preview
- **THEN** no intervention record SHALL be appended
- **AND** derived game state SHALL remain unchanged

#### Scenario: Unsupported approval appends nothing
- **GIVEN** a ready GM intervention preview whose domain cannot be applied by a registered implementer
- **WHEN** the GM attempts to approve the preview
- **THEN** the approval result SHALL be blocked
- **AND** no intervention ledger record SHALL be appended
- **AND** no action ledger record SHALL be appended
- **AND** derived game state SHALL remain unchanged
