# Change: Add Subsystem Validation Specs

## Why

The Waves 1-5 playtest closed Phase 3 with `e2e/playtest-campaign-smoke.spec.ts` validating that the **page tree mounts without console errors** for 12 campaign sub-routes. That spec walks `personnel`, `mech-bay`, `medical-bay`, `salvage`, `hiring`, `finances`, `contract-market`, `repair-bay`, `prestige-morale`, `missions`, `forces`, and the new dashboard — and asserts the root testid for each route is visible and no critical console errors fire. It does NOT exercise any subsystem's actual behavior.

That means the playtest exit-criteria of "campaign system is end-to-end stable" is misleading. We shipped 17+ MekHQ-equivalent campaign subsystems in Wave 4 (hiring hall, XP/leveling, medical bay, salvage, repair queue, refit, loans, contract market, contract negotiation, faction reputation, random events, morale state machine, force hierarchy, turnover, aging, awards, ranks+pay, unit market, maintenance) — and we have a **mount check** for each surface, not a **feature check**. The audit at `playtest/phase-6/SUBSYSTEM_UI_AUDIT.md` (delivered as part of this change) walked all 17+ subsystems with this matrix:

| Viability | Count | Subsystems |
|---|---|---|
| STRAIGHTFORWARD (spec writable today) | 3 | Hiring Hall, Loans + Interest, Contract Market |
| NEEDS-SETUP (testid gap or state-seed) | 7 | XP/Leveling, Medical Bay, Salvage, Repair Queue, Refit, Morale, Force Hierarchy (TO&E) |
| BLOCKED (no UI exists) | 9 | Contract Negotiation, Faction Reputation, Random Events, Aging, Awards, Ranks+Pay, Unit Market, Maintenance (turnover panel partial) |

So today: 3 of 19 subsystems are demonstrably reachable from a user's hands. 7 more are 1-3 testid lines away from being reachable. 9 are silent — the code runs but nothing renders, meaning a user cannot observe or interact with them.

A playtest that closes with 3/19 validated and 9/19 unobservable is not the "end-to-end stable Waves 1-5 system" the closeout claims. This change closes that gap in three parallel tracks: write the specs that can be written today, fix the testid gaps to unblock the next 7, and stub minimum read-only UI for the silent 9 so subsequent specs can be authored.

## What Changes

### Track A — Validation specs writable today (3 subsystems)

- ADDED `e2e/playtest-subsystem-hiring.spec.ts` — full hire-flow: open hiring hall, assert candidates rendered, click `candidate-hire-{offer.id}`, assert pilot appears in personnel roster + ledger debits hire bonus
- ADDED `e2e/playtest-subsystem-loans.spec.ts` — take-loan flow: open finances, fill principal/rate/term, submit, assert loan-row persists + balance increased + daily-cost projection updated
- ADDED `e2e/playtest-subsystem-contracts.spec.ts` — accept-contract flow: open contract market, click `offer-accept-{offer.id}`, assert active contract in dashboard active-contract card + ledger receives signing bonus

### Track B — Testid backfill (unblocks 7 subsystems)

- ADDED `data-testid` attributes per the audit findings, then ADDED the validation spec for each unblocked subsystem. The minimum testid set per component:
  - `src/components/pilots/PilotProgressionPanel.tsx`: `xp-available`, `xp-total`, `skill-upgrade-gunnery`, `skill-upgrade-piloting`
  - `src/pages/gameplay/campaigns/[id]/forces.tsx`: `force-tree` on the wrapper Card, `force-node-{force.id}` on each tree row
  - `src/components/campaign/TurnoverReportPanel.tsx`: `turnover-report-panel` on root, `departure-row-{pilotId}` on each card
  - Medical Bay, Salvage, Repair Queue, Refit: testids already present per audit — only state-seed helpers needed
- ADDED `e2e/playtest-subsystem-xp.spec.ts`, `playtest-subsystem-medical.spec.ts`, `playtest-subsystem-salvage.spec.ts`, `playtest-subsystem-repair.spec.ts`, `playtest-subsystem-refit.spec.ts`, `playtest-subsystem-morale.spec.ts`, `playtest-subsystem-toe.spec.ts` — one spec per subsystem exercising its primary action (or in read-only cases, asserting the output renders after a seeded state)
- ADDED `e2e/helpers/campaignSeeders.ts` — Playwright helpers that pre-populate campaign state via the existing zustand store (injured pilot, salvage candidates, repair tickets, morale state, refit-ready unit). Reuses the same `window.__stores__` exposure pattern PT-004 introduced; no new mechanism

### Track C — UI stubs for blocked subsystems (9 subsystems)

