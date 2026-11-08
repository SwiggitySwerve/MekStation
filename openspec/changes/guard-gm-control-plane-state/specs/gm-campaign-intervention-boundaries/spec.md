## ADDED Requirements

### Requirement: GM Control Plane Approval State

The campaign GM ledger control plane SHALL hold its preview, approval and manual-takeover state as one state with a token per generated preview. It SHALL refuse a control action that carries a stale token or that the current phase does not accept, and a refused action SHALL change nothing. While an approval is in flight the control plane SHALL accept neither a new preview nor a second approval. A refused approval MAY be retried. An approval whose apply threw SHALL be shown as failed, SHALL record nothing, and SHALL NOT be approvable again until a new preview is generated. A manual takeover SHALL be recorded at most once per preview.

#### Scenario: Approve in flight locks the controls
- **GIVEN** a ready preview whose approval is waiting for its apply answer
- **WHEN** the GM clicks approve again or generates a new preview
- **THEN** neither action SHALL be accepted
- **AND** the update SHALL be applied once

#### Scenario: Throwing apply is shown as failed
- **GIVEN** a ready preview
- **WHEN** the approval's apply throws
- **THEN** the control plane SHALL show the apply as failed with its reason
- **AND** no ledger row SHALL be recorded
- **AND** approve SHALL stay disabled until a new preview is generated

#### Scenario: Manual takeover records once
- **GIVEN** a preview that requires manual takeover
- **WHEN** the GM takes manual control twice
- **THEN** one manual record SHALL be appended
- **AND** the manual-takeover control SHALL be disabled

### Requirement: GM Ledger Rows Keep Persisted History

The campaign GM ledger SHALL show the campaign's persisted intervention rows together with the rows recorded in the current session. A persisted row and a session row of the same intervention id SHALL be shown once, as the session row. A persisted row without an intervention id SHALL always be shown. A co-op GM funds intent SHALL carry the approval's own intervention id, so the host's history entry and the session row name the same intervention.

#### Scenario: Persisted rows survive the first action
- **GIVEN** a campaign with persisted GM intervention rows
- **WHEN** the GM approves a new correction
- **THEN** the persisted rows and the new row SHALL all be shown

#### Scenario: One intervention is one row
- **GIVEN** an approved correction whose effect the campaign has written back
- **WHEN** the ledger renders
- **THEN** that correction SHALL appear as one row carrying its GM-private metadata
