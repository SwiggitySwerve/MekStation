# D-11 G5 verification

## Decision and scope

Root's 2026-11-09 G5 ruling selects option (a): compare two fresh encounters prepared before either auto-resolve, with identical battle inputs and seed. The terminal encounter rule documented by #3058 stays in force. The manual same-encounter restart/refusal E2E and encounter lifecycle tests are unchanged.

The exact amended requirements for Coordinator 4 and C5 are:

- `encounter-system` / **Explicit Restart and Visible Launch Refusal**: amended in the active `fix-encounter-status-lifecycle` delta and synchronized to `openspec/specs/encounter-system/spec.md`.
- `game-engine-orchestration` / **Single-Player Launch Seed Threading**: modified through this change's delta and synchronized to `openspec/specs/game-engine-orchestration/spec.md`.

The active encounter requirement, this change's deltas, and the synchronized live requirements were compared for exact equality. No archived change, runtime source, schema, event payload, replay format, digest fixture, or engine behavior is changed. This change records accounting only in its own `.ledger.json`.

## Production evidence

Evidence files are under the shared audit directory `d11-e2e/fix-g5/`.

- Build snapshot: fetched main `b5b3fdd187c9f672ae42cd617db688492c89cc81`, Node 22.22.0, `NEXT_PUBLIC_E2E_MODE=true NEXT_PUBLIC_E2E_TEST=true npm run build`, exit 0 (`build-main.log`). The seed E2E was unchanged when this build and its baseline red were recorded.
- Production command: from `.next/standalone`, `node ../../scripts/e2e/relaunching-server.mjs`; port **3615**, G5-only durable store, run ID `d11-g5-shared-b5b3`. The shared server was used after an initial five-minute startup timeout, following the triage's shared-server setup. Test timeouts and retries were not increased.
- All measured invocations used Chromium, `--workers=1 --retries=0 --ignore-snapshots`. Every spec invocation creates a new browser context; each auto-resolve starts with an independent pre-battle page load.
- The initial dependency install stalled. A local copy of the existing dependency tree was checked against the identical lockfile, and its two stale packages were corrected. The version inventory reported zero non-optional differences. A subsequent alias check restored the exact locked `@typescript/typescript6` archive before the final budget run; that archive's integrity was verified. Source typechecking uses the unchanged TypeScript 7 package, and the Jest suites use SWC. SQLite's Node 22 ABI was verified. The shared dependency tree was not changed.

| Evidence | Result |
| --- | --- |
| `baseline-red.log` | Original E2E fails at its second `runAutoResolveOnce`, line 279, waiting for navigation after reusing the Completed encounter. |
| `triage-probe-seed-requests.log` | Prior transport evidence: link A 200, complete A 200, replacement link B 400 against the same encounter. |
| `seed-pass-1.log` | Revised seed spec: 1 passed; test 21.5 s. |
| `seed-pass-2.log` | Revised seed spec: 1 passed; test 25.3 s. |
| `manual-pass-1.log` | Unchanged manual restart/refusal spec: 2 passed. |
| `manual-pass-2.log` | Unchanged manual restart/refusal spec: 2 passed. |
| `persisted-seed-runs.json` | Read-only persisted snapshots after verification, including distinct encounter/session IDs, full launch inputs, terminal outcomes and history digests. |

Both passing seed invocations prepared two Ready rows before run A, checked identical persisted configuration, and checked the saved GameCreated inputs without normalizing gameplay values. Both pairs persisted seed 424242 and observed player / turn 12 / 363 events for each execution. These numbers are observations only: the E2E asserts equality between runs and contains no seed-to-outcome golden. The first Completed row and its full saved history were checked unchanged after run B.

## Additional failure retained

`seed-pass-3.log` is an additional, unsuccessful repeat and is not counted as passing evidence. Run A reached a game URL but its completed/victory surface never appeared. The saved page snapshot says **Failed to Load Game — Match not found or already cleared**. This failure happened before the A/B outcome comparison. The read-only snapshot found that run A's row was Completed, its replay endpoint returned 404, and run B remained Ready.

No runtime correction or weakened assertion was made for this separate route-load failure. The two successful required runs remain recorded, and this extra failure remains a coordinator follow-up. This is not evidence of differing outcomes for equal fresh inputs.

## Final local gates

Main was merged through `e54923787eed5c0a5f52a4c3660da6843f60d6db` before final local gates. The production artifact remains the independently recorded fetched-main snapshot above, as permitted for the spec-only lane.

| Gate | Result |
| --- | --- |
| Both TypeScript configurations | Passed, `typecheck-final.log`. |
| Root lint | Passed: 63 warnings, 0 errors, `root-lint-final.log`. |
| `lint:units` | Passed: 17079/17085; no ceilings changed, `lint-units-final.log`. |
| lint-units Jest suite | Passed: 33 tests, `lint-units-jest-final.log`. |
| Changed E2E formatting | Passed, `format-check.log`; OpenSpec files are formatter-exempt by repository configuration. |
| Encounter lifecycle policy tests | 22 unchanged tests passed; the final full-directory run includes these tests again and passed. |
| Full encounter and integration directories | Passed: 66 suites, 919 tests passed, 32 existing skips, `encounter-integration-final.log`; explicit selection includes every test file in both directories. |
| CI budget | Passed: 3146 files, 57 unkeyable, 92 repo-wide, `budget-check-final.log` and `budget-final-report.json`. Earlier cold census attempts timed out; the passing run follows an exact-census warm-up and retains the fixed 120-second census timeout. |
| OpenSpec quality | Passed: 94/94 active changes accounted for, zero errors, `openspec-quality-final.log`. |
| Full strict OpenSpec validation | Passed: 315 items, zero failures, `openspec-all-strict-final.log`. |
| Strict spec-purpose validation | Passed: 221 live specs, zero errors or source-of-truth debt, `spec-purpose-final.log`. |

The initially misselected broader Jest invocation and the superseded pre-merge directory run were stopped and are not claimed as completed gates. Their logs remain in the evidence directory. The G5 production server was stopped after E2E verification; its durable store was preserved with the evidence.

D-11 remains open until the coordinator obtains the required green Full E2E nightly run on main. This draft change does not claim that owner gate is complete.
