## ADDED Requirements

### Requirement: Campaign GM cascade preview
Campaign GM interventions SHALL preview automatic cascades for accounting fixes, merchant reversal, roster recovery, repair/salvage adjustment, travel/time correction, and unit reload reconciliation before approval.

#### Scenario: GM approves automatic cascade
- **WHEN** a GM reviews a campaign intervention with resolvable cascade effects
- **THEN** the preview SHALL show net changes to funds, inventory, units, dates, logs, and mission state before commit

#### Scenario: GM takes manual control on conflict
- **WHEN** automatic cascade projection detects conflicting or ambiguous state changes
- **THEN** the intervention SHALL require manual takeover or explicit conflict resolution before commit
