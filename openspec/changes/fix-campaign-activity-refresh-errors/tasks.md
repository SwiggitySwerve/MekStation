## Implementation

- [x] Record failing hook, adapter, and component tests for retained history and visible warnings.
- [x] Retain same-key entries on errors and isolate state by viewer key.
- [x] Display refresh warnings beside retained history in both surfaces.
- [x] Run whole touched directories and integration tests, both TypeScript configs, lint, formatting, unit QC, OpenSpec, and CI budgets.
- [x] Kill a deliberate entry-clearing mutant and verify the restored implementation.

## Evidence

Evidence logs: `E:/Projects/Personal/_scratch/sm-audit-reports/w3-k-l3-l4-l7/k-l4/`.

- Red before implementation: 6 failed, 23 passed across 3 suites (`red.log`).
- Focused green: 29 tests passed across 3 suites (`green-focused.log`).
- Both TypeScript configs passed; lint: 63 warnings, 0 errors; unit QC passed.
- CI cache census: 57 unkeyable and 92 repo-wide, unchanged (`budget.log`).
- OpenSpec strict validation, CI accounting, and changed-file formatting passed.
- Whole touched directories, integration, and lint-units tests: 74 suites, 805 tests passed, 32 skipped (`tests.log`).
- Mutant clearing entries on refresh error: 3 failures; restored hook: 14 tests passed (`mutant.log`, `restored.log`).
