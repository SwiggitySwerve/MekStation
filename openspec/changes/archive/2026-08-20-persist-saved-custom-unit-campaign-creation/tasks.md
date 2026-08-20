> Completed 2026-08-20 (reconciliation): implemented and delivered by the CAMP-01F wave (product PR #1239); attested by the durable reviewed-head + exact-main + cleanup receipts (full durable index readmitted 23/23 through validator plus all four anchors after CAMP-R1, 2026-08-12) and the council review at `openspec/council-decisions/2026-08-12-camp01-wave-execution-review.md`.

## 1. Production commit

- [x] 1.1 Route wizard submission through the existing campaign persistence store and server `PUT`.
- [x] 1.2 Await an accepted `saved` result before success feedback or dashboard navigation and verify the accepted campaign/roster/root-force identities.

## 2. Recovery and conflict

- [x] 2.1 Preserve one pending campaign id and roster across failure; retry the same id without duplicate campaign, roster, or root-force entries.
- [x] 2.2 Suppress concurrent submits and apply an accepted result once.
- [x] 2.3 Keep `409 Conflict` explicit and reject automatic version adoption, overwrite, success, or navigation.
- [x] 2.4 Extend `e2e/campaign-customizer-handoff.spec.ts` with the exact receipt-pinned test through the real production submit, accepted server read, error recovery, same-id retry, and a 409 player-retry assertion that retains the same pending campaign id without overwrite.

## 3. Verification and delivery

- [x] 3.1 Run `npm.cmd test -- --watchAll=false --runTestsByPath src/components/gameplay/pages/campaigns/create/__tests__/CreateCampaignPage.submitPersistence.test.tsx src/stores/campaign/__tests__/useCampaignPersistenceStore.test.ts --runInBand`, `node scripts/playwright/run-playwright.mjs test --project=chromium e2e/campaign-customizer-handoff.spec.ts --workers=1`, Node 22 gates, strict OpenSpec validation, and OpenSpec CI QC.
- [x] 3.2 After CAMP-01E exact-main cleanup, use the row-resolved CAMP-01F controller register/proof gates and pass the 8-file/400-line cap; then SHA-guard merge, exact-main proof, cleanup, and prune before CAMP-01G.
