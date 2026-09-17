# Lane A review: U9
reviewedHead: c4561de30284ea3b188419b6feb5d11438f98d9f
baseline: fd71b9d7cd6579b1db7fe62995e4436318f0df67
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (no output; already current).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u9-review c4561de30284ea3b188419b6feb5d11438f98d9f` — succeeded, `HEAD is now at c4561de30 chore(qc): exact-main regression ladder contract for E2E-80`.
- `cmd /c mklink /J <worktree>\node_modules E:\Projects\MekStation\node_modules` via PowerShell (the Bash-tool `cmd /c mklink` attempt silently no-opped under Git Bash quoting; the PowerShell tool call reported `Junction created for ... <<===>> ...` and `ls` confirmed the directory resolves).
- `export npm_config_dry_run=true` exported in every shell before any `npm`/`npx` call; no `npm install`/`ci`/`prune` was run anywhere.
- Node 22 via `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH`; `node --version` → `v22.22.0`.
- No build, no Playwright, no `--rerun` against the real runner, no commits, no edits to the root checkout (verified `git -C E:/Projects/MekStation status --short` was never invoked against dirty state; only the detached review worktree was touched, and it was restored to a clean tree — see Findings 4 and cleanup below).

## Files on the range

`git diff fd71b9d7c..c4561de30284ea3b188419b6feb5d11438f98d9f --stat` / `--name-only`:

```
openspec/planning/2026-09-12-roadmap-completion/evidence/u9-admission-20260917.json
openspec/planning/2026-09-12-roadmap-completion/evidence/u9-local-20260917.json
openspec/planning/2026-09-12-roadmap-completion/evidence/u9-red-20260917.json
package.json                                                                        (+1/-0)
scripts/__tests__/validate-exact-main-regression-ladder.test.ts                     (544 lines, new)
scripts/qc/validate-exact-main-regression-ladder.mjs                                (353 lines, new)
```

6 files total, matching the charter's list exactly. No changes to `scripts/qc/gm-two-player-campaign-core.cjs` or `scripts/qc/run-gm-two-player-campaign.mjs` (absent from `--name-only`). Commit message (`git log -1 --format=%B`) carries no AI attribution. `grep -nE "E:[\\/]Projects|C:[\\/]Users"` over the product and test files found nothing.

## Findings

All findings are numbered by the probe that produced them. None are blocking.

**1. [INFO] The milestone ladder names only real, exact `REGISTERED_GROUPS` members, and the smoke subset is not enumerated by the contract.**
Probe: `node` script importing `resolveMilestone`/`MILESTONE_LADDER` from the module and `REGISTERED_GROUPS` from `scripts/qc/gm-two-player-campaign-core.cjs`.
Output: `MILESTONE_LADDER` = `[fixture-isolation:[fixture-smoke], membership:[membership-smoke], strict-smoke:[smoke]]`; all three group names (`fixture-smoke`, `membership-smoke`, `smoke`) are present in `REGISTERED_GROUPS` (34 keys). `resolveMilestone({registeredGroups: REGISTERED_GROUPS})` → `"strict-smoke"`. Reduced registries: `{}` → `null`; `{fixture-smoke}` → `"fixture-isolation"`; `{fixture-smoke, membership-smoke}` → `"membership"`. Matches the ladder's degrade-on-missing-rung logic exactly. `SPEC_BY_GROUP` is never imported or referenced by the contract (confirmed by reading `gm-two-player-campaign-core.cjs`: it is a local `const` inside `buildRunPlan`, not exported) — the contract reads group names from `REGISTERED_GROUPS` only, so it cannot go stale against the evolving `smoke` subset, and it also cannot verify the subset's spec-file contents. This is disclosed by the implementer as finding F1 in the local receipt and is an honest, unavoidable limit given the charter's ban on touching the core module — not a defect.

**2. [NONE FOUND — fail-closed held] Every charter-specified false-SATISFIED construction was rejected as MISSING.**
Probe: `evaluateExactMain({sha, milestone:'strict-smoke', receipts:[...]})` called for each case (script `probe1.mjs`, full output captured):
- Receipt for a different (real) sha (`6a358383e2531735190dabbdbc23632779a1a5f7`) with a passing `smoke` row → `MISSING`.
- Receipt with `verdict: 'FAIL'` → `MISSING`.
- Row with failures (`smoke: 5 passed, 1 failed`) → `MISSING`.
- Row with `0 passed` (`smoke: 0 passed`) → `MISSING`.
- Differently named group (`smoke-typo: 5 passed`) → `MISSING`.
- Archive-shape receipt (`groups` array) with `verdict: 'SATISFIED'` but a failing row (`{group:'smoke',passed:5,failed:1}`) → `MISSING` (the row itself is excluded by `failed===0`, so the SATISFIED word on the receipt doesn't matter).
- Archive-shape receipt with the main-proof word `verdict: 'PASS'` instead of `'SATISFIED'` → `MISSING` (shape/word mismatch correctly rejects).
- The **real, verbatim** U1 main-proof receipt text `runtime.playwright: "  1 passed (30.8s)"` (bare total, no group prefix) replayed at the target sha with `verdict: 'PASS'` → `MISSING` (`GROUP_LINE` requires the line to *start* with a lowercase group token; a leading space fails the match).
- The **real, verbatim** U11 text `"jest machine-idle pin: Tests:       62 passed, 62 total"` replayed the same way → `MISSING` (the line starts with `jest`, then a space, not a colon, so `GROUP_LINE` never matches).
- The **real, verbatim** U14 text `"jest lint-units pin: Tests:       29 passed, 29 total"` → `MISSING`, same reason.

No false SATISFIED could be constructed from any receipt shape actually observed in this repo's ledger.

**3. [LOW, theoretical] A synthetic (not observed) receipt line can slip a false SATISFIED past the parser.**
Probe: `evaluateExactMain` given a hand-crafted line `"smoke: jest Tests: 5 passed, 5 total"` at the target sha with `verdict: 'PASS'` → returned `SATISFIED`, `covered: ["smoke"]`. `GROUP_LINE` (`^([a-z0-9][a-z0-9-]*):\s+(.*)$`) only requires the group token to open the line and be followed by `:` and whitespace; everything after that is scanned for the *first* `/(\d+) passed/` and `/(\d+) failed/` matches anywhere in the remainder, so a line that begins with a real group name and happens to contain jest-style wording afterward is misread as a clean pass. I checked whether this is reachable in practice: the real ladder runner's own output format (confirmed against U3/U6/U7's real receipts: `"conflict-pack:   2 passed (7.6s)"`, `"token-pack:   2 passed (1.7m)"`, `"authority: 3 failed / 17 passed"`) never mixes a bare group-name prefix with jest's `Tests:`/`total` phrasing — the three malformed receipts that actually exist in the ledger (U1, U11, U14) all fail this pattern precisely because they don't start with a plain group token (Finding 2). So this is a real parser weakness but not one any observed or currently-plausible receipt shape triggers. Not blocking; worth a one-line code comment or a 27th pin case if the team wants the ladder to also survive a group name that happens to prefix free-form jest text.

**4. Independently reproduced mutant (group-name check removed).**
- Pre-mutation sha256: `16f3caabaca0b11af2201af192d3d64fe9060324afc30c3758ab6f269d92ac09` (matches the local receipt's `preMutantSha256`).
- Edit: `scripts/qc/validate-exact-main-regression-ladder.mjs` line 155, `required.includes(row.group) &&` → `true &&` (in `evaluateExactMain`'s coverage loop).
- Mutant sha256: `ea16c72d94274ae5e63eb1ad566e9b42f1cc228af4e971dcaf1339905a87c88d`.
- `npx jest scripts/__tests__/validate-exact-main-regression-ladder.test.ts` on the mutant: **1 failed, 25 passed, 26 total** — failure is `coverage rule > is missing when %s ("the group name differs")`, diff shows `covered: []` expected vs `covered: ["fixture-smoke"]` received. This is a different mutant than the local receipt's M1/M2/M3 (sha mismatch, `failed>=0`, exit-code-0-on-MISSING), independently confirming a fourth distinct branch is pinned.
- Restore: copied the pristine file back (the initial `cp ... || cp ...` backup landed at Git Bash's own `/tmp/u9-mutant-backup.mjs`, not the two paths I expected — recovered it from there). Restored sha256: `16f3caabaca0b11af2201af192d3d64fe9060324afc30c3758ab6f269d92ac09` — matches pre-mutation exactly. Re-ran the pin: **26 passed, 26 total**. `git status --short` in the review worktree after restore: clean (no output).

**5. `--rerun` safety, exercised only through the exported injection points (`runnerCommand`, `idleWait`), never the real runner.**
Probe script `probe2-rerun.mjs`, importing `runExactMainLadder` directly:
- Head mismatch: `runExactMainLadder({sha: SHA_A, head: 'ffff...', rerun: true, runnerCommand, idleWait, ...})` → `{exitCode: 2, lines: ["EXACT_MAIN_LADDER_REFUSED head-mismatch ffffffffffffffffffffffffffffffffffffffff"]}`; `idleCalls` stayed `0` and the archive directory stayed empty — the refusal happens strictly before idle-wait or the runner is ever touched.
- Matching head, fake runner (`process.stdout.write(group + ':   1 passed (0.4s)\n')`, spawned as `node <fake-runner.mjs> --group=smoke` — the exact `--group=<name>` form `defaultRunnerCommand` uses): → `{exitCode: 0, lines: ["EXACT_MAIN_LADDER_SATISFIED ... groups=smoke"]}`, `idleCalls: 1`, and an archive file `exact-main-ladder-a1b2c3d4e5f6-2026-09-17.json` was written containing `groups:[{group:'smoke',passed:1,failed:0,logSha256:<64-hex>}]`, `verdict:'SATISFIED'` — the log is hashed (`sha256`) as claimed.
- Fake runner that prints an unparseable line (`"nothing useful here"`): → `{exitCode: 1, lines: ["EXACT_MAIN_LADDER_MISSING ... missing=smoke"]}`; the archived receipt for this run records `passed:0, failed:0` for the group — a missing/unreadable row is never silently turned into a pass, and it still gets archived (as a MISSING record, not a fabricated PASS).
- Check mode (`rerun:false`) with a mismatched `head` supplied: the head check is skipped entirely (no refusal), because the guard is only inside `if (rerun)` — confirmed by reading the source and by this probe returning the same `MISSING` verdict as the no-head case.
- Read the module source directly for the "no CLI flag skips it" claim: `parseArguments` only recognizes `--rerun`, `--sha`, `--evidence-dir`, `--archive-dir` — there is no flag for `runnerCommand` or `idleWait`, and `main()` calls `runExactMainLadder(options)` without ever passing them, so the real CLI always uses `defaultRunnerCommand` (the real `run-gm-two-player-campaign.mjs`) and the real `waitForIdle` from `scripts/qc/machine-idle.mjs`. Read `scripts/qc/machine-idle.mjs`: its only exports are `MachineSnapshotError`, `MachineBusyError`, `listBuildProcesses`, `takeSnapshot`, `waitForIdle` — no skip/bypass export.
- The one real (non-injected) CLI exercise of the `--rerun` path (`refuses --rerun at a head that is not the sha, and exits 2`, in the pin) runs the actual module via `spawnSync` with `--rerun` and no injected collaborators; this is safe because the review worktree's HEAD is a fake-looking sha (`c4561de30...`) that can never equal the test's `a1b2c3d4e5f6...` literal, so the refusal fires before idle-wait or the runner would ever be reached — I did not independently invoke the CLI with `--rerun` for any other case, per the charter's restriction.

**6. Gates reproduced exactly.**
See Gates section below — every command's last line and exit code matches the `u9-local-20260917.json` receipt verbatim.

## Gates

| Gate | Command | Last line | Exit code |
|---|---|---|---|
| G1 | `npx jest scripts/__tests__/validate-exact-main-regression-ladder.test.ts` | `Tests:       26 passed, 26 total` | 0 |
| G2 | `node scripts/qc/validate-exact-main-regression-ladder.mjs --sha fd71b9d7cd6579b1db7fe62995e4436318f0df67` | `EXACT_MAIN_LADDER_MISSING fd71b9d7cd6579b1db7fe62995e4436318f0df67 milestone=strict-smoke missing=smoke` | 1 |
| G3 | `npx tsc --noEmit` | (no output) | 0 |
| G4 | `npx oxfmt --check scripts/qc/validate-exact-main-regression-ladder.mjs scripts/__tests__/validate-exact-main-regression-ladder.test.ts package.json` | `All matched files use the correct format.` | 0 |
| G5 | `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| G6 | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

