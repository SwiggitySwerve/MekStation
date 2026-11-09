# Verification evidence

Initial base: origin/main eba8969f30cf120d848dbab2f53fb22eedcccfbf. Final validation base: c44603b07ba1e4c0ac7de848d5161cdcd9f1233a, merged with git merge origin/main. Node 22.22.0.

## Test-first runs

- Before implementation: 4 suites failed; 10 tests failed, 26 passed. Existing code retained codes on create/transition/close and the first boot read returned STALE2. Retry/migration modules were absent.
- The initial missing-native-binding setup failure was infrastructure, not counted as a behavioral red. Installed the Node 22 prebuild and confirmed a real in-memory SQLite connection.
- The extraction was verified behavior-preserving before adding the lifecycle changes: 2 suites passed, with 3 existing updateMatchMeta tests passed (39 unrelated tests skipped).
- First fixed focused run: 4 suites passed, 40 tests passed.
- Added a POST regression with an actual competing insert into SQLite. Before restoring retry wiring, it failed with expected 201 / received 500 (1 failed, 30 skipped).
- The first whole-directory run was intentionally interrupted after origin/main advanced; its partial passes are not counted as final validation.

Commands use node node_modules/jest/bin/jest.js --selectProjects unit --runInBand --runTestsByPath with DurableMatchStore.test.ts, MatchHostRegistry.closeRoute.test.ts, matchRoomCodeCreation.test.ts and SQLiteService.matchRoomCodes.migration.test.ts. Refactor run used DurableMatchStore.test.ts and InMemoryMatchStore.test.ts with --testNamePattern updateMatchMeta.

## Deliberate mutants

Each mutation was applied alone, tested, and restored in a finally block. Every run exited 1 with test assertion failures; no import-only failure counted as a kill.

| Mutation | Contract that failed |
| --- | --- |
| retain-non-lobby-code | Non-lobby metadata absence in both stores |
| overwrite-memory-owner | Duplicate rejection without overwriting the owner |
| remove-unique-index | SQLite duplicate rejection and raw UNIQUE constraint |
| sixth-allocation-attempt | Exactly five attempts, four regenerated codes |
| retry-unrelated-error | One attempt for unrelated errors |
| skip-boot-migration | First recovery reads contain no stale code |
| reverse-duplicate-winner | Earliest date and match-id tie-break winner |
| hostless-delete-noop | Hostless DELETE completes the store |
| route-bypass | Real POST collision returns 201 after retry; direct create returned 500 |

## Whole-directory fixture correction

The completed merged-tree gate reported 1 failed / 277 passed suites, with 1 failed / 2,878 passed / 35 skipped tests. It exposed CampaignHostRegistry.test.ts creating two unrelated lobby sessions with ABC234 in its pending-key independence test. Assign the second fixture DEF567; the test still measures independent registry keys and now respects store uniqueness. This is the only additional existing test fixture file beyond the proposed list.

## Gates

- Whole-directory command: `node node_modules/jest/bin/jest.js --maxWorkers=2 --silent src/lib/multiplayer src/services/persistence src/__tests__/integration scripts/__tests__/lint-units.test.ts --json --outputFile=<local-log>`.
- PASS: 278 suites, 2,879 tests passed, 35 skipped, zero failed; 131.492 seconds. Includes multiplayer, all persistence tests, integration and the lint-units Jest suite. No snapshots changed.
- PASS: `npm run typecheck` (root and scripts configs).
- PASS: `npm run lint`, 63 warnings and zero errors.
- PASS: `npm run lint:units`, 17,075 / 17,085; no ceiling changes.
- PASS: `npx oxfmt --check .` (9,179 files); the later one-line fixture correction was formatted and checked separately.
- PASS: `npx openspec validate --all --strict`, 273 items; `npm run qc:openspec-ci:validate`, zero errors.
- PASS: `node scripts/ci/budget-check.mjs`, 57 unkeyable / 92 repo-wide keys.
- PASS: `git diff --check`.
- PASS: commit-hook tasks via `npx lint-staged --diff HEAD^..HEAD` (13 TypeScript files). Restored only the ignored generated Husky launcher; Git configuration was not changed. The first hook task resolved bash to WSL and failed looking for the Linux TypeScript binary; placing Git Bash first on this process PATH fixed it.

## Pipeline-health evidence

- CI at merge: NOT-RUN - this lane does not merge; the PR is handed to Root as a draft.
- Post-merge validation: NOT-RUN - no merge or deployment performed.
- Error-log baseline (deployment scope/window): NOT-RUN - no production observation requested; local tests are the evidence above.

## Scope and persistence

Migration runs synchronously after SCHEMA_SQL in the match-file constructor. The reopen regression makes its first reads through listActiveMatches and getMatchMeta, the same metadata surfaces recovery consumes. The migration test asserts four cleared rows, unchanged non-code metadata/columns, deterministic winner, uniqueness and zero further clearing on reapplication. The constructor/reopen regression also verifies the duplicate loser retains its event.

