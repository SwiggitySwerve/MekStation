## Implementation

- [x] Record failing tests for attempt-only cleanup, pre-existing campaign protection, cleanup retry, save refusal, campaign switching, and acknowledged-room preservation.
- [x] Implement guarded cleanup and restore through existing persistence contracts.
- [x] Run whole page-module and integration directories, both TypeScript configs, lint, formatting, unit QC, OpenSpec, and CI budgets.
- [x] Kill a deliberate cleanup mutant and verify the restored implementation.

## Evidence

Evidence logs: `E:/Projects/Personal/_scratch/sm-audit-reports/w3-k-l3-l4-l7/k-l7/`.

- Red before implementation: 6 failed, 59 passed (`red.log`).
- Focused green: 65 tests passed (`green-focused.log`), including pre-existing-id and mismatched-save protection.
- Both TypeScript configs passed; lint: 63 warnings, 0 errors; unit QC passed.
- Changed-file formatting, OpenSpec strict validation, and CI accounting passed.
- Initial whole-directory/integration/QC run: 63 suites, 831 tests passed, 32 skipped (`tests.log`).
- Mutant targeting the pre-existing campaign instead of the attempt's saved id: 1 failure; restored creation suite: 65 passed (`mutant.log`, `restored.log`).
- After merging main through `1480f0445`, repeated the full run: 63 suites, 831 passed, 32 skipped (`tests-final.log`). Both TypeScript configs, lint (63 warnings), unit QC, and OpenSpec accounting passed again. Cache census remained 57 unkeyable and 92 repo-wide (`budget-final.log`).

## Hosted CI follow-up: campaign-list caller

Run `42543194358` exposed a caller-path gap: the campaign-list page mounts the real co-op entry panel, but its test directory was omitted from the original K-L7 local run. Local reproduction: 1 failed, 6 passed (`ci-followup/red.log`). The success fixture returned `record: {}` instead of acknowledging its saved `campaignId`, so the production ownership check correctly refused it. The original successful-navigation assertion remains unchanged; the fixture now models the saved id and public cleanup actions. No runtime behavior was weakened.

- [x] Merge origin/main without rebasing and reproduce the hosted failure.
- [x] Correct the stale fixture and add page-level room-refusal and mismatched-receipt tests: 9 passed (`ci-followup/green.log`).
- [x] Run every creation caller, the complete campaign page/page-module directories, integration, and required static gates: 79 suites, 979 passed, 32 skipped (`ci-followup/tests.log`). Both TypeScript configs, lint (63 warnings), lint-units and its Jest suite, formatting, strict OpenSpec validation/accounting, and cache budgets (57 unkeyable, 92 repo-wide) passed.
- [x] Kill a receipt-ownership mutant through the campaign-list page: disabling the new-campaign receipt match caused the mismatched-receipt test to fail (1 failed, 1 passed, 7 skipped). Restoring the original production bytes passed all 9 campaign-list tests (`ci-followup/mutant.log`, `ci-followup/restored.log`).

### Caller inventory

- Direct panel tests: `src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx`.
- Campaign-list entry and adjacent callers: `src/__tests__/pages/gameplay/campaigns/index.coop.test.tsx`, `index.multiCampaign.test.tsx`, and `index.legacyAdoption.test.tsx`. Run the entire directory, including its other campaign pages.
- Panel snapshot and POST contracts: `src/lib/campaign/coop/__tests__/campaignAuthoritativeState.test.ts` and `src/lib/api/__tests__/coopMatchRosterSourceVersion.test.ts`.
- Downstream creation authority: `src/lib/campaign/authority/__tests__/campaignCreationCheckpoint.test.ts` and `src/__tests__/unit/api/multiplayerCoopCreationCheckpoint.test.ts`.
- Shared creation state: `src/stores/campaign/__tests__/campaignCreationPersistence.test.ts` and `campaignCreationPreset.test.ts`.

Discovery used `rg -l CampaignCoopEntryPanel src`, campaign-list imports, create-button selectors, create-button text, and creation-test filenames. Full search classification and logs are under `ci-followup/` in the evidence directory above. Hosted full-unit CI already enforces these caller tests; this follow-up expands the local verification scope to match those paths.
