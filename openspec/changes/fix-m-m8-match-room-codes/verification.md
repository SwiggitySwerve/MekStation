# Verification evidence

Initial base: origin/main eba8969f30cf120d848dbab2f53fb22eedcccfbf. Final validation base: c44603b07ba1e4c0ac7de848d5161cdcd9f1233a, merged with git merge origin/main. Node 22.22.0.

## Test-first runs

- Before implementation: 4 suites failed; 10 tests failed, 26 passed. Existing code retained codes on create/transition/close and the first boot read returned STALE2. Retry/migration modules were absent.
- The initial missing-native-binding setup failure was infrastructure, not counted as a behavioral red. Installed the Node 22 prebuild and confirmed a real in-memory SQLite connection.
- Behavior-preserving patch extraction: 2 suites passed, 3 existing updateMatchMeta tests passed (39 unrelated tests skipped). The independently applicable refactor.patch records the extraction before behavior changes; git apply --check --cached verifies it against the unmodified base index (use --ignore-space-change if a checkout converts the patch to CRLF).
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
- PASS: `git diff --check` and independently applicable `refactor.patch` check.
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
