## 1. Consolidation

- [x] 1.1 Record full pilot-service/store characterization before and after consolidating healing eligibility; preserve errors and outputs in a separate first commit.

## 2. Enforcement

- [x] 2.1 Record failing tests for exact enums, no-mutation API/persistence failures, KIA transitions, and unknown-status assignment.
- [x] 2.2 Implement the approved API and repository boundaries and refuse unknown assignment status.
- [x] 2.3 Kill and restore all three mutants; record the killing tests.

## 3. Validation and delivery

- [x] 3.1 Run full API, vault, pilot, force, store, and integration test directories.
- [x] 3.2 Run both tsc configs, lint, lint:units and its suite, oxfmt, OpenSpec validation, and the budget check.
- [x] 3.3 Inspect final diff, document data cleanup and upstream/follow-up decisions, and open one draft PR; never merge.

## Evidence

Full pilot-service/store characterization passed before and after consolidation: 42 suites, 802 tests in each run. Cases cover every existing pilot status, unchanged errors, refusal without mutation/fetch for KIA, and unchanged healing requests for other statuses. Local logs: `.review/s4-s6/healing-before.log` and `healing-after.log`.

Consolidation is commit `7b0ad1d30`. The enforcement red run failed all 5 selected suites: 53 failed tests and 119 passed. Failures included actual 200 responses for invalid statuses and KIA revival, direct repository bypasses, and unknown-status assignment. After enforcement, the pilot/force API and full pilot/force service directories passed: 13 suites, 458 tests (before adding malformed-body and full nonterminal-transition coverage).

All three mutants were applied deliberately, tested, and restored byte-for-byte. Their killing tests are in `src/__tests__/api/forces/forceMultiAssignment.real.test.ts`:

| Mutant | Killing test | Red result |
| --- | --- | --- |
| Replace `canTransitionPilotStatus` with unconditional permission | `refuses normal PUT revival from KIA to active without mutation` (and three other target statuses plus direct repository revival) | Expected 400, received 200; 5 failed, 76 passed. |
| Change both parsers to accept arbitrary strings | `keeps the entire pilot row unchanged on invalid status` and its force case; parser/API/direct repository cases also failed | Expected 400, received 200; 31 failed, 160 passed. |
| Restore the available-by-default branch for unknown status | `refuses unknown persisted pilot status for both assignment forms and force validation` | Expected assignment failure, received success; 1 failed, 80 passed. |

Logs: `.review/s4-s6/enforcement-red.log`, `enforcement-green.log`, `mutant-kia.log`, `mutant-invalid-status.log`, and `mutant-unknown-availability.log`.

Static gates passed: both TypeScript configs; root lint (63 warnings, zero errors); `lint:units` (17082/17085) and its full 33-test suite; repository-wide format check; strict OpenSpec validation (257 items); strict spec-purpose validation (zero errors); OpenSpec CI accounting (36/36 changes, zero errors).

Budget check was run on the lane and on untouched base `05257e185c87aaa1d4141b58d7c69b59ab0c6e46`: both have 57 unkeyable tests and 94 repository-wide keys. The exact file sets are identical (zero added or removed entries). The inherited `repoWideKeys` limit of 93 causes exit 1 on both trees; no ceiling was changed. Both new parser suites have narrow cache keys. Logs/reports: `.review/s4-s6/budget.{log,json}` and `base-budget.{log,json}`. This gate is **not green**.

The first combined full-directory process exited with Windows code `0xC0000409` after three passing suites and no Jest summary. The same full directories passed with two workers and a 512 MB worker recycling limit: **221 suites passed; 4100 tests passed, 32 skipped, 4132 total; zero snapshots**. Command: `node --max-old-space-size=4096 node_modules/jest/bin/jest.js --maxWorkers=2 --workerIdleMemoryLimit=512MB src/__tests__/api src/services/vault/__tests__ src/services/pilots/__tests__ src/services/forces/__tests__ src/stores/__tests__ src/__tests__/integration`. Log: `.review/s4-s6/full-tests-recycled.log`.

No user-data inspection or cleanup was performed. The invalid-row fixtures exist only in isolated in-memory test databases. No replay fixtures, event shapes, schema packs, or persisted formats changed. No affected line citations were found in the runner source catalogs.

Published draft [PR #3051](https://github.com/SwiggitySwerve/MekStation/pull/3051). Implementation commit: `72170339e4aad5f017b9ed304f5fd2bd32adb604`, following the separate behavior-preserving consolidation commit. The initial hosted snapshot showed Detect Changes in progress and no review decision. This evidence-only update does not change tested code. Root owns monitoring and merging; the lane never merges or marks the PR ready while checks are pending.
