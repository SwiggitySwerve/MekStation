# campaign-hud — Delta for reconcile-campaign-economy-surfaces

## ADDED Requirements

### Requirement: Dashboard Summary Derives From Canonical Campaign State

The campaign dashboard summary SHALL derive every economy widget — the active-contract card, the finances card, the forces count, and the recent-activity feed — from the same canonical source-of-truth that the corresponding Missions, Finances, and Forces surfaces read. No dashboard widget SHALL read a field that no gameplay mutation writes.

- The active-contract widget SHALL be derived from `campaign.missions` via a shared `selectActiveContract` selector. That selector SHALL compose the scenario-generation pipeline's hoisted `getActiveContracts` predicate (endDate in the future or undefined) AND the Missions tab's active filter (`status === MissionStatus.ACTIVE`) — because the pipeline predicate is endDate-only and does NOT check status. Hoisting the pipeline predicate unchanged preserves pipeline behavior; the shared selector adds the status check so the dashboard and the Missions tab cannot drift.
- The daily-cost widget SHALL be computed by the shared option-aware, loan-aware, force-tree-derived daily-cost projection selector (`selectDailyCostProjection`) that the Finances page already uses — NOT by hardcoded per-pilot / per-unit constants and NOT with loan repayment pinned to zero.
- The forces count SHALL reflect force-tree-assigned units (matching the Forces tab), rather than the raw roster-store unit count.
- The recent-activity feed SHALL reflect the finance activity-log entries emitted at events including contract-payment closure, so completed-mission income appears.

The write-less `ICampaignActiveContract` extension field SHALL be deprecated: it SHALL have no production reader, and deserialization SHALL remain read-tolerant so existing saves that carry a serialized `activeContract` still load.

#### Scenario: Dashboard and Missions tab agree on the active contract

- **GIVEN** a campaign in which a contract has been accepted (written to `campaign.missions`)
- **WHEN** the dashboard summary and the Missions tab are rendered
- **THEN** the dashboard active-contract card SHALL show the same active contract the Missions tab shows
- **AND** the dashboard operations queue SHALL NOT prompt "Choose a contract" while an active contract exists

#### Scenario: Daily-cost widget matches the option-aware projection

- **GIVEN** a campaign with 4 pilots and 4 roster units, none assigned to a force, with campaign cost options and any active loans
- **WHEN** the dashboard finances card and the Finances page are rendered
- **THEN** the dashboard daily-cost figure SHALL equal the Finances page figure produced by `selectDailyCostProjection`
- **AND** the dashboard SHALL NOT report a daily cost derived from hardcoded constants that contradicts the Finances page (the `600/day` vs `200/day` contradiction is resolved)

#### Scenario: Forces count matches force-tree assignment

- **GIVEN** a campaign whose roster store holds units of which only a subset are assigned into the force tree
- **WHEN** the dashboard forces widget and the Forces tab are rendered
- **THEN** the dashboard forces count SHALL reflect the force-tree-assigned units consistently with the Forces tab

#### Scenario: Completed-mission income appears in recent activity

- **GIVEN** a contract payout posted at mission completion, emitting a `finances` activity-log entry
- **WHEN** the dashboard recent-activity feed is rendered
- **THEN** the payout SHALL appear as a recent-activity entry

#### Scenario: Legacy save with the deprecated field still loads

- **GIVEN** an existing save whose serialized campaign carries an `activeContract` value
- **WHEN** the campaign is deserialized
- **THEN** the campaign SHALL load without error
- **AND** the dashboard active-contract card SHALL be derived from `campaign.missions`, not from the deprecated field
