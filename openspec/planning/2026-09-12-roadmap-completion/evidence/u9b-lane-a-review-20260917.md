# Lane A review: U9b

reviewedHead: fcc7c93cb2a589f679d644aaa79776986d5db997
baseline: 384bab6cde85724787f5fed28d645b85d7f7a0cc
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — ran (no new refs printed; target sha already resolvable locally).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u9b-review fcc7c93cb2a589f679d644aaa79776986d5db997` — succeeded, HEAD detached at fcc7c93cb.
- No leftover `worktrees/u9b` directory existed at review time (`git worktree list` showed only `worktrees/u4` and `u3-diagnosis` before this add); nothing needed to be avoided.
- `node_modules` junction created via `cmd /c mklink /J <worktree>\node_modules E:\Projects\MekStation\node_modules` (verified with a working junction listing before use).
- Node 22.22.0 selected via PATH prefix (`node --version` → `v22.22.0`).
- `npm_config_dry_run=true` exported in every shell before any npm/npx command in the worktree.
- No `npm install`/`ci`/`prune`, no build, no Playwright run, no real ladder runner invocation, no commit, and the root checkout at `E:/Projects/MekStation` was never written to (`git -C E:/Projects/MekStation status --short` empty, HEAD stayed at `384bab6cd` throughout).

## Files on the range

`git diff 384bab6cd..fcc7c93cb2a589f679d644aaa79776986d5db997 --name-only` (measured):
```
openspec/planning/2026-09-12-roadmap-completion/evidence/u9b-admission-20260917.json
openspec/planning/2026-09-12-roadmap-completion/evidence/u9b-local-20260917.json
openspec/planning/2026-09-12-roadmap-completion/evidence/u9b-red-20260917.json
scripts/__tests__/validate-exact-main-regression-ladder.test.ts
scripts/qc/validate-exact-main-regression-ladder.mjs
```
Exactly the 5 files the charter names. `git diff ... -- package.json` is empty (untouched). No file outside `scripts/qc`, `scripts/__tests__`, and the evidence directory is touched.

## Findings

1. **INFO — receipt-attribution vs. commit attribution, no violation.** `git diff` shows `"implementerModel": "claude-opus (Agent lane...)"` inside the three evidence JSON files (grep hit). This is the roadmap's own established receipt-provenance field (same pattern already present in U9's own admission/local receipts, read for comparison), not a commit "Co-Authored-By" or "Generated with Claude Code" trailer. `git log -1 --format='%B'` on the reviewed commit carries no such trailer. Not a guardrail violation.

2. **INFO — accepted, already-documented risk: two labelled-less groups in one runner invocation would sum together.** I independently constructed `parseRunnerOutput({ group: 'smoke', output: '  2 passed (1s)\n  3 passed (2s)\n' })` and got `{ passed: 5, failed: 0 }` → `SATISFIED`. This is a real shape (bare summaries from two runs concatenated would be misattributed to one group), but it is only reachable if `runGroup` ever ran more than one group per child process. I read `runGroup` (module lines ~277–309): it spawns exactly one child per call with a single `--group=<group>` argument, so today's call site cannot produce this input. The implementer's own `u9b-local-20260917.json` (`findingsReportedNotFixed.F7`) already names this exact risk and states it is "not currently reachable." I independently confirm the reachability analysis (single spawn, single `--group`, single summary block per invocation) and consider F7 accurately scoped — not a new finding, no action needed for this narrow unit.

3. **INFO — verified non-issue: ANSI-colored summary lines.** I checked whether Playwright could ever emit the summary line wrapped in ANSI color codes (which the regex, having no escape-code tolerance, would then reject as a false MISSING). Read `node_modules/playwright/lib/reporters/base.js`: `useColors = isTTY` unless `FORCE_COLOR`/`DEBUG_COLORS` env vars override it, and `isTTY` is derived from `process.stdout.isTTY` in the process that owns the stream. `runGroup` spawns the runner with default (piped) stdio and reads `child.stdout`/`child.stderr` via `'data'` events — a pipe, never a TTY — so `useColors` is `false` in the actual call path regardless of the parent's own terminal state, unless `FORCE_COLOR`/`DEBUG_COLORS` is set in the environment the ladder module itself runs in. I confirmed against the real captured production log (`.sisyphus/roadmap-completion-20260912/u9-main-proof-20260917/exact-main-rerun-smoke.log`, `cat -A` on the tail): the `[WebServer]` lines carry ANSI escapes (from Next.js's own dev-server logging, unrelated to Playwright's reporter) but the Playwright `ok` rows and the summary line (`  3 passed (21.2s)`) carry none — direct evidence that in the one real run on record, the reporter's own `useColors` was `false`. This is a fail-closed failure mode if it ever did occur (false MISSING, never false SATISFIED), consistent with the module's stated posture, and not something this narrow unit needs to defend against. No fix required.

4. **No defects found in the parser's fail-closed posture.** I independently read `generateSummaryMessage` in `node_modules/playwright/lib/reporters/base.js` (Playwright 1.57.0, confirmed via `node_modules/@playwright/test/package.json`) and confirmed the receipt's claimed vocabulary is complete and correctly matched:
   - `PLAYWRIGHT_SUMMARY` (`failed|interrupted|flaky|skipped|did not run|passed`) covers 6 of the 8 possible summary lines.
   - `PLAYWRIGHT_FATAL_ERRORS` (singular/plural "error(s) was/were not a part of any test") covers the remaining 2.
   - Confirmed `formatTestHeader` is always called with `{ indent: '    ' }` and no `index` from `generateSummaryMessage`, so per-test header lines pushed after `failed`/`interrupted`/`flaky` always begin with 4 spaces then `[browser-name]`, never a leading digit — they cannot be mismatched as summary lines by either regex.
   - Confirmed `playwright.config.ts` line 119 selects the `list` reporter for non-CI runs, and `list.js`'s `ListReporter extends TerminalReporter` (`base.js`), calling `epilogue(true)` → `generateSummaryMessage` → `_printSummary` on `onEnd` — i.e. this is genuinely the code path the real ladder runner exercises, not an unrelated reporter.

## False-SATISFIED / false-MISSING probes (review question 2)

Ran directly against the exported `parseRunnerOutput` + `evaluateExactMain` in the worktree (script: temp probe importing the shipped `.mjs`, not committed):

| Input | `parseRunnerOutput` result | `evaluateExactMain` verdict |
|---|---|---|
| `1 failed` + `2 passed` | `{2,1}` | MISSING (correct) |
| `1 flaky` + `2 passed` | `{2,1}` | MISSING (correct) |
| `1 skipped` alone | `{0,0}` | MISSING (correct — no pass to report) |
| `1 did not run` + `2 passed` | `{2,1}` | MISSING (correct) |
| two `N passed` lines in one output (two groups in one invocation) | `{5,0}` | SATISFIED — **see Finding 2**, accepted/documented risk, not reachable today |
| summary text embedded inside a test title line | `{0,0}` | MISSING (correct — regex requires the whole line) |
| `0 passed` | `{0,0}` | MISSING (correct — `passed > 0` required) |
| no summary line at all | `{0,0}` | MISSING (correct) |
| a labelled line naming a *different* group (`other-group: 5 passed`) | `{0,0}` | MISSING (correct — not misattributed to `smoke`) |
| `1 interrupted` + `2 passed` (pass-1 finding's exact shape) | `{2,1}` | MISSING (correct — pass-1 defect is fixed) |
| `2 passed` + `1 error was not a part of any test...` | `{2,1}` | MISSING (correct) |
| `2 passed` + `3 errors were not a part of any test...` | `{2,3}` | MISSING (correct) |
| `2 passed (1s) ` with trailing space | `{2,0}` | SATISFIED (correct — regex intentionally tolerates trailing whitespace; matches design) |

No false SATISFIED was found other than the already-documented, currently-unreachable two-groups-in-one-invocation shape (Finding 2). No false MISSING was found on any real Playwright 1.57.0 spelling — I independently derived the complete vocabulary from `generateSummaryMessage`'s source (see Finding 4) and every spelling is handled.

## Confinement check (review question 1)

Diffed the module against baseline. Unchanged, byte-for-byte outside the documented insertions: `MILESTONE_LADDER`, `resolveMilestone`, `parseReceiptGroups`, `evaluateExactMain`, `readJsonOrNull`/`readReceipts`, `git()`, `defaultRunnerCommand`, the CLI argument parser, the head-mismatch refusal (`current !== sha` → exit 2), the idle wait call (`await idleWait()`), the archive file-naming and archive JSON shape (`{ sha, milestone, at, groups, verdict }`), and `main()`. The only behavioral change is: (a) two new regex constants and one new exported function `parseRunnerOutput`, and (b) `runGroup`'s body now calls `parseRunnerOutput({ group, output })` instead of inlining the `parseReceiptGroups` call — same return shape (`{ group, passed, failed }`) consumed identically by the unchanged caller.

Ran `npx jest scripts/__tests__/validate-exact-main-regression-ladder.test.ts`: all 26 pre-existing U9 cases (verified by name against `git show 45d613428:...test.ts`) pass unchanged, confirming milestone resolution, receipt parsing, coverage rule, CLI, and the rerun-branch happy/empty paths are untouched in behavior.

## Independent mutant reproductions (review question 3)

Ran three mutants of my own choosing (none copied from the implementer's 4), each: unique-anchor edit → `sha256sum` → `npx jest` → restore from a saved copy (never `git checkout`) → `sha256sum` to confirm restoration.

1. **Removed the `PLAYWRIGHT_FATAL_ERRORS` branch entirely** (deleted the `if (fatal) { failed += ...; continue; }` block). Pre-mutant sha256 `cf15166c2d29eb206b44fd34a7dd917d016232b31ad10620be7095812deaaa1e` → mutated sha256 `f86b6300d0d121d38b5840ba666d31f0a13082d900919088c884be066e0e16c5`. Result: `Tests: 2 failed, 37 passed, 39 total` (caught by the fatal-error rerun case and the plural-fatal-error `it.each` row). Restored; sha256 verified equal to pre-mutant.
2. **Removed the unconditional `if (labelled) return labelled;` early return** (forcing every call to fall through to bare-summary aggregation even when a labelled row exists). Result: `Tests: 2 failed, 37 passed, 39 total` (caught by "waits for idle, runs the missing group, and archives the result" and "reads a labelled line still wins"). Restored; sha256 verified equal to pre-mutant (`cf15166c2d...`).
3. Combined with the implementer's own 4 recorded mutants (M1–M4, each independently spot-checked by re-reading the mutation diff against the shipped source and confirming the described catcher set is consistent with the code paths), this gives 6 total mutant probes across this and the prior review pass, all caught and all cleanly restored.

## Load-bearing check on the new cases (review question 5, second half)

13 test cases are new versus U9's baseline (26→39; confirmed by diffing test files at `45d613428` vs. this head — 6 new `it()` blocks + 1 new `it.each` with 7 rows). All 13 are load-bearing: my mutant 1 above independently catches the fatal-error rerun case and the plural-fatal-error row (2 of 13); my mutant 2 catches "reads a labelled line still wins" (1 of 13, otherwise undistinguished by any of the implementer's 4 mutants — I specifically targeted it because M1's `?? fallback` mutation is a no-op when `labelled` is already defined); the implementer's M1 catches 10 of 13 (all bare-summary-path cases); M2 catches 5 (subset of M1's); M3 catches 2 (`only-ok-rows`, `prose that is not a summary`); M4 catches 2 (both `interrupted`-specific cases). Every one of the 13 new cases is caught by at least one mutant across the full set — none is vacuous.

## Gates (review question 4)

| Gate | Last line | Exit code |
|---|---|---|
| `npx jest scripts/__tests__/validate-exact-main-regression-ladder.test.ts` | `Tests: 39 passed, 39 total` | 0 |
| `node scripts/qc/validate-exact-main-regression-ladder.mjs --sha 384bab6cde85724787f5fed28d645b85d7f7a0cc` | `EXACT_MAIN_LADDER_MISSING 384bab6cde85724787f5fed28d645b85d7f7a0cc milestone=strict-smoke missing=smoke` | 1 |
| `npx tsc --noEmit` | (no output) | 0 |
| `npx oxfmt --check` (both files) | `All matched files use the correct format.` / `Finished in 15ms on 2 files using 16 threads.` | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` (`LINT_UNITS_PATH e2e 50 / LINT_UNITS_PATH scripts 50`) | 0 |
| `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

All match the values recorded in `u9b-local-20260917.json`'s gates G1–G7 (re-measured independently, not copied).

## Cap and scope (review question 5, first half)

Measured directly (not taken from the charter's or the receipts' prose, which describe an earlier revision):

- `git diff 384bab6cd..fcc7c93cb2a589f679d644aaa79776986d5db997 --numstat`:
  - `scripts/qc/validate-exact-main-regression-ladder.mjs`: 87 added, 10 deleted (353 → 430 lines, confirmed by `wc -l` at both baseline and head)
  - `scripts/__tests__/validate-exact-main-regression-ladder.test.ts`: 231 added, 0 deleted (544 → 775 lines, confirmed by `wc -l`)
  - Total code-file delta: 318 added / 10 deleted.
- Note: the charter's own cap text ("module 353 to 403, pin 544 to 728") describes the *pass-1* head (`08a74231`, before Lane A's required edit), not this reviewed head. This head's fix (revision 2) adds a further 27 module lines (403→430) and 47 pin lines (728→775) on top of that. This is consistent with the commit message's own claim of "318 added / 10 deleted" against the `384bab6cd` baseline, which I independently reproduced via `git diff --numstat`.
- `git diff` on `package.json`: empty — untouched, as required.
- No file outside the 5 named files changed (confirmed above under "Files on the range").
- No absolute machine paths (`C:\Users`, `/c/Users`, `wrollings`, `E:\Projects`, `/e/Projects`) found anywhere in the diff (`grep` exit 1 / no match).
- No AI-attribution commit trailer (see Finding 1).
- The discarded first M1 spelling and the `String.fromCharCode` (ESC/MICRO/ANGLE) fixture workaround for oxfmt rewriting `\u` escapes are both present and match the receipts' description: I read the fixture constants in the shipped test file (lines 53–76) and confirmed they use `String.fromCharCode(0x1b)`, `(0xb5)`, `(0x203a)` rather than raw `\u` escapes or literal control bytes, consistent with the stated oxfmt-rewrite workaround.
- The cap (`maxNonGeneratedLines: 500` per `units.json` U9b.caps) is exceeded on the two-file cumulative footprint (430+775=1205, 705 over) exactly as it was for U9 (898, 398 over) and for pass-1 of U9b (1131, 631 over) — this is a pre-existing, disclosed, and (per U9's own accepted local receipt) previously-accepted overage pattern for this contract's test-heavy shape, not something introduced newly-hidden by this commit. The unit's own incremental delta (318 added / 10 deleted against the pre-U9b baseline) is inside the 500-line cap by itself. I did not find evidence that this unit tries to obscure the overage (no lines split into a new file to dodge the count, no assertions merged/deleted to shrink numbers).

## Verdict rationale

The change is confined exactly to how `--rerun` reads the ladder runner's own stdout for the single group it just spawned (`parseRunnerOutput`, plus the two new regex constants and the `runGroup` call-site swap); everything else in the contract — milestones, receipt parsing, coverage rule, CLI, head-mismatch refusal, idle wait, archive shape — is verified unchanged both by diff inspection and by all 26 pre-existing pin cases passing unmodified. The specific defect Lane A pass 1 found (`interrupted` silently dropped, producing a false SATISFIED) is fixed and pinned twice (through the full rerun/archive/CLI path and directly on `parseRunnerOutput`), and I independently confirmed the fix against Playwright 1.57.0's actual reporter source rather than trusting the receipt's transcription. I found one additional token (the fatal-error line) that the implementer also found and fixed in the same commit — an appropriate, disclosed, in-scope extension of the required edit's own instruction ("if generateSummaryMessage emits any other word the regex still misses, cover it the same way and pin it"), not scope creep. All 13 new test cases are load-bearing (verified via 2 of my own mutants plus corroboration of the implementer's 4). All required gates pass with measured, matching output. The only residual risk (two groups summarized in one runner invocation) is accurately disclosed as unreachable under the current one-group-per-spawn design and requires no fix in this narrow unit. No blocking or required-edit-level issues were found in this pass.
