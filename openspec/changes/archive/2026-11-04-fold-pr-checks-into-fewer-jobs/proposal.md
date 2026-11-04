## Why

A PR Checks run started 33 jobs, and the public repository gets 20 concurrent GitHub-hosted jobs, so one run saturated every runner and other pull requests queued: in run 41816902255 the E2E shards waited 6 minutes and Schema Bridge 8 minutes for a runner. Most of those jobs did under a minute of work after ~30 seconds of checkout and dependency restore. Gated jobs still started a runner just to skip every step.

## What Changes

- Fold lint, format, the roadmap ledger, the determinism audit, typecheck, the desktop typecheck and tests, a11y, BV parity, Storybook and the advisory tsrs side-check into one `static-checks` job; every check step still runs after another one fails.
- Fold the perf smoke, perf budget and coverage floor lanes into one `simulation-checks` job, which runs them one after another on an otherwise idle runner.
- Drop `install-deps`: every job restores the same node_modules cache and runs `npm ci` itself on a miss.
- Gate `simulation-checks`, `statistical-proof-pr`, `validate-combat`, `schema-bridge` and `prepare-build` with job-level conditions, so a gated-off job never takes a runner.
- `Lint and Test` accepts a skip only for those jobs, and only when every gate it names for the job was off.
- Run four unit shards on four Jest workers each, with a Jest transform cache restored from main.
- Upload `web-build` with hidden files, so its standalone server includes `.next/standalone/.next`.
- In the setup composite, restore the npm download cache only when node_modules misses, run `npm ci --prefer-offline --no-audit --no-fund`, and let jobs that neither build Next nor pack Electron skip those two caches.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `journey-qc`: the hardened aggregator may accept a skip of a job that was gated off by `detect-changes`; every other skip, failure or cancellation still fails it.
- `simulation-system`: the perf-smoke throughput budget is set by the `simulation-checks` job's perf-smoke step.

## Impact

`.github/workflows/pr-checks.yml`, `.github/actions/setup-node-and-install/action.yml`, `scripts/qc/openspec-ci-contracts.mjs`, `scripts/qc/validate-restore-ci-correctness-teeth.mjs` and `scripts/__tests__/build-validation-gates.test.ts`. Branch protection still requires only `Lint and Test`, and the `Build Test / *` names are unchanged.
