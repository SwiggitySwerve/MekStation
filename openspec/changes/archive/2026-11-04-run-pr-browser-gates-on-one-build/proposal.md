## Why

Pull-request E2E was the critical path of PR Checks: E2E Smoke ran 113 tests on one worker against `next dev`, which compiles each route on demand (13.4 minutes in run 41790472413). Seam Anchors also ran against `next dev`, and Customizer Regressions built Next a third time in its own job. Each of the three jobs paid its own setup, and two of them never used more than one of the runner's four vCPUs. That made PR checks slow and kept more runners busy than the 20-job concurrency limit allows.

## What Changes

- Replace the `e2e-smoke`, `seam-anchors`, and `customizer-regressions` pull-request jobs with two jobs:
  - `e2e-build` fetches and strictly validates the record-sheet assets in its own checkout, builds the E2E-mode production app once, and uploads the standalone server as the `e2e-build` artifact;
  - `e2e`, a fixed three-shard matrix, runs every per-PR browser spec against that standalone server. The seam trust anchors and the customizer regressions keep `--retries=0`, `--trace=retain-on-failure`, and one worker. The tactical-map smoke and library suites keep the config's CI retries and run on four workers.
- Require both jobs in the `lint-and-test` aggregator. Branch-protection context names are unchanged.
- Re-scope the job-scoped CI contract to the two owning jobs: it also pins the six gate spec paths, the shard selector, and the `[1, 2, 3]` matrix, so no spec or shard can be dropped silently.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `e2e-testing`: the PR-gated customizer browser regressions run in the `e2e` shard matrix against one `e2e-build` production build, and the job-scoped gate contract follows them there.
- `journey-qc`: the seam anchor gate runs in that same `e2e` job, one invocation per shard, and a change that relocates the already-wired gate keeps it blocking, with three first-attempt-green runs and the red-path proof recorded on its pull request. The aggregator hardening and the unconditional headless invariants are unchanged.

## Non-goals

Branch-protection changes, new Playwright projects, spec or product source changes, and changes to the nightly full-suite lane are out of scope.

## Impact

Touches `.github/workflows/pr-checks.yml`, `scripts/qc/openspec-ci-contracts.mjs`, `scripts/qc/openspec-workflow-contracts.mjs`, and `scripts/__tests__/openspec-ci-quality-qc.test.ts`.
