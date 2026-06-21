# campaign-system Specification

## Purpose

Defines Campaign System requirements for Campaign Management, Mission Progression, Roster State Persistence, and Pilot Experience, preserving the source-of-truth scope introduced by archived change add-campaign-system.

## Requirements

### Requirement: Campaign Management

The system SHALL provide campaign creation and management for multi-mission gameplay.

#### Scenario: Create campaign

- **GIVEN** a user wants to start a campaign
- **WHEN** they complete the campaign wizard
- **THEN** a new campaign is created with initial roster
- **AND** the first mission is available

#### Scenario: View campaign progress

- **GIVEN** an active campaign
- **WHEN** viewing the campaign detail page
- **THEN** the mission tree shows completed and available missions
- **AND** the current roster status is displayed
- **AND** campaign resources are shown

#### Scenario: Delete campaign

- **GIVEN** a campaign exists
- **WHEN** the user deletes it
- **THEN** the campaign and all mission data are removed
- **AND** original units/pilots remain in the vault (unaffected)

### Requirement: Mission Progression

The system SHALL track mission outcomes and advance campaign state.

#### Scenario: Complete mission successfully

- **GIVEN** a campaign mission in progress
- **WHEN** the player achieves victory conditions
- **THEN** the mission is marked complete
- **AND** XP is awarded to participating pilots
- **AND** salvage/rewards are added to campaign resources
- **AND** the next mission(s) become available

#### Scenario: Mission failure

- **GIVEN** a campaign mission in progress
- **WHEN** the player fails (retreat, destruction)
- **THEN** the mission is marked failed
- **AND** consequences are applied (unit losses, morale)
- **AND** retry or alternate path may be available

#### Scenario: Branching outcomes

- **GIVEN** a mission with multiple outcome branches
- **WHEN** a specific outcome occurs (e.g., save the convoy)
- **THEN** the campaign branches to the corresponding path
- **AND** unavailable branches are marked locked

### Requirement: Roster State Persistence

The system SHALL maintain unit and pilot state across missions.

#### Scenario: Damage carries forward

- **GIVEN** a unit took damage in the previous mission
- **WHEN** starting the next mission
- **THEN** the unit begins with that damage (unless repaired)
- **AND** the damage is shown in force selection

#### Scenario: Pilot wounds persist

- **GIVEN** a pilot was wounded
- **WHEN** starting the next mission
- **THEN** the pilot has reduced effectiveness
- **OR** is unavailable if critically wounded

#### Scenario: Unit destroyed

- **GIVEN** a unit was destroyed in a mission
- **WHEN** viewing the roster
- **THEN** the unit is marked destroyed
- **AND** may be replaced via salvage or purchase

### Requirement: Pilot Experience

The system SHALL track and apply pilot experience progression.

#### Scenario: Gain XP

- **GIVEN** a pilot participates in a mission
- **WHEN** the mission completes
- **THEN** the pilot gains XP based on participation and kills
- **AND** the XP total is updated

#### Scenario: Skill improvement

- **GIVEN** a pilot reaches an XP threshold
- **WHEN** viewing pilot details
- **THEN** a skill improvement is available
- **AND** the player can choose the upgrade
- **AND** the pilot's stats improve

#### Scenario: Pilot death

- **GIVEN** a pilot dies in a mission
- **WHEN** the campaign continues
- **THEN** the pilot is marked deceased
- **AND** their XP and progress are lost
- **AND** a replacement pilot may be recruited

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

### Requirement: Current System Location

The campaign record SHALL carry an optional `currentSystemId: string` field tracking the player's "you are here" pin on the starmap. The field is optional for backward compatibility — a legacy persisted campaign without the field is treated as stationed at `'terra'` by all UI surfaces (the canonical default). The field is updated EXCLUSIVELY via the `useCampaignStore.travelToSystem` action so the activity-log entry and validation invariants are always enforced together.

**Source**: `openspec/changes/archive/2026-05-20-wire-starmap-into-campaign/` (Wave 6.4)

#### Scenario: A new campaign defaults to Terra

**GIVEN** a brand-new campaign created via `createCampaign`
**WHEN** the campaign is persisted and re-loaded
**THEN** `campaign.currentSystemId` MAY be `undefined`
**AND** the starmap page SHALL display Terra as the selected system (the `?? 'terra'` UI default)

#### Scenario: A legacy persisted campaign without currentSystemId works unchanged

**GIVEN** a campaign persisted before this change (no `currentSystemId` field)
**WHEN** the operator opens the campaign and navigates to the starmap
**THEN** the page SHALL mount with Terra highlighted as the current system
**AND** the operator can travel to a new system, after which `currentSystemId` IS persisted on subsequent saves

#### Scenario: currentSystemId persists through zustand serialization

**GIVEN** a campaign that has just travelled to `'luthien'`
**WHEN** the page reloads (zustand re-hydrates from local storage)
**THEN** `campaign.currentSystemId` SHALL still be `'luthien'`
**AND** the starmap page SHALL re-render with Luthien as the selected system
