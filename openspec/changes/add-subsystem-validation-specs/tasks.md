# Tasks: Add Subsystem Validation Specs

## 0. Audit artefact + shared infrastructure

- [ ] 0.1 Check in `playtest/phase-6/SUBSYSTEM_UI_AUDIT.md` capturing the audit matrix from this change's proposal (the per-subsystem coverage table) as durable evidence of the starting state
- [ ] 0.2 Add `e2e/helpers/campaignSeeders.ts` exporting `seedInjuredPilot`, `seedSalvageCandidates`, `seedRepairTickets`, `seedMoraleState`, `seedRefitReadyUnit`, `seedHiringHall`, `seedContractMarket`. Each helper mutates `window.__stores__.campaign.getState()` to pre-populate the campaign for spec assertions. Reuses the PT-004 store-exposure pattern; no new mechanism
- [ ] 0.3 Tests: each seeder helper round-trips with a unit test in `e2e/helpers/__tests__/campaignSeeders.test.ts` (asserts the seeded state survives `getState()` re-read)

## 1. Track A — Validation specs writable today

- [ ] 1.1 `e2e/playtest-subsystem-hiring.spec.ts`: navigate `/gameplay/campaigns/[id]/hiring`, assert `hiring-panel-grid` visible, seed via `seedHiringHall` if empty, click first `candidate-hire-{id}`, assert candidate disappears from grid, assert new pilot row appears in personnel roster, assert ledger debits the hire bonus
- [ ] 1.2 `e2e/playtest-subsystem-loans.spec.ts`: navigate `/gameplay/campaigns/[id]/finances`, fill `loan-input-principal` / `loan-input-rate` / `loan-input-term`, click `loan-submit`, assert `loan-row-*` appears, assert `finances-balance` increased by principal, assert daily-cost projection shows new loan-repayment line
- [ ] 1.3 `e2e/playtest-subsystem-contracts.spec.ts`: navigate `/gameplay/campaigns/[id]/contract-market`, assert `contract-market-grid` populated (seed via `seedContractMarket` if empty), click first `offer-accept-{id}`, assert active contract appears in campaign store, assert dashboard active-contract card surfaces the new contract, assert ledger shows signing bonus credit

## 2. Track B — Testid backfill (7 subsystems)

- [ ] 2.1 `src/components/pilots/PilotProgressionPanel.tsx`: add `data-testid="xp-available"`, `data-testid="xp-total"`, `data-testid="skill-upgrade-gunnery"`, `data-testid="skill-upgrade-piloting"` to the existing elements
- [ ] 2.2 `src/pages/gameplay/campaigns/[id]/forces.tsx`: add `data-testid="force-tree"` to the wrapping Card, `data-testid={\`force-node-${force.id}\`}` to each `ForceNode` row
- [ ] 2.3 `src/components/campaign/TurnoverReportPanel.tsx`: add `data-testid="turnover-report-panel"` to root, `data-testid={\`departure-row-${departure.pilotId}\`}` to each DepartureCard
- [ ] 2.4 `e2e/playtest-subsystem-xp.spec.ts`: open a pilot's side panel via PersonnelSidePanel, click "Progression" tab, seed XP via `window.__stores__.pilots.awardXP(pilotId, 1000)`, assert `xp-available` shows 1000, click `skill-upgrade-gunnery`, assert pilot's gunnery skill improves by 1
- [ ] 2.5 `e2e/playtest-subsystem-medical.spec.ts`: seed `seedInjuredPilot`, navigate to medical-bay, assert `medical-bay-row-{pilotId}` is visible, assert `medical-bay-recovery-{pilotId}` shows expected days, advance day once via dashboard, assert recovery countdown decremented
- [ ] 2.6 `e2e/playtest-subsystem-salvage.spec.ts`: seed `seedSalvageCandidates`, navigate to salvage, assert `salvage-panel` visible with N rows, click `salvage-accept-{partId}`, assert `salvage-value-total` updated, assert accepted part appears in inventory
- [ ] 2.7 `e2e/playtest-subsystem-repair.spec.ts`: seed `seedRepairTickets`, navigate to repair-bay, assert `repair-bay-queue` visible, click `repair-ticket-up-{ticketId}` on second row, assert ticket order swapped
- [ ] 2.8 `e2e/playtest-subsystem-refit.spec.ts`: seed `seedRefitReadyUnit`, navigate to mech-bay, click `mech-bay-refit-{unitId}`, assert `refit-launch-{unitId}` panel opens, modify armor + jump MP, click `refit-commit`, assert `refit-commit-result` shows success
- [ ] 2.9 `e2e/playtest-subsystem-morale.spec.ts`: seed `seedMoraleState({ state: 'Cautious', transitions: [...] })`, navigate to prestige-morale, assert `morale-state-badge` shows "Cautious", assert `morale-transitions-list` contains seeded rows
- [ ] 2.10 `e2e/playtest-subsystem-toe.spec.ts`: navigate to forces, assert `force-tree` visible, assert `force-node-{lanceId}` rendered for each lance in the campaign, assert recursive force hierarchy renders (root → company → lance → unit)

