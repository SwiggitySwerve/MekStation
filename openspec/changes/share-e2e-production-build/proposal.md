# Share the E2E production build within the ten-job ceiling

## Why

Both E2E shards compile the same harness-enabled production app. Root permits
one shared build only inside the existing Simulation Checks and Linux Pack job;
an extra producer would exceed the enforced ten-job ceiling.

## What Changes

- Build and upload the harness-only standalone artifact immediately after
  necessary setup/asset validation, before sequential simulation checks.
- Download and verify the same archive in both unchanged E2E shards. GitHub
  releases their dependency only after the complete simulation/pack job ends.
- Keep a separate plain production rebuild for release packaging, all existing
  tests, flags, seeds, coverage and budget/trusted wiring. Move the former
  code-only job guard to its simulation/package steps so browser-only changes
  get an artifact and docs-only changes remain a no-op.
- Retain the draft until exact-head hosted correctness/failure proof and five
  matched runs per arm. Accept critical-path nonregression, or at most fifteen
  seconds regression with job-minute savings; otherwise close as no gain.

## Impact

Capability: `e2e-testing`. This delta incorporates the measured timeout language
from `align-ci-budget-workflow-contracts`; canonical sync/archive remains with
acceptance. Static checks, C's matrix/planner, budget ceilings, U89 lists and
main/nightly coverage are preserved. No application or numerical rules change.
