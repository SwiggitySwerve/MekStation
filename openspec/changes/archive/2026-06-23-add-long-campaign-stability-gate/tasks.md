## 1. Spec And Baseline

- [x] 1.1 Validate the OpenSpec delta for `add-long-campaign-stability-gate`.
- [x] 1.2 Run the current `campaign-long` journey once as a baseline and inspect the evidence bundle shape.

## 2. Stability Command

- [x] 2.1 Add a `scripts/qc/validate-long-campaign-stability.mjs` command that wraps `campaign-long` execution with configurable seed, contracts, runs, run ID, and evidence directory.
- [x] 2.2 Write `stability-manifest.json` with run metadata, compared artifact digests, save round-trip checks, execution backing summary, UI flow linkage, drift entries, and pass/fail status.
- [x] 2.3 Append stability failure bug candidates to `bugs.json` and structured stability diagnostics to `system.ndjson`.
- [x] 2.4 Wire package scripts for `qc:campaign-long:stability` and `verify:qc:campaign-long`.

## 3. UI Flow Linkage

- [x] 3.1 Update the `campaign-long` UI flow QC command to use the dedicated stability gate.
- [x] 3.2 Ensure the stability manifest records the `campaign-long` checkpoints and the headless/browser boundary.

## 4. Test Coverage

- [x] 4.1 Add focused tests for a successful long-campaign stability run.
- [x] 4.2 Add focused tests proving injected drift fails and produces bug/log evidence.
- [x] 4.3 Keep existing journey QC validation and full smoke journey tests passing.

## 5. Verification And Archive

- [x] 5.1 Run focused Jest coverage for journey QC and long-campaign stability.
- [x] 5.2 Run `npm.cmd run qc:journeys:validate`, `npm.cmd run qc:campaign-long:stability`, `npm.cmd run typecheck`, and `npm.cmd run format:check`.
- [x] 5.3 Run `openspec.cmd validate add-long-campaign-stability-gate --strict`.
- [x] 5.4 Sync/archive the change after verification passes and prepare the PR.
