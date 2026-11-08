## 1. Baseline and regression proof

- [x] 1.1 Capture replay/digest/golden and seeded auto-resolve baseline results.
- [x] 1.2 Record failing tests for configured limits and objective precedence; cover halts and existing destruction/exit behavior.

## 2. Implement approved contracts

- [x] 2.1 Wire effective limit, halt flag, and resolved winner into the terminal classifier.
- [x] 2.2 Make the engine reason adapter exhaustive and preserve every current mapping with comments on legacy semantic mismatches.
- [x] 2.3 Re-anchor affected runner source citations by content.
- [x] 2.4 Record both killed mutants, then restore the intended implementation.

## 3. Verify and deliver

- [x] 3.1 Run full runner/engine directories, integration, replay/digest/golden, QuickResolve, fast-forward, quick-game, and pre-battle suites; stop on fixture, digest, or seeded outcome changes.
- [x] 3.2 Run validate:combat, both TypeScript configs, root lint, lint:units and its suite, oxfmt, OpenSpec checks, and the unkeyable budget check.
- [x] 3.3 Prepare the draft PR description, evidence, and follow-ups for Root; never merge.

## Verification evidence

Baseline: `origin/main ab42e8b1b06d940b3db4df47cf7bfe5f87999d38`, using Node 22.22.0 to match CI and the installed SQLite native module. Merged C16 from `origin/main 0d53a51c1939e3a1f2e2ef20a3f8e4060b7e6840`, then merged main `28a375be9f83d19369ca49618e7129c91bcee913` (unit loading and salvage acceptance) into code commit `19b51c26b8c73a7ff58228148d4841c60ef7d162` and repeated every gate. Preserved both sides of the append-only ledger conflict. C16's three source-anchor catalogs are unchanged relative to that main revision. Raw logs and outcome captures are in `E:/Projects/Personal/_scratch/sm-audit-reports/c17-evidence/`.

- Test-first: `red-node22.log` records 7 failures and 62 passes; `green.log` records all 69 passing. `red-empty-roster.log` records the additional empty-roster regression before its fix.
- MAX_TURNS mutant: `mutant-max-turns.log` records one failed short-limit test (expected timeout, received draw), eight passes. Restored the effective limit afterward.
- Exhaustiveness mutant: `mutant-exhaustive.log` records TS2322 at `src/engine/GameEngine.ts:85`: the temporary `c17_unhandled_mutant` reason is not assignable to `never`. Restored the outcome union byte-for-byte afterward.
- Before replay/digest/golden: 35 suites, 805 tests passed. Before merging C16, broad gates passed 284 suites/3,621 tests with 32 existing skips, followed by 184 suites/2,285 tests after the empty-roster fix.
- Final merged gates (`latest-full.log`): 288 suites, 3,659 tests passed, 32 existing skips. Includes all runner subdirectories, engine, integration, replay/digest/golden, seeded auto-resolve consumers, and the lint-units Jest suite.
- Final merged `validate:combat`: 79 suites, 2,107 tests passed; gap and OpenSpec checks exited successfully.
- Seeded QuickResolve and fast-forward: 15 tests passed before and after, including after merging C16; all 20 captured engine outcomes match exactly. All 29 tracked fixture hashes match. No fixture or digest literals were regenerated or changed.
- Both TypeScript configurations pass. Root lint: 63 warnings, zero errors. Unit lint: 17,077/17,085, with its Jest suite passing. Formatting and all 248 OpenSpec items pass. Final cache census: 57 unkeyable tests, matching the 57 limit; no ceilings increased.

The first baseline attempt used Node 24 and hit the existing native-module ABI mismatch; the successful baseline uses Node 22. An oversized baseline including optional throughput tests was stopped and replaced with the explicit gameplay replay/digest/golden baseline. The initial Node 24 budget census timed out; the Node 22 final check passes without changing its timeout.

## Follow-ups

- Consolidate the five overlapping end-reason vocabularies in a separate change.
- Reconsider the legacy auto-resolve `aborted` -> `destruction` and `timeout` -> `destruction` mappings separately. This change preserves both explicitly.
- Hosted CI, review, and merging belong to Root. Keep the PR a draft pending hosted CI; this lane never merges.
