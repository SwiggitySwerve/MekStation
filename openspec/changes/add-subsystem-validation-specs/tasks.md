# Tasks: Add Subsystem Validation Specs

## 0. Audit artefact + shared infrastructure

- [x] 0.1 Check in `playtest/phase-6/SUBSYSTEM_UI_AUDIT.md` capturing the audit matrix from this change's proposal (the per-subsystem coverage table) as durable evidence of the starting state
- [x] 0.2 Add `e2e/helpers/campaignSeeders.ts` exporting `seedInjuredPilot`, `seedSalvageCandidates`, `seedRepairTickets`, `seedMoraleState`, `seedRefitReadyUnit`, `seedHiringHall`, `seedContractMarket`. Each helper mutates `window.__ZUSTAND_STORES__.campaign.getState()` to pre-populate the campaign for spec assertions. Reuses the PT-004 store-exposure pattern; no new mechanism
- [ ] 0.3 Tests: each seeder helper round-trips with a unit test in `e2e/helpers/__tests__/campaignSeeders.test.ts` — **deferred** to Wave 6.1.C polish; the helpers are exercised indirectly by the Track A specs

## 1. Track A — Validation specs writable today

- [x] 1.1 `e2e/playtest-subsystem-hiring.spec.ts`: hiring panel grid renders after market seed (full hire-flow round-trip is deferred — the spec asserts the grid mounts, primary action is wired in the existing HiringPanel component per the audit)
- [x] 1.2 `e2e/playtest-subsystem-loans.spec.ts`: finances page renders the take-loan form (full take-loan submit round-trip deferred to follow-up — see proposal)
- [x] 1.3 `e2e/playtest-subsystem-contracts.spec.ts`: contract market grid renders with seeded offers

## 2. Track B — Testid backfill (7 subsystems) — DEFERRED

The 7 NEEDS-SETUP subsystems (XP/Leveling, Medical Bay, Salvage, Repair Queue, Refit, Morale, Force Hierarchy) require either testid backfill OR campaign-state seeding before a Playwright spec can drive them. The audit matrix and the campaignSeeders helpers ship in Wave 6.1.C; the per-subsystem specs are explicit follow-up candidates so the foundational e2e-testing capability spec can ship now.

- [ ] 2.1 `src/components/pilots/PilotProgressionPanel.tsx`: add XP / skill-upgrade testids — **deferred** (Wave 6.1.C-B follow-up)
- [ ] 2.2 `src/pages/gameplay/campaigns/[id]/forces.tsx`: add ForceNode testids — **deferred** (Wave 6.1.C-B follow-up)
- [ ] 2.3 `src/components/campaign/TurnoverReportPanel.tsx`: add turnover testids — **deferred** (Wave 6.1.C-B follow-up)
- [ ] 2.4-2.10 7 corresponding `playtest-subsystem-*.spec.ts` specs (xp, medical, salvage, repair, refit, morale, toe) — **deferred** (Wave 6.1.C-B follow-up; sub-task per spec)

## 3. Track C — UI stubs for the 9 BLOCKED subsystems — DEFERRED

The 9 BLOCKED subsystems (contract negotiation, faction reputation, random events, pilot age, awards, rank, unit market, maintenance, turnover) require minimum read-only UI stubs before any Playwright spec can be authored. These ship as a separate Wave 6.1.C-C follow-up change because each stub is a small but real component with Storybook story coverage and accessibility review.

- [ ] 3.1-3.8 9 read-only UI stubs (ContractNegotiationPanel, FactionStandingPanel, RandomEventsLog, PilotAgePanel, AwardsPanel, RankPromotionPanel, UnitMarketPanel, MaintenanceCheckLog, expanded TurnoverReportPanel) — **deferred** (Wave 6.1.C-C follow-up)
- [ ] 3.9 9 corresponding validation specs — **deferred** (Wave 6.1.C-C follow-up)

## 4. Spec deltas

- [x] 4.1 Author `openspec/changes/add-subsystem-validation-specs/specs/e2e-testing/spec.md` ADDING a "Subsystem Validation Coverage" requirement; creates the new `e2e-testing` capability spec
- [x] 4.2 (Skipped — campaign-system source-of-truth has no per-subsystem requirements to MODIFY; per-subsystem testid sub-requirement is covered by the new `e2e-testing` capability)
- [x] 4.3 `openspec validate add-subsystem-validation-specs --strict` passes
- [x] 4.4 `npm run build`, lint, `tsc --noEmit`, jest, `npm run test:e2e -- playtest-subsystem-*.spec.ts` (3 new specs) pass on CI
- [ ] 4.5 Archive the change to `openspec/changes/archive/2026-05-20-add-subsystem-validation-specs/` after merge

## 5. Closeout corrections

- [x] 5.1 Update `playtest/CLOSEOUT.md` "Exit criteria 4 — manual checklists signed off" to reflect the subsystem-validation coverage that this change adds (correction note added at the top of CLOSEOUT.md)
- [ ] 5.2 Add a `[deferred]` row to `playtest/ISSUES.md` for each Track C subsystem covering its write-action (PT-2xx series) — **deferred** until the Track C UI stubs land (no point ledgering write-actions for surfaces that don't render anything yet)
