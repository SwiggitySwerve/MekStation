# Customizer CI and test changes

The new check closes the gap between shipped customizer browser assertions and the required PR workflow. Its local results do not establish remote activation; task 5.4 remains open until a real PR check and aggregator result are observed.

## Workflow behavior

`.github/workflows/pr-checks.yml` adds `customizer-regressions`, named Customizer Regressions, dependent on change detection and dependency installation. Working steps share the existing code/e2e predicate; the no-change path succeeds without running work. The existing Lint and Test aggregator now requires 19 jobs including this lane. Existing protected context names remain unchanged.

The lane restores/fetches assets in its own checkout and runs strict validation. It builds with both E2E public flags enabled, then starts the hydrated standalone production server on the explicit loopback address. The exact browser invocation names equipment catalog, record-sheet rendering, and edit recovery: 12 cases on Chromium, zero retries, retained failure traces. Failure uploads contain both playwright-report and test-results, including generated PDFs, with seven-day retention. The job has a 20-minute ceiling.

`.github/workflows/nightly-validation.yml` adds the same local asset prerequisite and production build/server environment to its existing full Chromium run and uses the repository Playwright wrapper. Its existing 180-minute ceiling remains. The full nightly selection was not executed locally; the selected 10-case customizer production run was.

## Validator and mutations

`scripts/qc/openspec-ci-contracts.mjs` holds the existing protected contexts, aggregator dependencies, package-script contracts, and new customizer executable-field contract. `scripts/qc/openspec-workflow-contracts.mjs` parses YAML using the already declared yaml dependency and validates the owning job's real fields. `validate-openspec-ci-quality.mjs` integrates those checks and reads aggregator membership from parsed YAML. No dependency was added.

The new contract requires actual run commands, environment values, setup action input, the exact step conditions, ordered asset setup/validation/build/browser execution, required aggregator membership, the bounded timeout, and failure artifacts. Job-level conditions are rejected so the required job cannot disappear. Failure handling must be absent or literal false; boolean true, string true, and expressions cannot silently ignore a failure. Conditions are checked for unnamed steps too. Browser cache hit/miss steps retain their distinct predicates.

The focused suite contains 28 tests in total. Its mutations cover removed or relocated commands; in-job comments, echo commands, and environment-only command mentions; missing spec selection, retries, or traces; missing local asset fetch/strict validation; disabled jobs and steps; disabled setup whose condition still contains the expected terms; ignored failure strings and expressions; unnamed unguarded work; missing production hooks, development-server substitution, and invalid standalone hostname; fake artifact upload; deleted jobs; and removed aggregator membership. Existing package, protected-context, and active-ledger checks remain covered. Older unrelated whole-workflow token contracts retain their previous behavior; the new strict execution checks apply to the customizer lane.

## Browser additions

The first reconciliation added three cases to the record-sheet pack. The authorized follow-up adds a sixth case for Infantry zoom, fit modes, A4 raster geometry, PDF output, and narrow-screen layout. The edit-recovery pack adds a third case for explicit Structure links, refresh, and omitted-tab restoration. Its existing armor edit uses the named Armor tonnage input, so it waits for the destination control during asynchronous tab navigation. `e2e/helpers/recordSheetPrintHarness.ts` observes a real same-origin popup, records its print document, injects one blocked popup or one canvas SecurityError, and verifies recovery through the application's Retry buttons. It checks current unit identity, exactly one SVG, root geometry, page CSS, selected paper, and owned-window cleanup after the print lifecycle.

The downloaded PDF is real jsPDF output. Byte inspection checks its header, single-page tree, and MediaBox for Letter and A4. The helper records print rather than invoking the OS dialog. Fault injection occurs at public browser APIs; product modules are not imported into the test and no forced clicks or fixed sleeps were added.

The initial ten-case production receipt remains historical evidence. The twelve-case follow-up result is recorded separately in `followup-verification.json`; no remote result is inferred from either local run.