All six reproduced independently in the review worktree and match the `u9-local-20260917.json` receipt's G1/G2/G3/G4/G6/G8 lines exactly (receipt's G5 — `oxlint` direct invocation — is separately noted there as vacuous because `.oxlintrc.json` ignores `scripts/**`; I did not re-run that vacuous check since it inspects 0 files by design and G5/G6 above already cover the load-bearing lint and validator gates).

## Cap

`wc -l`:
```
353 scripts/qc/validate-exact-main-regression-ladder.mjs
544 scripts/__tests__/validate-exact-main-regression-ladder.test.ts
```
Plus `package.json` (`git diff --numstat` → `1  0  package.json`, one added line, zero deleted). Total 353+544+1 = **898**, product-only (module+manifest) = **354**, both matching the commit message and local receipt exactly.

26 cases: I enumerated every `it(`/`it.each` block in the pin. 19 individually-named cases plus two `it.each` tables (5 cases under "is missing when %s", 2 cases under "is not covered by %s") = 26, matching the jest run. Each case targets a structurally distinct branch: milestone resolution (4 cases: real registry, two degraded registries, group-membership check), receipt parsing (5 cases: two real historical formats, one no-group line, four unparseable shapes bundled in one `it`, one archive-shape read), coverage rule (10 cases: satisfied-case plus the 5 charter-named false-SATISFIED rejections plus 3 archive-shape cases plus the invalid-milestone throw), CLI (4 cases: satisfied, missing, rerun-refusal, bad-sha), rerun branch (2 cases: full round-trip with archive+log verification, silent-runner-stays-missing), and the package-script wiring (1 case). I found no duplicate or trivially-redundant case — each asserts a different code path or a different one of the charter's own named adversarial constructions. No padding.

