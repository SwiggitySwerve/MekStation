## Implementation

- [x] Record failing hook and component tests for transport throws/rejections and retry.
- [x] Catch submission failures and display a local failure outcome.
- [x] Verify existing outcomes, whole-folder tests, integration tests, typechecks, lint, formatting, unit QC, OpenSpec, and CI budgets.
- [x] Kill a deliberate failure-handling mutant and record evidence.

## Evidence

Evidence logs: `E:/Projects/Personal/_scratch/sm-audit-reports/w3-k-l3-l4-l7/k-l3/`.

- Red: 3 failed, 7 passed before implementation (`red.log`).
- Whole co-op directory, integration directory, and lint-units suite: 71 suites passed, 873 tests passed, 32 skipped (`tests.log`).
- Co-op accessibility: 2 suites and 42 tests passed (`a11y.log`).
- Both TypeScript configs passed; lint: 63 warnings, 0 errors; unit QC passed.
- CI cache census: 57 unkeyable and 92 repo-wide, unchanged (`budget.log`).
- OpenSpec strict validation and CI accounting passed (`openspec.log`).
- Mutant keeping failed submissions pending: 3 failures; restored implementation: 10 tests passed (`mutant.log`, `restored.log`).
