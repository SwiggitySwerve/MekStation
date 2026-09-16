## ADDED Requirements

### Requirement: PR-Gated Customizer Browser Regressions

The pull-request workflow SHALL run the shipped customizer browser files — `e2e/customizer-equipment-catalog.spec.ts` (3 cases), `e2e/customizer-record-sheet-rendering.spec.ts` (6 cases), and `e2e/customizer-edit-recovery.spec.ts` (3 cases), twelve cases total — in one bounded, independent job on the `chromium` project, invoked through `scripts/playwright/run-playwright.mjs`. The job SHALL obtain the mm-data record-sheet assets in its own checkout and SHALL prove them with the strict asset validator before the browser starts, because assets fetched by another job are absent here and the renderer would otherwise fall back to remote asset sources. Before the browser run it SHALL build the production app with `NEXT_PUBLIC_E2E_MODE=true` and `NEXT_PUBLIC_E2E_TEST=true`; the browser runner SHALL start `MEKSTATION_E2E_SERVER_COMMAND='node .next/standalone/server.js'` with `HOSTNAME='127.0.0.1'`. The run field SHALL be exactly `node scripts/playwright/run-playwright.mjs test e2e/customizer-equipment-catalog.spec.ts e2e/customizer-record-sheet-rendering.spec.ts e2e/customizer-edit-recovery.spec.ts --project=chromium --retries=0 --trace=retain-on-failure`. The job SHALL be bounded by `timeout-minutes: 20`, SHALL have no job-level `if`, and SHALL leave `continue-on-error` absent or literal `false`; its working steps SHALL use the exact `detect-changes` code/e2e conditions and its skip and upload conditions. The job SHALL be a member of the `lint-and-test` aggregator's required `needs` set, so documentation-only pull requests no-op without breaking the aggregator's needs chain. Required branch-protection context names SHALL NOT change. The nightly full-suite Playwright lane, which runs the same specs, SHALL carry the same strict asset prerequisite and production build with the E2E environment, retaining its `timeout-minutes: 180` bound.

#### Scenario: A customizer regression fails the required check

- **GIVEN** a pull request that changes code or e2e files and breaks a customizer catalog or record-sheet assertion
- **WHEN** the pull-request checks run
- **THEN** the customizer regression job SHALL fail
- **AND** the `lint-and-test` aggregator SHALL fail because that job is in its required `needs` set
- **AND** the failure SHALL upload the Playwright report and `test-results` artifacts, including downloads written through `testInfo.outputPath`

#### Scenario: Missing record-sheet assets fail the lane instead of degrading to a remote source

- **GIVEN** the customizer regression job whose checkout is missing a configured record-sheet template or pip file
- **WHEN** the job runs its asset prerequisite
- **THEN** the strict asset validator SHALL fail the job before any browser starts
- **AND** the record-sheet specs SHALL NOT render through the CDN or GitHub raw fallback chain in this lane

#### Scenario: The gate never retries a flaky regression to green

- **GIVEN** the shared Playwright configuration's CI defaults of two retries and retry-only tracing
- **WHEN** the customizer regression job invokes Playwright
- **THEN** the invocation SHALL pass `--retries=0`
- **AND** the invocation SHALL select a trace mode that records without a retry, so a zero-retry failure still ships a trace

#### Scenario: Documentation-only pull requests no-op the lane

- **GIVEN** a pull request touching neither code nor e2e paths
- **WHEN** the customizer regression job runs
- **THEN** every working step SHALL be skipped by the `detect-changes` filters
- **AND** the job SHALL still report success so the aggregator's needs chain stays green

### Requirement: Job-Scoped Pull-Request Gate Contracts

The OpenSpec CI quality validator SHALL parse the workflow YAML and verify gate-defining executable fields against the single workflow job that owns them, not against the workflow file as a whole, so that a matching command, flag, environment, prerequisite, or comment present elsewhere does not satisfy the contract. For the customizer browser gate the validator SHALL pin, inside that job, the job name and required `needs`, the 20-minute timeout, the absence of a job-level `if`, absent-or-literal-false `continue-on-error`, the exact skip, working-step, browser-cache, and upload conditions, the exact step order, setup `with.fetch-assets: 'true'`, the production-build and standalone-server `env` maps, the exact `run` fields including all three spec paths, the project, zero-retry flag and trace mode, and membership in the aggregator's `needs` set. Executable tests SHALL mutate each of those properties individually and SHALL prove the validator fails.

