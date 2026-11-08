## MODIFIED Requirements

### Requirement: Approval and Cancellation

The system SHALL append an intervention record only after GM approval and successful application by the registered domain implementer. When a caller applies the approved state outside the implementer (a campaign store, a co-op host or a live engine), the system SHALL append the intervention record and its action ledger record only after that apply succeeded. Cancelling a preview, blocking a preview, or failing to apply an approved preview SHALL append no intervention and SHALL leave state unchanged. The system SHALL refuse an approval or a record whose intervention id the ledger already holds.

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

#### Scenario: Refused caller apply appends nothing
- **GIVEN** a ready campaign correction preview approved by the GM
- **WHEN** the campaign store or co-op host refuses or throws on the approved update
- **THEN** no intervention ledger record and no action ledger record SHALL be appended
- **AND** a time cascade's roster recovery patches SHALL NOT be applied

#### Scenario: Engine refusal appends nothing
- **GIVEN** a ready tactical GM preview approved by the GM
- **WHEN** the live engine throws while applying it
- **THEN** the approval result SHALL be blocked
- **AND** no intervention ledger record SHALL be appended

#### Scenario: One preview is applied once
- **GIVEN** a tactical GM preview that was approved and recorded
- **WHEN** the same preview is approved again
- **THEN** the approval result SHALL be blocked before the engine applies anything
- **AND** the ledger SHALL still hold one record for it
