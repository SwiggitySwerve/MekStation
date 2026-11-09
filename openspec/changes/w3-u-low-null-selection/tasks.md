## Implementation

- [x] Record failing store tests for null equipment selection from null and selected locations.
- [x] Store explicit null for the cleared location.
- [x] Kill a deliberate undefined-location mutant and restore the fix.
- [x] Run whole-directory tests, integration, both TypeScript configs, lint, formatting, unit QC, OpenSpec, and CI budgets.

## Evidence

Logs: `E:/Projects/Personal/_scratch/sm-audit-reports/w3-u-low/null-selection/`.

- Red: 2 failed, 26 passed (`red.log`). Green: 28 passed (`green.log`).
- Restoring the undefined-location expression caused both null-selection cases to fail (`mutant.log`).
- Restored implementation: 148 whole-store-directory/integration/unit-QC suites passed; 2,579 tests passed, 32 skipped (`tests.log`), using Node 22.22.0.
- Both TypeScript configs, root lint (63 warnings, 0 errors), unit QC, formatting, strict OpenSpec (305 items), and OpenSpec accounting passed.
- CI budgets passed: 57 unkeyable and 92 repo-wide tests (`budget.log`).
