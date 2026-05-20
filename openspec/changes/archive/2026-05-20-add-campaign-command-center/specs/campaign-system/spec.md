# Spec Delta: Campaign System

## ADDED Requirements

### Requirement: Campaign Command Center Dashboard

The system SHALL surface a single dashboard at `/gameplay/campaigns/[id]` that collates the campaign's current state — force snapshot, active contract, finances, day advance, recent activity, and quick actions — so the operator can assess the campaign and act on it without first drilling into a sub-route.

**Priority**: High

#### Scenario: Dashboard is the default landing surface

**GIVEN** a campaign in any state (just created, mid-contract, contract completed)
**WHEN** the user navigates to `/gameplay/campaigns/[id]`
**THEN** the system SHALL render `<CampaignDashboard>` with 6 cards: force snapshot, active contract, finances, day advance, activity log, and quick actions
**AND** the dashboard SHALL NOT require any sub-route navigation to display its summary
**AND** the existing 11 campaign sub-routes (`personnel`, `mech-bay`, `medical-bay`, `salvage`, `hiring`, `finances`, `contract-market`, `repair-bay`, `prestige-morale`, `missions`, `forces`) SHALL remain reachable via direct URL and via dashboard card links

#### Scenario: Force snapshot reflects current store state

**GIVEN** a campaign with 4 active mechs, 6 pilots (1 injured), 3 mechs in the repair queue
**WHEN** the dashboard renders
**THEN** the force snapshot card SHALL show "4 mechs", "6 pilots (1 injured)", "3 in repair"
**AND** clicking "4 mechs" SHALL navigate to `/gameplay/campaigns/[id]/forces`
**AND** clicking "1 injured" SHALL navigate to `/gameplay/campaigns/[id]/medical-bay`
**AND** clicking "3 in repair" SHALL navigate to `/gameplay/campaigns/[id]/repair-bay`

#### Scenario: Active contract card shows progress and deadline

**GIVEN** a campaign with an active contract "Defend Carlisle" with 2 of 3 primary objectives completed, deadline in 8 days
**WHEN** the dashboard renders
**THEN** the active contract card SHALL display the contract name, the employer, "8 days remaining", a completion bar reading "2 / 3 objectives", and the list of incomplete objectives
**AND** if no contract is active, the card SHALL show an empty state with a "Browse contracts" CTA that links to `/gameplay/campaigns/[id]/contract-market`

#### Scenario: Finances card surfaces balance, burn, and runway

**GIVEN** a campaign with balance 850,000 C-bills, daily salaries 12,000, daily maintenance 8,500, daily loan repayment 5,000
**WHEN** the dashboard renders
**THEN** the finances card SHALL show "850,000 C-bills" balance, the 3-line daily-cost breakdown summing to 25,500/day, and a runway of "33 days" (`floor(850000 / 25500)`)
**AND** the card SHALL show the last 5 ledger entries (most recent first)
**AND** the card SHALL link to `/gameplay/campaigns/[id]/finances` for the full ledger

#### Scenario: Day-advance from dashboard

**GIVEN** any campaign state
**WHEN** the user clicks "Advance one day" on the day-advance card
**THEN** the system SHALL invoke the existing `runDayAdvancement` pipeline once
**AND** any events the pipeline emits (cost deductions, healing, expired contracts, turnover) SHALL be appended to the campaign activity log
**AND** the resulting `DayReport` SHALL be displayed via `<DayReportPanel>` modal
**AND** dismissing the modal SHALL return the user to the updated dashboard reflecting the advanced state

#### Scenario: Activity log card retains last 200 entries categorized into 6 buckets

**GIVEN** a campaign with 250 historical day-advance events
**WHEN** the dashboard renders
**THEN** the activity log card SHALL show the last 10 entries per category across 6 categories: `battle`, `personnel`, `medical`, `finances`, `acquisitions`, `technical`
**AND** the underlying activity log slice SHALL retain at most 200 total entries (FIFO drop-oldest on overflow)
**AND** the activity log SHALL persist across page reloads via the existing zustand-persist boundary
**AND** clicking "View full log" SHALL navigate to `/gameplay/campaigns/[id]/log`

#### Scenario: Quick actions deep-link to primary sub-route action

**GIVEN** the dashboard is mounted
**WHEN** the user clicks "Hire a pilot"
**THEN** the system SHALL navigate to `/gameplay/campaigns/[id]/hiring` with the hire-flow primary CTA in focus
**AND** the same pattern SHALL apply to "Browse contracts" → `contract-market`, "Refit a mech" → `mech-bay?tab=refit`, "Open salvage" → `salvage`

#### Scenario: Operator can opt back to the tile-grid index

**GIVEN** a user who prefers the original tile-grid index over the dashboard
**WHEN** they set `preferences.campaignLandingSurface = 'overview'` in settings
**THEN** `/gameplay/campaigns/[id]` SHALL render the moved tile-grid (now at `/overview.tsx`) instead of the dashboard
**AND** the default value SHALL be `'dashboard'`
**AND** changing the preference SHALL not require a page reload to take effect

#### Scenario: Back-to-dashboard link is present on every sub-route

**GIVEN** the user is on any of the 11 campaign sub-routes
**WHEN** the page renders
**THEN** `<CampaignNavigation>` SHALL include a "Back to dashboard" link routing to `/gameplay/campaigns/[id]`
**AND** the link SHALL be present on `personnel`, `mech-bay`, `medical-bay`, `salvage`, `hiring`, `finances`, `contract-market`, `repair-bay`, `prestige-morale`, `missions`, `forces`, and the new `log` and `overview` routes
