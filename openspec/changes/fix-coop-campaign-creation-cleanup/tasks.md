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
