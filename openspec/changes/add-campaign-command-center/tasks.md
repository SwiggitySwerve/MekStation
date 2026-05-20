# Tasks: Add Campaign Command Center Dashboard

## 1. Activity log store slice

- [ ] 1.1 Add `IActivityLogEntry` type to `src/types/campaign/ActivityLog.ts` with discriminated union over 6 categories (`battle | personnel | medical | finances | acquisitions | technical`), `timestamp: ISO8601`, `campaignDay: number`, `message: string`, and a category-specific `payload`
- [ ] 1.2 Add `activityLog: IActivityLogEntry[]` slice on `useCampaignStore` with `appendActivityLogEntry(entry)` action; cap retention at 200 entries (FIFO, drop-oldest)
- [ ] 1.3 Persist the activity log via existing zustand-persist + clientSafeStorage; the 200-cap prevents persistence bloat
- [ ] 1.4 Wire `runDayAdvancement` in `src/lib/campaign/dayAdvancement.ts` to emit one `appendActivityLogEntry` call per categorizable event the pipeline produces (costs → finances, healing → medical, turnover → personnel, contract expiry → finances, etc.); zero behavior change to the pipeline itself
- [ ] 1.5 Tests: append + cap + categorization invariants; day-advance integration test confirms log entries arrive after a 1-day advance

## 2. Dashboard summary selector

- [ ] 2.1 Add `useCampaignDashboardSummary(campaignId)` hook in `src/lib/campaign/hooks/useCampaignDashboardSummary.ts` that composes 3 stores into a single derived `IDashboardSummary` shape with: `forceSnapshot`, `activeContract`, `finances`, `currentDay`, `pendingEvents`, `activityLog`, `quickActions`
- [ ] 2.2 The hook MUST memoize per-campaignId via `useMemo` to avoid recompute on every render
- [ ] 2.3 Tests: snapshot tests against fixture campaigns (no active contract / mid-contract / contract-completed); selector returns stable references across unrelated store updates

## 3. Dashboard card components

- [ ] 3.1 `<ForceSnapshotCard>` — total mechs, total pilots, dropship capacity (placeholder if no dropship), repair queue depth, injured pilot count; each value links to the relevant sub-route
- [ ] 3.2 `<ActiveContractCard>` — contract name, employer, deadline (days remaining), completion-bar (objectives completed / total), primary objective list; empty-state message + "Browse contracts" CTA if no active contract
- [ ] 3.3 `<FinancesCard>` — cash balance, daily-cost projection broken down by salaries + maintenance + loan repayment, runway in days (`balance / dailyCost`), last 5 ledger entries; "View finances" link
- [ ] 3.4 `<DayAdvanceCard>` — current campaign date, "Advance one day" button, "Advance to next event" button (advances day-by-day until an event-emitting day or 30 days max), pending-event preview (e.g. "Contract ends in 3 days"); on advance, mount `<DayReportPanel>` modal with the resulting reports
- [ ] 3.5 `<ActivityLogCard>` — tabbed by 6 categories, last 10 entries per category, with timestamps and category icons; "View full log" link routes to a new `/gameplay/campaigns/[id]/log` page (Task 5.1)
- [ ] 3.6 `<QuickActionsCard>` — 4 buttons: "Hire a pilot" (deep-link to hiring), "Browse contracts" (contract-market), "Refit a mech" (mech-bay with refit tab), "Open salvage" (salvage)
- [ ] 3.7 Each card has a Storybook story exercising the empty-state, mid-game, and edge-case (zero balance, KIA-list overflow, expired contract) variants
- [ ] 3.8 Tests: render each card with fixture summary; assert key values are visible; assert links resolve correctly

## 4. Dashboard composition + route mount

- [ ] 4.1 Add `<CampaignDashboard>` at `src/components/campaign/dashboard/CampaignDashboard.tsx` composing the 6 cards in a responsive grid (2x3 on desktop, 1x6 on mobile)
- [ ] 4.2 Replace `src/pages/gameplay/campaigns/[id]/index.tsx` body with `<CampaignDashboard campaignId={id}>` (preserve existing route guards and SSR-hydration `useEffect` pattern; do not regress PT-102)
- [ ] 4.3 Move the current tile-grid index to `src/pages/gameplay/campaigns/[id]/overview.tsx` and add a settings toggle `preferences.campaignLandingSurface = 'dashboard' | 'overview'` (default `'dashboard'`)
- [ ] 4.4 Add "Back to dashboard" link to `<CampaignNavigation>` header on every sub-route
- [ ] 4.5 Tests: dashboard renders with all 6 cards; settings-toggle swaps landing surface; back-to-dashboard link is visible on every sub-route header

## 5. Full activity log page

- [ ] 5.1 Add `src/pages/gameplay/campaigns/[id]/log.tsx` showing the full 200-entry activity log with a category filter, a date-range filter, and a free-text search
- [ ] 5.2 Tests: log page filters work; search highlights matches

## 6. Spec delta + archive

- [ ] 6.1 Author the delta at `openspec/changes/add-campaign-command-center/specs/campaign-system/spec.md` adding "Campaign Command Center Dashboard" requirement with scenarios for dashboard landing, day-advance flow, empty-state contract, activity-log retention cap
- [ ] 6.2 `openspec validate add-campaign-command-center --strict` passes
- [ ] 6.3 `npm run build`, lint, `tsc --noEmit`, `jest`, `npm run test:e2e -- playtest-campaign-smoke.spec.ts` all pass
- [ ] 6.4 Archive the change to `openspec/changes/archive/YYYY-MM-DD-add-campaign-command-center/` after merge
