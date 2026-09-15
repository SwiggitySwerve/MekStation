## Why

The initial baseline for this change was two customizer browser packs — `e2e/customizer-equipment-catalog.spec.ts` (3 tests) and `e2e/customizer-record-sheet-rendering.spec.ts` (2 tests) — with no pull-request coverage. The reconciled shipped surface is now three explicit files and twelve cases: equipment catalog (3), record-sheet rendering (6), and edit recovery (3). The PR lane's only browser work at that baseline was the tactical-map smoke spec (`e2e-smoke`) and the three W2 seam anchors (`seam-anchors`), so catalog, record-sheet, and edit-recovery assertions could rot between nightly runs while "Lint and Test" stayed green.

The record-sheet pack additionally needs the mm-data record-sheet assets on disk. `setup-node-and-install` defaults `fetch-assets` to `false`, and the assets fetched by `install-deps` do not exist in another job's checkout, so a naive lane would render through the CDN/GitHub fallback chain and prove network availability instead of rendering.

The existing record-sheet pack also stops at zoom/paper geometry and PDF bytes: it never opens the real Print UI, never exercises a failure at a browser boundary, and never inspects a produced PDF's page structure.

## What Changes

- Add a bounded, independent `customizer-regressions` pull-request job that runs the three named customizer files (12 cases) under `chromium` through `scripts/playwright/run-playwright.mjs`, with `--retries=0` so a flaky regression is never retried to green and `--trace=retain-on-failure` so a failure at zero retries still ships a trace.
- Require the record-sheet asset prerequisite inside that job: `fetch-assets: 'true'` in its own checkout plus `npm run validate:assets:strict`, so a missing template or pip set fails loudly instead of degrading to a remote fallback.
- Build the production app before the browser run with `NEXT_PUBLIC_E2E_MODE=true` and `NEXT_PUBLIC_E2E_TEST=true`, then start the standalone server with `MEKSTATION_E2E_SERVER_COMMAND='node .next/standalone/server.js'` and `HOSTNAME='127.0.0.1'`.
- Wire the job into the `lint-and-test` aggregator so it blocks the existing "Lint and Test" required check. Branch-protection context names are unchanged.
- Apply the same strict asset prerequisite and production build with the E2E environment to the nightly full-suite Playwright lane, retaining its 180-minute timeout.
- Extend `e2e/customizer-record-sheet-rendering.spec.ts` with browser regressions beyond PDFs and zoom: real Print UI popup contents, blocked-popup error and Retry recovery, canvas-export failure and Retry recovery, and format-aware inspection of the produced PDF's page count and page size.
- Teach `scripts/qc/validate-openspec-ci-quality.mjs` parsed-YAML, job-scoped workflow contracts. The contract pins the executable `run`, `env`, and `with` fields, exact step conditions and order, the 20-minute job bound, required `needs`, absence of a job-level `if`, and absent-or-literal-false `continue-on-error`; a matching substring in another job or a comment does not satisfy the contract.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `e2e-testing`: add a PR-gated customizer browser regression requirement covering lane composition, the asset prerequisite, retry/trace policy, aggregator membership, the job-scoped CI contract validation, and the customizer print/export failure-recovery coverage the lane must carry.

## Non-goals

Canonical spec edits, archiving, branch-protection context changes, new Playwright projects, product source changes, asset acquisition, commits/PRs, and remote CI activation are excluded. Broadening the lane beyond the three named customizer files is out of scope; the nightly full sweep remains the authoritative suite.

## Impact

Touches `.github/workflows/pr-checks.yml` (new job plus aggregator `needs`), `.github/workflows/nightly-validation.yml` (asset/build prerequisite on the existing full-suite lane), `scripts/qc/validate-openspec-ci-quality.mjs` with its new `scripts/qc/openspec-workflow-contracts.mjs` contract module and `scripts/__tests__/openspec-ci-quality-qc.test.ts`, and the three customizer e2e files. PR wall-clock grows by one parallel ~20-minute-ceiling browser job. No product source is modified.
