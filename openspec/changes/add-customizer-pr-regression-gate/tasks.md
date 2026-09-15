## 1. Specify the gate

- [x] 1.1 Author the proposal, design, and `e2e-testing` delta for the PR customizer browser gate, its job-scoped CI contracts, and the print/export failure-recovery coverage.
- [x] 1.2 Record the historical baseline (two packs, five tests, no PR coverage) and the initial reconciled surface: three files and ten cases (`customizer-equipment-catalog.spec.ts` 3, `customizer-record-sheet-rendering.spec.ts` 5, `customizer-edit-recovery.spec.ts` 2).

## 2. Pull-request lane

- [x] 2.1 Add the independent `customizer-regressions` job to `.github/workflows/pr-checks.yml` — `needs: [detect-changes, install-deps]`, per-step code/e2e gating, the shared setup and Playwright browser-cache pattern, and a 20-minute ceiling.
- [x] 2.2 Give the job its own asset prerequisite: `fetch-assets: 'true'` on its checkout plus `npm run validate:assets:strict` before the browser starts.
- [x] 2.3 Build with `NEXT_PUBLIC_E2E_MODE=true` and `NEXT_PUBLIC_E2E_TEST=true`, then run all three files via `node scripts/playwright/run-playwright.mjs test e2e/customizer-equipment-catalog.spec.ts e2e/customizer-record-sheet-rendering.spec.ts e2e/customizer-edit-recovery.spec.ts --project=chromium --retries=0 --trace=retain-on-failure` with `MEKSTATION_E2E_SERVER_COMMAND='node .next/standalone/server.js'` and `HOSTNAME='127.0.0.1'`; upload the report plus `test-results` on failure.
- [x] 2.4 Add `customizer-regressions` to the `lint-and-test` aggregator's `needs`; leave branch-protection context names untouched.
- [x] 2.5 Apply the same strict asset prerequisite and production build with E2E environment to the nightly `e2e-full` lane, retaining its unchanged 180-minute timeout.

## 3. CI contract validation

- [x] 3.1 Extract the validator's declarative contracts into `scripts/qc/openspec-workflow-contracts.mjs`, parse YAML jobs and executable `run`/`env`/`with` fields, and add job-scoped `requiredWorkflowJobContracts` with `workflow-job-token-missing` / `workflow-job-missing` reporting.
- [x] 3.2 Pin the three-file gate command, zero-retry flag, trace mode, job-local asset fetch, strict asset step, production-build and standalone-server environments, exact step conditions/order, 20-minute bound, no job-level `if`, absent-or-literal-false `continue-on-error`, and aggregator membership.
- [x] 3.3 Add mutation tests proving a relocated command, dropped flag or pack, changed environment, removed asset prerequisite, disabled/unbounded/non-blocking step or job, deleted job, and unwired aggregator each fail — and that a matching substring elsewhere in the workflow does not satisfy the contract.

## 4. Customizer browser regressions

- [x] 4.1 Add a real-Print-UI regression asserting the reserved print document's page rule, root SVG geometry, single-sheet content, unit identity, window close after print, and unchanged preview selection, using a popup `print` recorder so no OS dialog is reached.
- [x] 4.2 Add a blocked-popup regression asserting the toolbar alert and successful `Retry print` recovery.
- [x] 4.3 Add a canvas-export failure regression asserting the toolbar alert and successful `Retry PDF export` recovery ending in a real download.
- [x] 4.4 Add format-aware PDF inspection (header, one `/Type /Page`, `/Count 1`, `/MediaBox` matching Letter and A4) with no new dependency, and preserve the complete initial ten-case customizer selection.

## 5. Verification

- [x] 5.1 Run the focused validator Jest suite and `format:check` on owned files.
- [x] 5.2 List the customizer Playwright tests to confirm the gate's selection resolves to the intended set.
- [x] 5.3 Parent: execute all three customizer files in a real Chromium browser against the hydrated production standalone server; 10/10 passed in about 69 seconds on local port 3636. Evidence: `.sisyphus/spec-reconciliation-20260912/browser-production-ip.log`.
- [ ] 5.4 Parent: observe the new `Customizer Regressions` check run on a pull request and confirm the aggregator blocks on it.

## 6. Authorized follow-ups

- [x] 6.1 Extend the same three-file selection to twelve cases: add real-browser Infantry zoom/paper/export coverage and explicit Structure versus persisted Preview navigation coverage. Both new cases failed against the pre-fix production build; evidence: `.sisyphus/spec-reconciliation-20260912/browser-production-followups-red.log`.
- [x] 6.2 Run all twelve cases against the rebuilt production standalone server with zero retries and record the result. Passed 12/12 in about 69 seconds on port 3636; evidence: `.sisyphus/spec-reconciliation-20260912/browser-production-followups-final.log`.
