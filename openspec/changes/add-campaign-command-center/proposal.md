# Change: Add Campaign Command Center Dashboard

## Why

`/gameplay/campaigns/[id]/index.tsx` today is a routing index — a list of tiles that link to the 11 sub-route surfaces (`personnel`, `mech-bay`, `medical-bay`, `salvage`, `hiring`, `finances`, `contract-market`, `repair-bay`, `prestige-morale`, `missions`, `forces`). It surfaces no campaign state on its own. To see whether you can afford to advance a day, you click into Finances; to see active mission objectives, you click into Missions; to see who is injured, you click into Medical Bay; to see the pending day-cost projection, you click Finances again.

MekHQ's `CommandCenterTab.java` (the reference implementation this whole campaign surface is modeled on) is the OPPOSITE shape: it's a single dashboard tab that **collates** the campaign's current state — rating, force composition, HR capacity, repair status, cargo summary, active mission objectives, last 9 daily log categories, pending procurement, and quick-launch buttons to the detail reports. The detail reports are reached *from* the command center, not in place of it.

We have all the underlying data in the campaign store (`useCampaignStore`, `usePilotStore`, `useForceStore`), the day-report system (`dayAdvancement.ts` + `dayReportTypes.ts`), and the existing command panels (`FinancesPanel`, `HiringPanel`, `ContractMarketPanel`, `PrestigeMoralePanel`, `DayReportPanel`). The aggregation layer that turns those into a single at-a-glance command-center view does not exist.

A GM running a tabletop-style campaign session — or a solo player tracking 12 mechs, 18 pilots, 3 active contracts, and a 4-month cash burn — needs the dashboard. Without it every session begins with 5 clicks through sub-routes just to know where the campaign stands.

This change adds the dashboard *between* the routing index and the existing sub-routes, without removing any current surface. The 11 sub-routes still work; they just become drill-downs from the dashboard instead of the only way to see anything.

## What Changes

- ADDED a `<CampaignDashboard>` component mounted at `/gameplay/campaigns/[id]` (replacing the current bare tile-grid index), composed of 6 dashboard cards:
  1. **Force snapshot** — total mechs / pilots / dropship capacity / repair queue depth / injured pilot count (links to `forces`, `mech-bay`, `personnel`, `medical-bay`, `repair-bay`)
  2. **Active contract** — current contract name, employer, deadline, completion-bar, primary objective list, days remaining (links to `contract-market`, `missions`)
  3. **Finances** — cash balance, daily-cost projection (salaries + maintenance + loan repayment), runway in days at current burn, last 5 ledger entries (links to `finances`)
  4. **Day advance** — current campaign date, "Advance one day" button, "Advance to next event" button, pending-event preview (uses existing `dayAdvancement` pipeline; renders `<DayReportPanel>` modal on resolve)
  5. **Recent activity log** — last 10 events bucketed by category (Battle / Personnel / Medical / Finances / Acquisitions / Technical), category tabs, link-out to the full per-category log
  6. **Quick actions** — "Hire a pilot" / "Browse contracts" / "Refit a mech" / "Open salvage" buttons that deep-link to the relevant sub-route's primary action
- ADDED a `useCampaignDashboardSummary(campaignId)` selector hook that derives the dashboard payload from the 3 existing stores (no new state)
- ADDED a `campaign-activity-log` slice on `useCampaignStore` that retains the last 200 day-report event entries categorized for the dashboard's "Recent activity" card. Day-advance writes append; nothing in the existing dayAdvancement pipeline changes
- KEPT the existing sub-routes (`personnel.tsx` through `forces.tsx`) unchanged — they remain reachable directly via URL and via the new dashboard's links
- ADDED a "Back to dashboard" breadcrumb on each sub-route header (using existing `<CampaignNavigation>`)
- KEPT the campaign tile-grid alive at `/gameplay/campaigns/[id]/overview` for users who prefer the routing index (optional — kept as escape hatch behind a settings toggle, default off)

## Dependencies

- **Requires (already shipped)**: `add-campaign-system` (Wave 4) — all 11 sub-routes and the campaign store
- **Requires (already shipped)**: day-advancement pipeline (`dayAdvancement.ts`, `dayReportTypes.ts`) — the 7-phase advance + day-report shape this dashboard surfaces
- **Requires (already shipped)**: `useCampaignStore`, `usePilotStore`, `useForceStore` — all selectors composed by the new hook already exist
- **No new transport, no new types, no schema migrations**

## Impact

- Affected specs: `campaign-system` — ADD a "Campaign Command Center Dashboard" requirement formalizing the 6 dashboard cards, the activity-log retention rule, and that the dashboard is the default landing surface for a campaign detail route
- Affected code:
  - `src/pages/gameplay/campaigns/[id]/index.tsx` — render `<CampaignDashboard>` instead of the current tile-grid
  - `src/pages/gameplay/campaigns/[id]/overview.tsx` — new (the moved tile-grid, behind settings toggle)
  - `src/components/campaign/dashboard/CampaignDashboard.tsx` — new component (composes 6 cards)
  - `src/components/campaign/dashboard/cards/{ForceSnapshotCard,ActiveContractCard,FinancesCard,DayAdvanceCard,ActivityLogCard,QuickActionsCard}.tsx` — 6 new card components
  - `src/components/campaign/dashboard/__tests__/` — new test suite per card + integration
  - `src/components/campaign/dashboard/*.stories.tsx` — Storybook stories for each card
  - `src/lib/campaign/hooks/useCampaignDashboardSummary.ts` — new selector hook
  - `src/stores/useCampaignStore.ts` — new `activityLog: IActivityLogEntry[]` slice + `appendActivityLogEntry(entry)` action + `IActivityLogEntry` type (200-entry retention)
  - `src/lib/campaign/dayAdvancement.ts` — `runDayAdvancement` calls `appendActivityLogEntry` for each emitted event (no behavior change, just an extra side-effect)
  - `src/components/campaign/CampaignNavigation.tsx` — "Back to dashboard" link on sub-route headers
- No database migrations (activity log is in-memory + zustand-persist; capped retention prevents bloat)
- Storybook bundle grows by ~6 stories (within current budget)

## Non-Goals

- A full MekHQ-style 9-category log split (Politics, Skill, Diplomacy specifically). The "Recent activity" card bucketed by 6 categories (Battle, Personnel, Medical, Finances, Acquisitions, Technical) covers the events the day-advance pipeline emits today; the other 3 categories don't have events emitted yet and would be empty surface area
- Unit rating / reputation system (MekHQ has `lblRatingHead`, `lblRating` — MekStation has no equivalent rating yet; that's a separate change candidate)
- Procurement table (MekHQ's command center includes a pending-acquisitions table — MekStation doesn't have a long-running procurement system; would be a Wave 7 candidate)
- Cargo / transport capacity surfaces (no cargo system in MekStation yet)
- Faction Standing report / Diplomacy report — these depend on a politics system that doesn't exist
- Editing or composing day-advance behavior — this change READS from `dayAdvancement.ts` and writes its emitted events to the log slice, but does not change advance rules
- A configurable dashboard layout (drag-to-rearrange cards) — fixed grid in v1; configurable in a later polish change