#### Scenario: A relocated gate command does not satisfy the contract

- **GIVEN** a workflow where the customizer gate command is removed from its job but still appears elsewhere in the file
- **WHEN** the CI quality validator runs
- **THEN** it SHALL fail naming the contract and the owning job
- **AND** the reported missing token SHALL be the gate command

#### Scenario: Weakening a gate property fails the validator

- **GIVEN** a workflow whose customizer job drops the zero-retry flag, restores the retry-only trace mode, drops one of the three spec files, changes a required environment, removes its job-local asset fetch, or replaces the strict asset validation step
- **WHEN** the CI quality validator runs
- **THEN** it SHALL fail for each mutation, naming the owning job and the missing token
- **AND** the presence of the same token in another job SHALL NOT suppress the failure

#### Scenario: Unwiring the gate from the required aggregator fails the validator

- **GIVEN** a workflow that defines the customizer job but removes it from the `lint-and-test` aggregator's `needs` set
- **WHEN** the CI quality validator runs
- **THEN** it SHALL report the missing aggregator dependency naming the job

#### Scenario: A non-executing or unbounded gate fails the validator

- **GIVEN** a workflow whose customizer job adds a job-level `if`, sets a non-false `continue-on-error`, changes the 20-minute timeout, or changes a required step condition or order
- **WHEN** the CI quality validator runs
- **THEN** it SHALL report the owning job's invalid executable field
- **AND** a matching command elsewhere in the workflow SHALL NOT suppress the failure

### Requirement: Customizer Print and Export Failure-Recovery Coverage

The customizer record-sheet browser pack SHALL cover the user-visible Print and PDF export surfaces beyond geometry and byte presence, while preserving its existing zoom, paper-geometry, currentness, and download coverage. It SHALL drive the product's real Print control and assert the contents of the reserved print document. It SHALL provoke failures at public browser boundaries — a blocked popup and a failed canvas export — and SHALL assert recovery through the toolbar's own Retry controls. It SHALL verify a produced PDF is a single page at the selected paper size using format-aware inspection of the produced file rather than an added PDF dependency. The pack SHALL NOT import product modules, SHALL NOT interact with an operating-system print dialog, and SHALL NOT wait on fixed sleeps.

#### Scenario: Print writes the current sheet into the reserved window

- **GIVEN** a canonical unit loaded in the customizer preview at a selected paper size
- **WHEN** the user activates Print
- **THEN** the reserved print document SHALL contain exactly one record-sheet SVG for that unit
- **AND** the document's page rule and root SVG dimensions SHALL match the selected paper
- **AND** the print window SHALL close after the print lifecycle completes
- **AND** the active preview selection SHALL be unchanged

#### Scenario: A blocked print popup is recoverable

- **GIVEN** the browser refuses the print window for one activation
- **WHEN** the user activates Print
- **THEN** the toolbar SHALL expose an alert naming the popup failure and a Retry control for the print action
- **AND** activating Retry once the browser permits the window SHALL produce the print document and clear the alert

#### Scenario: A failed canvas export is recoverable

- **GIVEN** the browser's canvas export API fails once
- **WHEN** the user activates Download PDF
- **THEN** the toolbar SHALL expose an alert carrying the failure and a Retry control for the export action
- **AND** activating Retry SHALL complete a download

#### Scenario: A downloaded record sheet is one page at the selected paper

- **GIVEN** a completed record-sheet PDF download for Letter and for A4
- **WHEN** the saved file is inspected
- **THEN** it SHALL begin with the PDF header
- **AND** it SHALL declare exactly one page
- **AND** its page box SHALL match the selected paper size

#### Scenario: Infantry preview uses the shared viewer controls

- **GIVEN** a newly created Infantry unit in Preview
- **WHEN** the user changes zoom, switches Letter to A4, selects Fit Width and Fit Page, and resizes the viewport
- **THEN** manual zoom SHALL remain selected across resize and paper changes
- **AND** fit modes SHALL respond to their container dimensions
- **AND** the preview raster and downloaded single-page PDF SHALL match the selected paper
- **AND** the mobile document SHALL remain within the viewport width

#### Scenario: Explicit Structure wins over a remembered Preview tab

- **GIVEN** a persisted customizer unit whose last selected tab is Preview
- **WHEN** its explicit Structure URL is opened and refreshed
- **THEN** Structure SHALL remain selected with the same unit identity and saved edits
- **AND** a later visit with the tab segment omitted SHALL restore the valid remembered tab
