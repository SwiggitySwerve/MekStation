## Context

`pr-checks.yml` fans out ~18 jobs behind the `lint-and-test` aggregator, which preserves the "Lint and Test" branch-protection context and fails unless every needed job's result is `success`. Two of those jobs run browsers: `e2e-smoke` (one tactical-map spec) and `seam-anchors` (three seam journeys, already `--retries=0`). Both gate their steps on the `detect-changes` `code`/`e2e` path filters and cache the chromium browser by resolved Playwright version.

The initial customizer baseline was not in that set: `e2e/customizer-equipment-catalog.spec.ts` carried 3 tests and `e2e/customizer-record-sheet-rendering.spec.ts` carried 2. The reconciled shipped proof is three explicit files with twelve `@customizer` cases: equipment catalog (3), record-sheet rendering (6), and edit recovery (3). The last two cases add Infantry preview parity and explicit Structure route precedence; each failed against the pre-fix production build.

Record-sheet rendering reads real assets: `TEMPLATE_PATHS` resolves `/record-sheets/templates_us|templates_iso/mek_*_default.svg`, and armor/structure pips resolve under `/record-sheets/biped_pips`. `TemplateRecordSheetRenderer.loadTemplate` goes through `MmDataAssetService.loadSVG`, whose fallback chain is local → jsDelivr CDN → GitHub raw. Absent local assets the pack still renders, remotely, so it would silently stop proving local rendering.

`scripts/qc/validate-openspec-ci-quality.mjs` pins CI structure by substring across the whole workflow file plus an `lint-and-test` `needs` parse. Whole-file substrings cannot express "this job runs this command".

## Goals / Non-Goals

**Goals**

- One bounded, independent PR job running exactly the three named customizer files (12 cases) on `chromium`.
- Assets present in that job's own checkout, proven strictly before the browser starts.
- A production build with E2E hooks before the browser run, followed by the standalone server on the loopback hostname.
- Zero retries, with a trace mode that still produces evidence at zero retries.
- Aggregator membership so the gate blocks the existing required check.
- Job-scoped CI contract validation with mutation tests.
- Customizer browser regressions that reach the real Print UI and real failure recovery, plus format-aware PDF page inspection.

**Non-goals**

Branch-protection context changes, new Playwright projects or tags, product source changes, asset acquisition, broadening the lane, and remote CI execution.

## Decisions

1. **Independent job, not an extra step on `e2e-smoke`.** `e2e-smoke` is a ~15-minute tactical-map lane with no asset prerequisite. Appending customizer specs there would couple two failure domains into one check run and force assets onto a lane that does not need them. `customizer-regressions` is its own job with `needs: [detect-changes, install-deps]`, no job-level `if`, a 20-minute ceiling, and the same exact per-step `code`/`e2e` gating the other browser lanes use, so docs-only PRs no-op while the aggregator's `needs` chain stays green.

2. **Assets are a job-local prerequisite, not an inherited one.** `setup-node-and-install` defaults `fetch-assets: 'false'`, and `install-deps` fetching assets does not populate this job's checkout. The job passes `fetch-assets: 'true'` (restoring the `mm-data-assets-*` cache, fetching only on a miss) and then runs `npm run validate:assets:strict`, which fails when any configured template/pip is missing. Without that step a missing asset degrades to the CDN/GitHub chain and the lane silently proves the wrong thing. The nightly `e2e-full` lane runs the same prerequisite and production build, retaining its 180-minute timeout. Strict validation proves the configured asset set is present; it does not establish cache freshness or provenance.

3. **`--retries=0` and an explicit trace mode.** `playwright.config.ts` sets `retries: 2` on CI and `trace: 'on-first-retry'`. A gate must not retry a flaky regression to green (the `seam-anchors` precedent), but zero retries makes the configured trace mode dead: no first retry, no trace. The exact gate run is `node scripts/playwright/run-playwright.mjs test e2e/customizer-equipment-catalog.spec.ts e2e/customizer-record-sheet-rendering.spec.ts e2e/customizer-edit-recovery.spec.ts --project=chromium --retries=0 --trace=retain-on-failure`. The invocation therefore carries `--trace=retain-on-failure`, a supported CLI mode, so a failing run keeps its trace. Report and `test-results` (which holds the downloaded PDFs written through `testInfo.outputPath`) upload on failure.

