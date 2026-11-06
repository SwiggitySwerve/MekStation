## MODIFIED Requirements

### Requirement: PR-Gated Customizer Browser Regressions

The pull-request workflow SHALL run the target customizer browser files â€” `e2e/customizer-equipment-catalog.spec.ts` (3 cases), `e2e/customizer-record-sheet-rendering.spec.ts` (6 cases), and `e2e/customizer-edit-recovery.spec.ts` (3 cases), twelve cases total â€” together with the three seam trust anchor specs, on the `chromium` project, invoked through `scripts/playwright/run-playwright.mjs`, in the bounded `e2e` job. That job is a fixed two-shard matrix (`shard: [1, 2]`) whose gate step runs each shard's slice with `--shard=${{ matrix.shard }}/2` on one worker, so the two shards together run every gate case exactly once. Those files are the desired gate pack, not a claim that they are remotely activated or landed as the final browser pack on `main`. Each shard SHALL obtain the mm-data record-sheet assets in its own checkout and SHALL prove them with the strict asset validator before it runs browsers, because source-side checks also read those assets. The existing `simulation-checks` job SHALL validate assets and build the production app once with `NEXT_PUBLIC_E2E_MODE=true` and `NEXT_PUBLIC_E2E_TEST=true` immediately after necessary checkout/setup, before any simulation work. It SHALL archive and upload the complete harness-enabled standalone tree, including hidden files, runtime links and validated public assets. Both unchanged E2E shards SHALL depend on the entire producer job and download, checksum-verify and extract that same artifact. Upload completion SHALL NOT be represented as releasing the dependency early. The producer SHALL remain unconditional with a successful docs-only no-op; its existing simulation and release-package steps SHALL retain their code-only guards and status semantics. Its literal timeout SHALL equal the canonical validated simulation job budget. No extra job SHALL be introduced. The browser runner SHALL start `MEKSTATION_E2E_SERVER_COMMAND='node .next/standalone/server.js'` with `HOSTNAME='127.0.0.1'`. The gate run field SHALL be exactly `node scripts/playwright/run-playwright.mjs test e2e/active-session-recovery.spec.ts e2e/seam-roster-materialization-handoff.spec.ts e2e/seam-fresh-construction-no-instant-defeat.spec.ts e2e/customizer-equipment-catalog.spec.ts e2e/customizer-record-sheet-rendering.spec.ts e2e/customizer-edit-recovery.spec.ts --project=chromium --retries=0 --trace=retain-on-failure --workers=1 --shard=${{ matrix.shard }}/2 --output=test-results/gates`. The `e2e` job SHALL be bounded by a literal `timeout-minutes` equal to the validated `timeouts.e2e.minutes` in `config/ci/budgets.json`, derived from twice the recorded median with the owning budget validator, SHALL have no job-level `if`, and SHALL leave `continue-on-error` absent or literal `false`; its working steps SHALL use the exact `detect-changes` code/e2e conditions and its skip and upload conditions. It SHALL be a member of the `lint-and-test` aggregator's required `needs` set, so documentation-only pull requests no-op without breaking the aggregator's needs chain. The only required branch-protection context SHALL remain `Lint and Test`. The nightly full-suite Playwright lane, which runs the same specs, SHALL carry the same strict asset prerequisite and production build with the E2E environment, retaining its `timeout-minutes: 180` bound.

#### Scenario: A customizer regression fails the required check

- **GIVEN** a pull request that changes code or e2e files and breaks a customizer catalog or record-sheet assertion
- **WHEN** the pull-request checks run
- **THEN** the `e2e` shard that runs the broken case SHALL fail
- **AND** the `lint-and-test` aggregator SHALL fail because that job is in its required `needs` set
- **AND** the failure SHALL upload the Playwright report and `test-results` artifacts, including downloads written through `testInfo.outputPath`

#### Scenario: Missing record-sheet assets fail the lane instead of degrading to a remote source

