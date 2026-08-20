> Completed 2026-08-20 (reconciliation): implemented and delivered by the CAMP-01E wave (product PR #1237); attested by the durable reviewed-head + exact-main + cleanup receipts (full durable index readmitted 23/23 through validator plus all four anchors after CAMP-R1, 2026-08-12) and the council review at `openspec/council-decisions/2026-08-12-camp01-wave-execution-review.md`.

## 1. Saved-design adapter

- [x] 1.1 Runtime-validate raw saved BattleMech index rows and map exact id, display name, and finite positive tonnage.
- [x] 1.2 Exclude invalid rows with an explicit observation and no construction-payload fallback or inferred identity.

## 2. Picker and roster identity

- [x] 2.1 Render named Stock Templates and Saved Designs groups with loading, empty, error, retry, keyboard, feedback, desktop, and 390x844 behavior.
- [x] 2.2 Mint a fresh roster-instance id per add while preserving exact `unitRef`, `unitSource=custom`, and root-force membership without copying construction state.
- [x] 2.3 Extend `e2e/campaign-customizer-handoff.spec.ts` through saved-design selection and prove presentation plus draft/root-force identity evidence.

## 3. Verification and delivery

- [x] 3.1 Run `npm.cmd test -- --watchAll=false --runTestsByPath src/components/gameplay/pages/campaigns/create/__tests__/savedCustomUnitCampaignAdapter.test.ts src/components/gameplay/pages/campaigns/create/__tests__/CreateCampaignPage.RosterStep.test.tsx src/components/gameplay/pages/campaigns/create/__tests__/CreateCampaignPage.rosterPersistence.test.ts --runInBand`, `node scripts/playwright/run-playwright.mjs test --project=chromium e2e/campaign-customizer-handoff.spec.ts --workers=1`, Node 22 gates, strict OpenSpec validation, and OpenSpec CI QC.
- [x] 3.2 After CAMP-01D exact-main cleanup, use the row-resolved CAMP-01E controller register/proof gates and pass the 10-file/450-line cap; then SHA-guard merge, exact-main proof, cleanup, and prune before CAMP-01F.
