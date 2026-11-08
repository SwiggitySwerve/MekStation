# S1b PR1 verification

Base: origin/main 8c44f6069. Node 22.22.0 (SQLite native ABI). No dependency changes.

## Test-first
- Red on unchanged source: 3 new runner tests failed. The fast-forwarded encounter was `ready` rather than `completed`, and both refused-write cases resolved instead of rejecting. The guarded-close test passed on main because it pins existing behavior.
- Green after the fix: runner, router and guarded-close suites passed (15 tests).

## Killed mutants (each restored)
- M1, remove the runner's completion call: 2 runner tests failed.
- M2, publish before completing: 2 runner tests failed.
- M3, drop the Completed gate in `shouldPersistEncounter`: 3 guarded-close tests failed.

## Replay/digest/golden (fixture safety)
The same 92 suites (replay, digest, golden, determinism, fast-forward and scenario packs, including `mintFastForwardPack`) ran on main's source and again with this change.
- Before: 1,211 passed, 2 skipped.
- After: 1,214 passed, 2 skipped. The only difference is the 3 new runner tests; every other test's status is identical.
- No tracked fixture or digest changed: the working tree stayed clean after both runs.

## Lane gates
- Whole directories: fast-forward, encounter services, game-session and pre-battle pages, stores, encounter and replay-library API tests, `src/__tests__/integration`, `src/simulation/runner/__tests__`. 332 suites, 4,069 passed, 32 skipped.
- `validate:combat`: 79 suites, 2,107 tests passed.
- Both TypeScript configs passed. Root lint: 63 warnings, 0 errors. `lint:units` passed, and its Jest suite passed (33 tests). `format:check` passed.
- Budget check: 57 unkeyable, 92 repo-wide (unchanged).
- OpenSpec: strict validation passed (270 items), and the CI quality check passed.
