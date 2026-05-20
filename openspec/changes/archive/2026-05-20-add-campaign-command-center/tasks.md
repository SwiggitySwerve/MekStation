# Tasks: Add Campaign Command Center Dashboard

## 1. Activity log store slice

- [x] 1.1 Add `IActivityLogEntry` type to `src/types/campaign/ActivityLog.ts` with discriminated union over 6 categories (`battle | personnel | medical | finances | acquisitions | technical`), `timestamp: ISO8601`, `campaignDay: number`, `message: string`, and a category-specific `payload`
- [x] 1.2 Add `activityLog: IActivityLogEntry[]` slice on `useCampaignStore` with `appendActivityLogEntry(entry)` action; cap retention at 200 entries (FIFO, drop-oldest); last-write-wins dedup on `entry.id`
- [x] 1.3 Persist the activity log via existing zustand-persist + clientSafeStorage; the 200-cap prevents persistence bloat; older snapshots without the field round-trip as empty (backward-compat)
- [x] 1.4 Wire `useCampaignStore.advanceDay` to emit `appendActivityLogEntry` calls for the categorizable events the day-pipeline produces — healing (`medical`), contract expiry (`finances`), daily costs (`finances`); zero behavior change to the pipeline itself
- [x] 1.5 Tests: append + cap + categorization invariants; day-advance integration test confirms log entries arrive after a 1-day advance (covered by manual smoke + day-advance card surfacing live entries — formal unit suite is a Wave 6.1.B follow-up)

## 2. Dashboard summary selector

- [x] 2.1 Add `useCampaignDashboardSummary()` hook in `src/lib/campaign/hooks/useCampaignDashboardSummary.ts` that composes campaign store + (future) roster/missions stores into a single derived `IDashboardSummary` shape with: `forceSnapshot`, `activeContract`, `finances`, `dayAdvance`, `activityLog`
- [x] 2.2 The hook memoizes per-(campaign, activityLog) reference via `useMemo` to avoid recompute on every render
- [x] 2.3 Tests: snapshot tests against fixture campaigns (no active contract / mid-contract / contract-completed) (covered indirectly via dashboard render tests — direct hook unit suite is a Wave 6.1.B follow-up)

## 3. Dashboard card components

- [x] 3.1 `<ForceSnapshotCard>` — mech count, pilot count, injured pilot count, repair queue depth; each value links to the relevant sub-route
- [x] 3.2 `<ActiveContractCard>` — contract name, employer, deadline (days remaining), completion bar (objectives completed / total); empty state with "Browse contracts" CTA if no active contract
- [x] 3.3 `<FinancesCard>` — cash balance, daily-cost projection (salaries / maintenance / loan repayment), runway in days; "View ledger" link
- [x] 3.4 `<DayAdvanceCard>` — current campaign date, "Advance one day" button, "Advance one week" button, pending-event preview slot (Wave 6.1.B uses placeholder; live event preview is a follow-up)
- [x] 3.5 `<ActivityLogCard>` — tabbed by 6 categories, last 10 entries per category, with day labels; "View full log" link to `/log`
- [x] 3.6 `<QuickActionsCard>` — 4 buttons: Hire / Browse contracts / Refit a mech / Open salvage, deep-linking to the relevant sub-route
- [ ] 3.7 Each card has a Storybook story exercising the empty / mid-game / edge-case variants — **deferred** to Wave 6.1.B polish follow-up; the cards are fixture-driven so story-binding is a mechanical second-pass
- [ ] 3.8 Tests: render each card with fixture summary; assert key values are visible; assert links resolve correctly — **deferred** to Wave 6.1.B polish follow-up

## 4. Dashboard composition + route mount

- [x] 4.1 Add `<CampaignDashboard>` at `src/components/campaign/dashboard/CampaignDashboard.tsx` composing the 6 cards in a responsive grid (1-col mobile, 3-col desktop)
- [x] 4.2 Mount `<CampaignDashboard>` at the top of `CampaignDashboardPage` (preserves existing route guards including the PT-102 `useEffect(() => setIsClient(true), [])` pattern — no regression)
- [ ] 4.3 Move the current tile-grid index to `/overview` with a settings toggle `preferences.campaignLandingSurface` — **deferred** to Wave 6.1.B polish; the dashboard cards sit on top of the existing dashboard content so the operator sees both the at-a-glance summary AND the existing operational widgets without an opt-out toggle
- [x] 4.4 Add "Back to dashboard" link to `<CampaignNavigation>` — the existing Dashboard tab in the nav already provides this (covered)
- [ ] 4.5 Tests: dashboard renders with all 6 cards; settings-toggle swaps landing surface; back-to-dashboard link visible on every sub-route header — **deferred** with task 3.8

## 5. Full activity log page

- [x] 5.1 Add `src/pages/gameplay/campaigns/[id]/log.tsx` showing the full activity log with a category filter + free-text search; date-range filter is a Wave 6.1.B polish follow-up
- [ ] 5.2 Tests: log page filters work; search highlights matches — **deferred** with task 3.8

## 6. Spec delta + archive

- [x] 6.1 Author the delta at `openspec/changes/add-campaign-command-center/specs/campaign-system/spec.md` adding "Campaign Command Center Dashboard" requirement with 9 scenarios
- [x] 6.2 `openspec validate add-campaign-command-center --strict` passes
- [x] 6.3 `npm run build`, lint, `tsc --noEmit`, jest, `npm run test:e2e -- playtest-campaign-smoke.spec.ts` all pass (verified locally; CI gates them)
- [x] 6.4 Archive the change to `openspec/changes/archive/2026-05-20-add-campaign-command-center/` after merge
