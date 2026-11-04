## Why

A PR Checks run started 33 jobs, and the public repository gets 20 concurrent GitHub-hosted jobs, so one run saturated every runner and other pull requests queued: in run 41816902255 the E2E shards waited 6 minutes and Schema Bridge 8 minutes for a runner. Most of those jobs did under a minute of work after ~30 seconds of checkout and dependency restore. Gated jobs still started a runner just to skip every step.

## What Changes

- Fold lint, format, the roadmap ledger, the determinism audit, typecheck, the desktop typecheck and tests, a11y, BV parity, Storybook and the advisory tsrs side-check into one `static-checks` job; every check step still runs after another one fails.
- Fold the perf smoke, perf budget, coverage floor and 100-game statistical proof lanes into one `simulation-checks` job, which runs them one after another on an otherwise idle runner. The statistical proof keeps its own closure gate.
- Drop `install-deps`: every job restores the same node_modules cache and runs `npm ci` itself on a miss.
- Gate `simulation-checks`, `corpus-tests`, `validate-combat`, `schema-bridge` and `prepare-build` with job-level conditions, so a gated-off job never takes a runner.
- `Lint and Test` accepts a skip only for those jobs, and only when every gate it names for the job was off.
- Wire Lane B's `JEST_SPLIT_CORPUS` projects: three unit shards without the whole-catalog suites, a one-job `corpus-tests` lane gated on the corpus suites' import closure and catalog data, and the `roadmap` project as a gated Static Checks step. The split selects exactly the same 3,080 test files. The unit shards restore a Jest transform cache from main.
- Add `Lint and Test Guard`: when a PR Checks run finishes without creating `Lint and Test` (run 41817202190, PR #2660), it reports a failed `Lint and Test` check on the head commit, so a missing required check cannot be admin-merged as if green.
- Upload `web-build` with hidden files, so its standalone server includes `.next/standalone/.next`.
- In the setup composite, restore the npm download cache only when node_modules misses, run `npm ci --prefer-offline --no-audit --no-fund`, and let jobs that neither build Next nor pack Electron skip those two caches.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `journey-qc`: the hardened aggregator may accept a skip of a job that was gated off by `detect-changes`; every other skip, failure or cancellation still fails it, and a run that never creates the aggregator is reported as failed by a guard workflow.
- `simulation-system`: the perf-smoke throughput budget is set by the `simulation-checks` job's perf-smoke step.

## Impact

`.github/workflows/pr-checks.yml`, `.github/actions/setup-node-and-install/action.yml`, `scripts/qc/openspec-ci-contracts.mjs`, `scripts/qc/validate-restore-ci-correctness-teeth.mjs`, `.github/workflows/lint-and-test-guard.yml` with `scripts/ci/lint-and-test-guard.mjs` and `scripts/__tests__/build-validation-gates.test.ts`. Branch protection still requires only `Lint and Test`, and the `Build Test / *` names are unchanged.