The environment-reading logger is deliberately absent from the new migration graph. up(db) returns the cleared count as approved. Cache census remains 57 unkeyable and 92 repo-wide keys. No numbered migration is registered against SQLiteService's separate capability file.

No engine, replay/event payload, P2P lifecycle or parity code changed. M-H2 intent classification, M-H3 pause reasons, M-H4 correction leases/blocked recovery and K15 guarded mission creation remain on their existing paths. No simulation source citation referenced the edited modules.

## Draft handoff

PR: https://github.com/SwiggitySwerve/MekStation/pull/3074. Root owns hosted CI watching and merging. The lane leaves it in draft; no merge was performed.

## Hosted privacy-fixture follow-up and caller-path audit

Merged origin/main 8932a3d1134f79401b4b919f42580ef4cce60d55 with git merge origin/main before the follow-up. Reproduced the hosted privacy failure locally: 5 failed, 19 passed in multiplayerMatchMeta.test.ts. Changed only seed metadata: lobby keeps ABCD23, active/completed omit roomCode. Full metadata equality, generic denial, fog containment and membership assertions remain unchanged.

Audited `rg -n 'roomCode:' src/__tests__ src/lib/multiplayer src/pages-modules src/components/multiplayer e2e` without filename exclusions, then identified test/fixture/helper files. The directory census below is covered by whole parent-directory invocations; e2e/helpers is covered by the e2e browser directory.

| Directory containing matching test/fixture/helper files | Files |
| --- | ---: |
| `e2e` | 16 |
| `e2e/helpers` | 6 |
| `src/__tests__/api` | 2 |
| `src/__tests__/api/campaigns` | 7 |
| `src/__tests__/integration` | 3 |
| `src/__tests__/pages/gameplay/campaigns` | 3 |
| `src/__tests__/pages/multiplayer` | 1 |
| `src/__tests__/unit/api` | 2 |
| `src/components/multiplayer/__tests__` | 1 |
| `src/lib/multiplayer/server/__tests__` | 39 |
| `src/lib/multiplayer/server/authorization/__tests__` | 2 |
| `src/lib/multiplayer/server/history/__tests__` | 1 |
| `src/lib/multiplayer/server/projection/__tests__` | 2 |
| `src/pages-modules/gameplay/campaigns/__tests__` | 2 |
| `src/pages-modules/gameplay/lobby/__tests__` | 1 |
| `src/pages-modules/multiplayer/__tests__` | 1 |

Jest command: `node node_modules/jest/bin/jest.js --maxWorkers=2 --silent src/lib/multiplayer src/services/persistence src/__tests__/integration src/__tests__/unit/api src/__tests__/api src/__tests__/pages/gameplay/campaigns src/__tests__/pages/multiplayer src/pages-modules/multiplayer src/pages-modules/gameplay/campaigns src/pages-modules/gameplay/lobby src/components/multiplayer scripts/__tests__/lint-units.test.ts --json --outputFile=<local-log>`.

Browser command: `node scripts/playwright/run-playwright.mjs test e2e --project=chromium --workers=2 --max-failures=1 --reporter=line`, using a run-scoped durable store and `node server.js`. The initial isolated-port attempt failed a hard-coded localhost:3600 assertion; reran on the free standard port without changing tests. Also invoked all 16 E2E spec files containing roomCode: directly with the same runner/options. Fail-fast exits and incomplete coverage are recorded below.

Follow-up results:

- PASS: 392 Jest suites, 5,103 tests passed, 35 skipped, zero failures (240.599 seconds). Includes all 24 multiplayerMatchMeta privacy tests. The original five failures are fixed without weakening assertions.
- PASS: both TypeScript configs, root lint (63 warnings, zero errors), lint:units (17,075 / 17,085), lint:units Jest suite, whole-tree oxfmt check (9,181 files), focused OpenSpec validation and OpenSpec CI contracts.
- PASS: budget remains 57 unkeyable / 92 repo-wide keys; git diff --check.
- E2E setup attempt on port 3646: 13 passed, 1 failed, 1 interrupted, 985 did not run. app-routes.spec.ts:17 hard-codes localhost:3600; this attempt is not a product verdict.
- FAIL / incomplete: standard-port whole e2e directory attempt stopped at active-session-recovery.spec.ts:612 (assertion helper line 300). GET /gameplay/games/<mirrored-id> returned 404 and game-session never appeared: 1 failed, 1 interrupted, 998 did not run.
- FAIL / incomplete: direct run of all 16 E2E spec files containing roomCode: selected 57 tests; 7 passed, 1 failed, 1 interrupted, 48 did not run. gm-campaign-ledger-control-plane.spec.ts:895 expected event families [repair-ticket, salvage-allocation, base-unit-state] but received [repair-ticket, base-unit-state, salvage-allocation, base-unit-state]. No correction workflow or browser assertion was changed.
- Browser failures are recorded rather than treated as passing directory coverage. Both runners and the application server have exited. Hosted CI remains pending the pushed follow-up, and the PR remains draft for Root.
