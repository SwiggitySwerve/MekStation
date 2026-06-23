## 1. Maintenance Ledger Contract

- [x] 1.1 Add `docs/qc/maintenance-warning-ledger.json` with reviewed Wave 12 category counts and fixed/accepted/follow-up entries for actionable repo-wide findings.
- [x] 1.2 Lower `docs/qc/maintenance-baseline.json` critical/high state to the current verified `src` gate and add a calibration note for the Wave 12 checkpoint.
- [x] 1.3 Update QC registry, QC map, major scenario catalog, and validation graph so `maintenance-code-health` references the spec, ledger, and validator.

## 2. Validator Implementation

- [x] 2.1 Add a maintenance ledger validator that re-runs stale TODO, file-bloat, near-duplicate, import-health, and design-violation scanner categories and verifies ledger coverage.
- [x] 2.2 Wire `package.json` so `verify:qc:maintenance` runs both `maintain:scan:gate` and the ledger validator.
- [x] 2.3 Add focused tests for clean-ledger pass and untracked-finding failure behavior.

## 3. Stale Comment Cleanup

- [x] 3.1 Rewrite stale explanatory `WORKAROUND` comments in e2e specs so the scanner no longer treats them as active TODO-like debt.
- [x] 3.2 Preserve recent `fixme` skipped-test trackers with their remediation references.

## 4. Verification

- [x] 4.1 Run `npm.cmd run verify:qc:maintenance`.
- [x] 4.2 Run `npm.cmd run qc:validate`.
- [x] 4.3 Run `openspec.cmd validate wave-12-maintenance-debt-housekeeping --strict` and `openspec.cmd validate --all --strict`.
- [x] 4.4 Archive the change after verification passes.
