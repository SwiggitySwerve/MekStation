## Implementation

- [x] Record failing page tests for failed and successful swap feedback.
- [x] Reuse the existing assignment-result toast helper for swaps.
- [x] Kill a deliberate discarded-result mutant and restore the fix.
- [x] Run whole-directory tests, integration, both TypeScript configs, lint, formatting, unit QC, OpenSpec, and CI budgets.

## Evidence

Logs: `E:/Projects/Personal/_scratch/sm-audit-reports/w3-u-low/force-swap-error/`.

- Red: 2 failed, 2 passed (`red.log`). Green: 4 passed (`green.log`).
- Converting every swap result to success caused the failure-feedback test to fail (`mutant.log`: 1 failed, 3 passed).
- Restored implementation: 55 whole-directory/integration/unit-QC suites passed; 679 tests passed, 32 skipped (`tests.log`), using Node 22.22.0.
- Both TypeScript configs, root lint (63 warnings, 0 errors), unit QC, formatting, strict OpenSpec (303 items), and OpenSpec accounting passed.
- CI budgets passed: 57 unkeyable and 92 repo-wide tests (`budget.log`).
