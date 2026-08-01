## 1. Snapshot contract

- [ ] 1.1 Extend `CampaignSync` with revision-bound source-bearing roster records and deterministic `forceId -> unitIds` membership, including strict malformed/stale/mismatch tests.
- [ ] 1.2 Build the projection from the real campaign roster and force tree in `CampaignCoopEntryPanel`; reject invalid source, reference, campaign, or membership before room advertisement.

## 2. Server and guest preservation

- [ ] 2.1 Bind campaign id, match id, revision, roster source identity, membership, and host identity through match registration and `CampaignHostRegistry` without local reconstruction.
- [ ] 2.2 Validate the registry's atomic event-sequence high-water/state baseline before guest mirror creation; test exact initial equality, strictly greater contiguous replacement, subscription-before-snapshot race buffering, replay strictly after the baseline, guest cursor advancement, gap/regression rejection, stale-before-current rejection, byte-identical duplicate acceptance, and different same-revision rejection.

## 3. Verification and delivery

- [ ] 3.1 Run `npm.cmd test -- --watchAll=false --runTestsByPath src/types/campaign/__tests__/CampaignSync.test.ts src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx src/lib/multiplayer/server/__tests__/CampaignHostRegistry.test.ts src/lib/campaign/sync/__tests__/sharedCampaignState.integration.test.ts --runInBand` followed by `npm.cmd run verify:qc:coop-campaign-journey`, Node 22 gates, strict OpenSpec validation, and OpenSpec CI QC.
- [ ] 3.2 After every frozen child spec, CAMP-PROOF, PROOF-02 disposition/repair, CAMP-00 cleanup, and CAMP-01A exact-main gate passes, use `qc:camp01-authority-receipt:controller register-pr-target` before editing, then `controller proof --mode=reviewed-head` for design D4's sole `WAVE_CONTRACTS['camp-01b']` row with exact spec/product tuples; direct low-level write/validate is non-authoritative. Pass sequential independent review and the 14-file/480-line cap.
- [ ] 3.3 SHA-guard merge, run `controller proof --mode=exact-main` with a new row-resolved run root and the exact merge tuple, then `controller cleanup` with the exact receipt identity; audit and prune before CAMP-01C implementation.