Dead code: I read the full module top to bottom and traced every export and internal helper (`resolveMilestone`, `parseReceiptGroups`, `evaluateExactMain`, `readJsonOrNull`, `readReceipts`, `git`, `defaultRunnerCommand`, `runGroup`, `verdictLine`, `runExactMainLadder`, `parseArguments`, `main`) to at least one call site inside the file. None are unreferenced. `RESPAWNING_GROUPS`/`assertRunOwnedPath`/`buildRunPlan`/`runCli` from the core module are not imported by this file at all (only `REGISTERED_GROUPS` is, via the default `moduleRequire(...).REGISTERED_GROUPS` fallback, itself overridable by the injectable `registeredGroups` parameter). No dead code found.

Scope: confirmed above (Files on the range) — exactly the six files, no core/runner edits, one package.json line, no AI attribution, no absolute machine paths. The two recorded deviations from the charter's own sketch (coverage judged per receipt shape's own passing word rather than a literal PASS-only rule; `idleWait` injectable alongside `runnerCommand` with no CLI reach for either) are documented in `u9-local-20260917.json.deviationsFromTheCharter` and are consistent with what I independently observed reading the source and running the probes above — the PASS-only-literal rule would in fact make the contract's own archive receipts never count as coverage on a subsequent check-mode run (verified: an archive-shape receipt bearing `verdict:'PASS'` is correctly rejected as a *shape* mismatch, precisely because the archive shape's passing word is `SATISFIED`).

