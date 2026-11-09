## Implementation

- [x] Record failing component tests for repeated pointer and keyboard dismissal.
- [x] Guard dismissal before scheduling the existing fade callback.
- [x] Kill a deliberate missing-guard mutant and restore the fix.
- [x] Run whole-directory tests, integration, both TypeScript configs, lint, formatting, unit QC, OpenSpec, and CI budgets.

## Evidence

Logs: `E:/Projects/Personal/_scratch/sm-audit-reports/w3-u-low/anomaly-dismiss/`.

- Red: 2 failed, 17 passed (`red.log`). Green: 19 passed (`green.log`).
- Removing the guard restored both duplicate-callback failures (`mutant.log`).
- Restored implementation: 63 whole-directory/integration/unit-QC suites passed; 901 tests passed, 32 skipped (`tests.log`), using Node 22.22.0.
- Both TypeScript configs, root lint (63 warnings, 0 errors), unit QC, formatting, strict OpenSpec (303 items), and OpenSpec accounting passed.
- CI budgets passed: 57 unkeyable and 92 repo-wide tests (`budget.log`).