- **GIVEN** an `e2e` shard whose checkout is missing a configured record-sheet template or pip file
- **WHEN** the job runs its asset prerequisite
- **THEN** the strict asset validator SHALL fail the shard before browser execution, so it starts no browser
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

The OpenSpec CI quality validator SHALL parse the workflow YAML and verify gate-defining executable fields against the single workflow job that owns them, not against the workflow file as a whole, so that a matching command, flag, environment, prerequisite, or comment present elsewhere does not satisfy the contract. For the customizer browser gate the validator SHALL pin, inside the owning producer and consumer jobs, the job name and required `needs`, the exact measured timeout from the canonical validated CI budget, the absence of a job-level `if`, absent-or-literal-false `continue-on-error`, the exact skip, working-step, browser-cache, smoke-suite, and upload conditions, the failure upload's report and `test-results` paths, the exact step order, setup `with.fetch-assets: 'true'`, the producer production-build and consumer standalone-server `env` maps, the exact `run` fields including all six gate spec paths, the project, zero-retry flag, trace mode, and shard selector, the `[1, 2]` shard matrix with no include or exclude, and membership in the aggregator's `needs` set. Executable tests SHALL mutate each of those properties individually and SHALL prove the validator fails.

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

#### Scenario: The measured budget is the only timeout authority

- **GIVEN** the canonical CI budget contains measured E2E samples and its validated static timeout
- **WHEN** the workflow uses that exact literal timeout
- **THEN** the job-scoped validator SHALL accept the timeout
- **AND** both a shorter and a longer workflow override SHALL fail without changing any browser pack or shard


## ADDED Requirements

### Requirement: Shared Harness Artifact and Release Isolation

The shared E2E build SHALL belong only to the browser harness. The existing simulation job SHALL finish each build/upload before running performance checks, without a concurrent build process. Its later plain production rebuild SHALL be the sole input to web/Electron release artifacts and package-budget proofs. Every original simulation command, seed, assertion and coverage check SHALL remain present. Native browser selection SHALL retain the complete live 136-test census, the two-shard matrix, atomic files, sequential suites, gate retries zero and failure traces. Main and nightly SHALL remain full.

#### Scenario: An altered artifact fails closed

- **GIVEN** the producer uploaded a complete archive and SHA-256 receipt
- **WHEN** a consumer receives missing, corrupt or mismatched archive bytes
- **THEN** verification SHALL fail before the server starts
- **AND** the required aggregator SHALL fail

#### Scenario: A producer failure cannot skip to green

- **GIVEN** a code or E2E change whose producer fails or is cancelled
- **WHEN** dependent E2E jobs are skipped
- **THEN** the unconditional required aggregator SHALL reject the producer result and unproved skips

#### Scenario: Browser-only changes have a shared artifact

- **GIVEN** an E2E-only pull request with the code gate false
- **WHEN** the existing simulation job runs
- **THEN** it SHALL build/upload the shared harness artifact and skip code-only simulation/package steps
- **AND** both E2E shards SHALL consume the artifact after that job completes

#### Scenario: Harness bytes cannot become a release artifact

- **GIVEN** the harness build completed before simulation checks
- **WHEN** release/package steps run for a code change
- **THEN** a separate production build without E2E build environment SHALL precede every package measurement and upload
- **AND** the E2E artifact SHALL remain separate from web-build and release artifacts

#### Scenario: Hosted performance determines whether to ship

- **GIVEN** at least five complete comparable captures per arm from a matched base
- **WHEN** evaluating the shared-build lever
- **THEN** measurements SHALL include build, upload, download, full producer dependency wait, queue, all E2E and unit-shard times, failures, exact heads and runtime/cache identity
- **AND** acceptance SHALL require critical-path nonregression, or at most fifteen seconds regression with job-minute savings
- **AND** a negative result SHALL close the draft with numbers as no gain under the ten-job cap