4. **Invoke through the repo runner wrapper.** `node scripts/playwright/run-playwright.mjs test …` keeps run IDs, durable per-run stores, and server setup consistent with every other repo caller, per `e2e/AGENTS.md`. The three spec paths are named explicitly rather than grepping `@customizer`, so adding a `@customizer` spec elsewhere cannot silently enlarge or re-scope the gate. The production build sets `NEXT_PUBLIC_E2E_MODE=true` and `NEXT_PUBLIC_E2E_TEST=true`; the browser step uses `MEKSTATION_E2E_SERVER_COMMAND='node .next/standalone/server.js'` and `HOSTNAME='127.0.0.1'`.

5. **Job-scoped CI contracts.** The validator parses the workflow YAML and validates executable fields in the single `customizer-regressions` job. The contract pins the job name and `needs`, the 20-minute timeout, no job-level `if`, absent-or-literal-false `continue-on-error`, the exact no-change skip condition, exact code/e2e conditions on working steps, the failure/upload condition, setup `with.fetch-assets: 'true'`, exact `run` commands with their `env` maps, and required step order. It also requires `customizer-regressions` in `lint-and-test`'s `needs`. Mutation tests relocate the command, weaken flags or environments, strip prerequisites, disable or unbound work, add `continue-on-error`, delete the job, and unwire the aggregator; comments and non-executing fields cannot satisfy the contract. The contract data moves to `scripts/qc/openspec-workflow-contracts.mjs` so the validator stays a single-responsibility module.

6. **New browser regressions exercise failures at public boundaries, with no product imports and no sleeps.** The print regressions drive the real toolbar Print button. An init script wraps `window.open` so the opened popup is a real same-origin window whose `print()` is replaced by a recorder — no OS print dialog is ever reached — and can be made to return `null` once, which is exactly what a popup blocker does. The export failure is injected one-shot at `HTMLCanvasElement.prototype.toDataURL`, the browser API `exportPDF` uses to hand the raster to jsPDF, and surfaces as a `SecurityError` the way a tainted-canvas export does. Recovery is asserted through the toolbar's own `Retry print` / `Retry PDF export` controls. All waits are `expect.poll` / `expect` on observable state.

7. **PDF inspection is format-aware and dependency-free.** No PDF parser is installed (`jspdf` is a writer). jsPDF output leaves the document structure uncompressed, so the produced file is inspected as latin1 bytes: `%PDF` header, exactly one `/Type /Page` object, `/Count 1`, and a `/MediaBox` matching the selected paper within 1pt (Letter 612×792, A4 595.28×841.89). That proves one page at the requested page size without adding a dependency or parsing page content.

## Risks / Trade-offs

- One more browser job per PR. Bounded to three spec files, twelve cases, one project, one worker, a 20-minute ceiling, and the shared browser/node caches; it runs in parallel with the existing lanes.
- Asset fetch on a cold cache adds time to this job. Strict validation proves the configured 554 assets are present in the checkout; it does not prove that a restored cache is the newest version or establish provenance.
- The canvas-export fault is simulated rather than provoked by a real tainted canvas. It is injected at the public browser API the product actually calls, so the product code under test is unmodified and the assertion is on user-visible recovery, not on internals.
- Pinning the exact command string means an intentional invocation change must update the contract. That is the intent: the command is the gate.

## Migration Plan

Additive. The job is new, the aggregator gains one member, the validator gains contracts, and the e2e pack gains tests. No required-check context names change, so branch protection needs no edit. Reverting is removing the job, the aggregator entry, and the contract.

## Open Questions

None. Remote CI activation of the new check run is observed on the first pull request that carries this change.