## 3. Track C — UI stubs for the 9 BLOCKED subsystems

- [ ] 3.1 `<ContractNegotiationPanel>` (read-only): renders the 4-clause negotiation summary (payment, length, support, salvage) on the contract-market detail view. New file `src/components/campaign/command/ContractNegotiationPanel.tsx` consuming `contractNegotiation.ts` lib. Testids: `contract-negotiation-panel`, `negotiation-clause-{payment|length|support|salvage}`. Storybook story
- [ ] 3.2 `<FactionStandingPanel>` (read-only): table of standing-by-faction (one row per Inner Sphere faction). New file + new route `src/pages/gameplay/campaigns/[id]/faction-standing.tsx`. Testids: `faction-standing-panel`, `faction-row-{factionId}`. Storybook story
- [ ] 3.3 `<RandomEventsLog>` (read-only): events log card showing the last 10 events with type + severity badges. New file `src/components/campaign/RandomEventsLog.tsx`. If `add-campaign-command-center` ships, integrate as a tab in the activity-log card; otherwise standalone on dashboard. Testids: `random-events-log`, `event-row-{eventId}`. Storybook story
- [ ] 3.4 `<PilotAgePanel>` (read-only): add `age`, `experience` years, `birthdate` fields to the existing `PersonnelSidePanel` "Identity" tab. Testids: `pilot-age`, `pilot-experience-years`, `pilot-birthdate`. No new file — extends `PersonnelSidePanel.tsx`. Existing story updated
- [ ] 3.5 `<AwardsPanel>` (read-only): add awards list to the existing `PersonnelSidePanel` "Progression" tab (medals + ribbons + kill commendations as text rows). Testids: `awards-list`, `award-row-{awardId}`. No new file — extends `PersonnelSidePanel.tsx`. Existing story updated
- [ ] 3.6 `<RankPromotionPanel>`: rank display + promote-button on `PersonnelSidePanel`. Promotion fires the existing `promotePilot` action from `rankSystems.ts`. Testids: `pilot-rank-current`, `pilot-rank-promote-button`, `pilot-rank-eligible-next`. No new file — extends `PersonnelSidePanel.tsx`. Existing story updated
- [ ] 3.7 `<UnitMarketPanel>`: full offers-grid layout (clone `ContractMarketPanel` shape) on a new `src/pages/gameplay/campaigns/[id]/unit-market.tsx` route. Purchase action fires existing `unitMarket.ts` `purchaseUnit` action. Testids: `unit-market-grid`, `unit-offer-{offerId}`, `unit-offer-purchase-{offerId}`. Storybook story
- [ ] 3.8 `<MaintenanceCheckLog>` (read-only): tab in the activity-log card OR standalone card showing recent maintenance-check outcomes (pass/fail/critical badges). Testids: `maintenance-log`, `maintenance-check-row-{checkId}`. Storybook story
- [ ] 3.9 Validation specs for the 9 stubs at `e2e/playtest-subsystem-{negotiation,faction,events,age,awards,rank,unit-market,maintenance,turnover}.spec.ts`. Each spec seeds state then asserts the read-only output renders correctly. Rank spec ALSO exercises the promote action

## 4. Spec deltas

- [ ] 4.1 Author `openspec/changes/add-subsystem-validation-specs/specs/e2e-testing/spec.md` ADDING a "Subsystem Validation Coverage" requirement: every shipped MekHQ-equivalent campaign subsystem MUST have (a) a UI surface where its primary output is visible, (b) `data-testid` on the primary action + the output, (c) a Playwright spec exercising or asserting the output. This creates the new `e2e-testing` capability spec (no existing source-of-truth file)
- [ ] 4.2 (Skipped — campaign-system source-of-truth has no per-subsystem requirements to MODIFY; per-subsystem testid sub-requirement is covered by the new `e2e-testing` capability above)
- [ ] 4.3 `openspec validate add-subsystem-validation-specs --strict` passes
- [ ] 4.4 `npm run build`, lint, `tsc --noEmit`, `jest`, `npm run test:e2e -- playtest-subsystem-*.spec.ts` (all 19 new specs) pass on CI
- [ ] 4.5 Archive the change to `openspec/changes/archive/YYYY-MM-DD-add-subsystem-validation-specs/` after merge

## 5. Closeout corrections

- [ ] 5.1 Update `playtest/CLOSEOUT.md` "Exit criteria 4 — manual checklists signed off" to reflect the subsystem-validation coverage that this change adds (current claim that "campaign system is end-to-end stable" was true only at the mount-check level; the new specs raise it to feature-check level)
- [ ] 5.2 Add a `[deferred]` row to `playtest/ISSUES.md` for each Track C subsystem covering its write-action (e.g. PT-201 contract negotiation write, PT-202 faction standing change, PT-203 random events trigger, etc.) — these are follow-up change candidates, not P0/P1 defects