## Verdict rationale

The contract fails closed against every real historical receipt malformation in this repo's own ledger (U1's bare total, U11/U14's jest summaries, U3's failed-row authority receipt) and against every adversarial construction the charter names (wrong sha, wrong verdict, failed row, zero-passed row, wrong group name, archive-shape/word mismatch). I found no legitimate receipt shape that produces a false MISSING. The `--rerun` path refuses on head mismatch before touching idle-wait or the runner, always waits for idle first, spawns the runner in the documented `--group=<name>` form, hashes its logs, and archives even a failed/unreadable attempt honestly as MISSING rather than silently. I independently reproduced a fourth mutant (beyond the three in the local receipt) and confirmed the pin catches it, then restored the file to its exact pre-mutation sha256. All six required gates reproduce identically to the local receipt. Scope, cap arithmetic, and the absence of dead code/padding/AI-attribution/absolute-paths all check out.

The one substantive finding (3) is a theoretical parser gap reachable only by a receipt line that does not resemble anything the real ladder runner or any receipt in this repo's history has ever produced — it does not undermine the "fails closed against reality" property the charter is testing for, so it does not rise to APPROVE-WITH-REQUIRED-EDITS. It is worth a follow-up note for whoever next touches this parser, not a blocking edit to this unit.

**Verdict: APPROVE**