- ADDED minimum read-only display panels for the 9 BLOCKED subsystems so they become observable and testable, even if write actions defer to a later change:
  - `<ContractNegotiationPanel>` — read-only 4-clause display in `contract-market` page (negotiation actions deferred)
  - `<FactionStandingPanel>` — read-only standing-by-faction table on a new `/gameplay/campaigns/[id]/faction-standing` route
  - `<RandomEventsLog>` — events log card showing the last 10 events the random-events lib has emitted, with type + severity badges (integrate with the activity-log slice from `add-campaign-command-center` if both ship)
  - `<PilotAgePanel>` — add `age`, `experience`, `birthdate` fields to `PersonnelSidePanel`'s existing "Identity" tab
  - `<AwardsPanel>` — add awards list (medals, ribbons, kill commendations) to `PersonnelSidePanel`'s existing "Progression" tab
  - `<RankPromotionPanel>` — add rank display + promote-button to `PersonnelSidePanel`; promotion fires the existing `promotePilot` action (already in `rankSystems.ts`)
  - `<UnitMarketPanel>` — new `/gameplay/campaigns/[id]/unit-market` route reading existing `unitMarket.ts` lib; offers, purchase action
  - `<MaintenanceCheckLog>` — add a "Maintenance" tab to the activity-log card showing recent maintenance-check outcomes (pass/fail/critical)
  - Extend `<TurnoverReportPanel>` with the missing testids and add a "Turnover" tab to the activity-log card listing recent departures
- ADDED a validation spec for each of the 9 stubs

### Spec layer

- ADDED a `subsystem-validation` spec capability documenting that every shipped MekHQ-equivalent subsystem MUST have (1) a UI surface where its primary output is visible, (2) `data-testid` attributes on the primary action element + the output element, (3) a Playwright spec exercising the primary action OR (for read-only subsystems) asserting the output renders after seeded state, (4) the audit matrix above as appendix

## Dependencies

- **Requires (already shipped)**: `add-campaign-system` (Wave 4) — all 17 subsystem libs and their initial UI surfaces
- **Recommended pairing**: `add-campaign-command-center` (Wave 6.1) — Track C's activity-log integrations are cleaner if the dashboard's activity-log slice ships first
- **No new transport, no new schema, no new store actions** — all subsystem actions already exist in the lib layer

## Impact

- Affected specs:
  - `e2e-testing` — ADD a "Subsystem Validation Coverage" requirement (every shipped subsystem has a Playwright spec exercising its primary surface)
  - `campaign-system` — MODIFY existing subsystem requirements to add "UI surface MUST expose `data-testid` attributes per the testid convention" sub-requirement
- Affected code (~30 files across 3 tracks):
  - `e2e/playtest-subsystem-*.spec.ts` — 10 new Playwright specs (3 Track A + 7 Track B)
  - `e2e/helpers/campaignSeeders.ts` — new shared seed helpers
  - 7 component files for Track B testid backfill (~3-line changes each)
  - 9 new UI components for Track C (read-only stubs; ~100-200 lines each)
  - 2 new sub-routes for Track C (`faction-standing.tsx`, `unit-market.tsx`)
  - `playtest/phase-6/SUBSYSTEM_UI_AUDIT.md` — checked-in copy of the audit matrix as evidence
- No database migrations
- Storybook bundle grows by ~9 stories (one per Track C stub)

## Non-Goals

- A new test framework — reuses existing Playwright + the PT-004 store-exposure pattern
- Write actions for the BLOCKED subsystems — Track C stubs are read-only by design; write actions are a follow-up change candidate per subsystem
- Cross-subsystem integration specs (e.g. hire pilot → assign to mech → pilot XP gains after mission) — those are second-wave specs after this change establishes per-subsystem coverage
- A unified "campaign-feature-coverage" CI gate — proposed as a follow-up once the spec count stabilizes
- Visual regression snapshots for the new stubs — out of scope; storybook stories cover the visual surface
- Touching the Wave-5 co-op surface — `wire-coop-campaign-route` (Wave 6.1 batch) covers that

## Open Questions

- (Track C) Should awards/medals render as iconography (asset-heavy) or as text rows in v1? **Decision: text rows in v1; iconography is a polish follow-up.**
- (Track C) Should the unit market follow the same offers-grid layout as `ContractMarketPanel`? **Decision: yes — for consistency, reuse the layout pattern.**
- (Track B) Should state-seed helpers use direct `window.__stores__` mutations or a new "test-mode" store action? **Decision: direct mutations via the existing exposure — adding test-mode actions creates a parallel surface that drifts.**
