## MODIFIED Requirements

### Requirement: PR-Gated Customizer Browser Regressions

The pull-request workflow SHALL run the target customizer browser files — `e2e/customizer-equipment-catalog.spec.ts` (3 cases), `e2e/customizer-record-sheet-rendering.spec.ts` (6 cases), and `e2e/customizer-edit-recovery.spec.ts` (3 cases), twelve cases total — together with the three seam trust anchor specs, on the `chromium` project, invoked through `scripts/playwright/run-playwright.mjs`, in the bounded `e2e` job. That job is a fixed two-shard matrix (`shard: [1, 2]`) whose gate step runs each shard's slice with `--shard=${{ matrix.shard }}/2` on one worker, so the two shards together run every gate case exactly once. Those files are the desired gate pack, not a claim that they are remotely activated or landed as the final browser pack on `main`. Each shard SHALL obtain the mm-data record-sheet assets in its own checkout and SHALL prove them with the strict asset validator before it builds, because assets fetched by another job are absent from its checkout and the renderer would otherwise fall back to remote asset sources. Each shard SHALL then build the production app with `NEXT_PUBLIC_E2E_MODE=true` and `NEXT_PUBLIC_E2E_TEST=true`; the build copies the validated assets into the standalone server's public directory. The browser runner SHALL start `MEKSTATION_E2E_SERVER_COMMAND='node .next/standalone/server.js'` with `HOSTNAME='127.0.0.1'`. The gate run field SHALL be exactly `node scripts/playwright/run-playwright.mjs test e2e/active-session-recovery.spec.ts e2e/seam-roster-materialization-handoff.spec.ts e2e/seam-fresh-construction-no-instant-defeat.spec.ts e2e/customizer-equipment-catalog.spec.ts e2e/customizer-record-sheet-rendering.spec.ts e2e/customizer-edit-recovery.spec.ts --project=chromium --retries=0 --trace=retain-on-failure --workers=1 --shard=${{ matrix.shard }}/2 --output=test-results/gates`. The `e2e` job SHALL be bounded by `timeout-minutes: 25`, SHALL have no job-level `if`, and SHALL leave `continue-on-error` absent or literal `false`; its working steps SHALL use the exact `detect-changes` code/e2e conditions and its skip and upload conditions. It SHALL be a member of the `lint-and-test` aggregator's required `needs` set, so documentation-only pull requests no-op without breaking the aggregator's needs chain. The only required branch-protection context SHALL remain `Lint and Test`. The nightly full-suite Playwright lane, which runs the same specs, SHALL carry the same strict asset prerequisite and production build with the E2E environment, retaining its `timeout-minutes: 180` bound.

#### Scenario: A customizer regression fails the required check

- **GIVEN** a pull request that changes code or e2e files and breaks a customizer catalog or record-sheet assertion
- **WHEN** the pull-request checks run
- **THEN** the `e2e` shard that runs the broken case SHALL fail
- **AND** the `lint-and-test` aggregator SHALL fail because that job is in its required `needs` set
- **AND** the failure SHALL upload the Playwright report and `test-results` artifacts, including downloads written through `testInfo.outputPath`

#### Scenario: Missing record-sheet assets fail the lane instead of degrading to a remote source

- **GIVEN** an `e2e` shard whose checkout is missing a configured record-sheet template or pip file
- **WHEN** the job runs its asset prerequisite
- **THEN** the strict asset validator SHALL fail the shard before the build, so it starts no browser
- **AND** the record-sheet specs SHALL NOT render through the CDN or GitHub raw fallback chain in this lane

#### Scenario: The gate never retries a flaky regression to green

- **GIVEN** the shared Playwright configuration's CI defaults of two retries and retry-only tracing
- **WHEN** the `e2e` job invokes Playwright for the gate specs
- **THEN** the invocation SHALL pass `--retries=0`
- **AND** the invocation SHALL select a trace mode that records without a retry, so a zero-retry failure still ships a trace

#### Scenario: Documentation-only pull requests no-op the lane

- **GIVEN** a pull request touching neither code nor e2e paths
- **WHEN** the `e2e` job runs
- **THEN** every working step SHALL be skipped by the `detect-changes` filters
- **AND** the job SHALL still report success so the aggregator's needs chain stays green

### Requirement: Job-Scoped Pull-Request Gate Contracts

The OpenSpec CI quality validator SHALL parse the workflow YAML and verify gate-defining executable fields against the single workflow job that owns them, not against the workflow file as a whole, so that a matching command, flag, environment, prerequisite, or comment present elsewhere does not satisfy the contract. For the customizer browser gate the validator SHALL pin, inside the owning `e2e` job, the job name and required `needs`, the 25-minute timeout, the absence of a job-level `if`, absent-or-literal-false `continue-on-error`, the exact skip, working-step, browser-cache, smoke-suite, and upload conditions, the failure upload's report and `test-results` paths, the exact step order, setup `with.fetch-assets: 'true'`, the production-build and standalone-server `env` maps, the exact `run` fields including all six gate spec paths, the project, zero-retry flag, trace mode, and shard selector, the `[1, 2]` shard matrix with no include or exclude, and membership in the aggregator's `needs` set. Executable tests SHALL mutate each of those properties individually and SHALL prove the validator fails.

#### Scenario: A relocated gate command does not satisfy the contract

- **GIVEN** a workflow where the gate command is removed from the `e2e` job but still appears elsewhere in the file
- **WHEN** the CI quality validator runs
- **THEN** it SHALL fail naming the contract and the owning job
- **AND** the reported missing token SHALL be the gate command

#### Scenario: Weakening a gate property fails the validator

- **GIVEN** a workflow whose gate jobs drop the zero-retry flag, restore the retry-only trace mode, drop one of the six gate spec files, pin the shard selector, drop a shard from the matrix, change a required environment, remove the shard's job-local asset fetch, or replace its strict asset validation step
- **WHEN** the CI quality validator runs
- **THEN** it SHALL fail for each mutation, naming the owning job and the missing token or invalid field
- **AND** the presence of the same token in another job SHALL NOT suppress the failure

#### Scenario: Unwiring the gate from the required aggregator fails the validator

- **GIVEN** a workflow that defines the `e2e` job but removes it from the `lint-and-test` aggregator's `needs` set
- **WHEN** the CI quality validator runs
- **THEN** it SHALL report the missing aggregator dependency naming the job

#### Scenario: A non-executing or unbounded gate fails the validator

- **GIVEN** a workflow whose `e2e` job adds a job-level `if`, sets a non-false `continue-on-error`, changes its timeout, or changes a required step condition or order
- **WHEN** the CI quality validator runs
- **THEN** it SHALL report the owning job's invalid executable field
- **AND** a matching command elsewhere in the workflow SHALL NOT suppress the failure
