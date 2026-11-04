## Why

The 100-game statistical combat proof (`integration.test.ts` at `SIMULATION_COUNT: '100'`) ran on most pull requests: it was path-gated on the proof's import closure plus the combat domain trees, which most current pull requests touch. It costs about three minutes of a typical pull request's job time, and CI-SPEED is still short of the owner's -50% job-minute goal.

## What Changes

- PR Checks runs the statistical proof step only outside pull requests: on every push to main, on the nightly schedule and on manual dispatch, in the `simulation-checks` job that `Lint and Test` requires. The full nightly batch in Nightly Validation is unchanged.
- The change detector drops its `statistical` gate, which nothing reads any more.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `simulation-system`: "Statistical Validation" is replaced by "Statistical Validation On Main And Nightly", which moves the statistical batch from the pull-request lane to main pushes and nightly. A statistical regression now fails main's required check at the push that introduced it, instead of blocking the pull request.

## Impact

`.github/workflows/pr-checks.yml`, `scripts/ci/ci-changes.mjs` and `scripts/ci/ci-changes.test.mjs`. This reverses the merge-blocking rule of "Statistical Validation"; Root may veto.
