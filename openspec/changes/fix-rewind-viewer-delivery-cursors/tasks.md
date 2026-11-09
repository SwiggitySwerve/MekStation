## 1. Baseline

- [x] 1.1 Record live replay, restart replay and durable acknowledgement failures on fresh main; report the passing restart safety guard separately.
- [x] 1.2 Record saga continuation, rollback and other-match isolation coverage.
- [x] 1.3 Run replay/digest/golden baseline coverage without updating fixtures.

## 2. Implementation

- [x] 2.1 Delete match delivery and acknowledgement rows inside the existing supersession transaction and document the contract.
- [x] 2.2 Pass regressions, then remove durable cleanup to kill the mutant with in-memory discard retained; restore and pass.

## 3. Final proof

- [x] 3.1 Pass whole multiplayer and integration tests with two workers, runner/replay/digest/golden coverage, both TypeScript configurations, lint, unit-data lint and its Jest suite, changed-file formatting, budget check and combat validation.
- [x] 3.2 Build standalone production with E2E enabled; run journal-armed E2E-19/25 on port 3620 and `.e2e-store-vdc`, with one worker and retries off; record server-log persist-warning count.
- [x] 3.3 Verify only approved files changed and merge fetched main if needed; rerun affected gates.

## Evidence

Baseline: `origin/main` at `54d7a2c5288362e1807b0adbb6001df8da5c4cc5`, Node
22.22.0, with only regression tests and this change package added. The focused
`--testNamePattern=VDC --maxWorkers=2 --coverage=false --verbose` run over the
three changed test files recorded **five failures and two passes**:

- Red: attached-viewer replay retains old delivery rows; restarted replay logs
  two SQLite UNIQUE persist failures; the old acknowledgement remains at 3;
  store supersession leaves resume rows intact; saga reload restores three old
  slots instead of rejecting the record.
- Green on main: the cold-reopen recovery guard skips both mapping and receipt
  restoration, and the later-receipt-failure test preserves both matches' data.
  The inferred stale-load hazard is therefore not reproduced through production
  activated-branch recovery. Durable replay failure is reproduced separately.

External run log: `vdc-baseline-confirmed.log` in the lane's shared scratch
report directory. An earlier run exposed a native SQLite error matcher issue;
the confirmed run checks the rejection message without an Error realm check.

The pre-fix replay/digest baseline passed 191 suites and 2,334 tests, including
the full runner test directory, replay schema packs, command digest lock,
viewer digest equivalence and engine/replay/fast-forward determinism. The
budget baseline passed with 57 unkeyable and 91 repo-wide files.

The initial fix passed all 56 tests in the three changed suites. Removing only
the two durable deletes, while retaining the host's in-memory discard, produced
the same five failures and two passes as main. The cleanup was then restored;
the final directory gates include the restored regressions.

After merging main at `396fd0df7265910f5921e7d64b5b55d08f800764`, the first full
directory run passed 451 suites and 5,167 tests (35 existing skips) with
`--maxWorkers=2`. It included all multiplayer and integration tests, the full
runner directory, the baseline replay/digest suites and the unit-data-lint Jest
suite. Both TypeScript configurations passed. Root lint: 62 warnings, zero
errors. Unit-data lint: 17,082 findings within the unchanged 17,085 ceiling.
Budget: 57 unkeyable, 91 repo-wide. Formatting, change-local OpenSpec strict
validation and `npm run validate:combat` passed. No VDC change touched a schema,
replay fixture, digest or golden. Upstream's scenario-pack refresh and replay
schema changes came from main, not this lane's diff.

The verified final base is `2d5755ed4cb8fe9b95637e3285ec055a93bb0300`.
After merging that snapshot, the full run passed again: **451 suites, 5,167
tests, 35 existing skips**, with two workers. Both TypeScript configurations
passed after the production build. Root lint remained 62 warnings / zero
errors; unit-data lint remained 17,082 / 17,085. Budget passed at **57 unkeyable /
92 repo-wide**. Combat validation passed 79 suites and 2,107 tests plus its
inventory and strict OpenSpec checks.

Production standalone build passed with `NEXT_PUBLIC_E2E_MODE=true` and
`NEXT_PUBLIC_E2E_TEST=true`. The journal-armed E2E-19/25 pack passed **2/2** on
port **3620**, with `.e2e-store-vdc`, `--workers=1` and `--retries=0`:

```text
server grep "persist failed" count: 0
```

Final logs in the shared scratch report directory: `vdc-merged-main-jest.log`,
`vdc-merged-main-typecheck.log`, `vdc-merged-main-lint.log`,
`vdc-merged-main-lint-units.log`, `vdc-merged-main-budget.json`,
`vdc-merged-main-combat.log`, `vdc-merged-main-build.log`, `vdc-final-e2e.log` and
`vdc-final-server.log`. The closed-server databases and WAL files are preserved
under `vdc-proof-20261109-t3-1b658041/final/.e2e-store-vdc`. Port 3620 was free
after Playwright teardown; no other process was stopped.

One concurrent E2E attempt timed out during server startup before running any
test (`vdc-merged-main-e2e.log`). After the other gates finished, the serial run
passed with the unchanged startup timeout and test retries still disabled.
An initial build encountered incomplete local dependency extraction; repairing
matching locked package files resolved it. No dependency manifest or lockfile
changed, and the focused 56-test suite passed again after that repair.

Coordinator 4 explicitly approved publishing this verified snapshot after main
gained #3234 (unrelated battle-armor ammo parity), without another merge. C4
trial-merges onto current main before merging and covers that interval. Hosted
checks are reported as **Actions outage, zero-job runs**; workflows were not
changed.
