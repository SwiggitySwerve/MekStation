# Lane A review: U39
reviewedHead: 743e6fd49ac6ca93f4b7f721f6d740c1240cf106
baseline: 4d4287fe8d5fe217461cfd45307887df76d316cb
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

Fetched `origin/main` (advanced to `7e03f100a`, no effect on this range). Created a detached worktree at
`.sisyphus/roadmap-completion-20260912/worktrees/u39-review` pinned to `743e6fd49ac6ca93f4b7f721f6d740c1240cf106`
(distinct from the implementer's own `worktrees/u39`, never touched). Junctioned `node_modules` from the root
checkout via PowerShell `New-Item -ItemType Junction`. Confirmed the same guard the implementer hit:
`npm run --silent qc:guard-node-modules-link` → `INSTALL_REFUSED node-modules-is-link {"expectedPath":".../u39-review/node_modules","actualPath":".../MekStation/node_modules"}`, exit 1. Every gate the charter spells `npx`
therefore ran as `node node_modules/<pkg>/bin/...` from the junctioned tree, same resolution `npx` would have made.
`npm_config_dry_run=true` was set before any npm command; verified empirically it does not suppress `npm run <script>`
execution (`npm run --silent lint:units` under it still printed `LINT_UNITS_PASS 100/100`), so it added safety
against an accidental install without blinding the verification gates. Node 22.22.0 active throughout
(`export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH`). Ran `machine-idle.mjs --wait` before both
full-directory jest runs (`jest scripts`, `jest src/__tests__/unit/evidence`); both returned promptly with no
contention. Every file mutation made during the review (baseline-file swaps for the red repro, the one custom
mutant) was restored and its sha256 checked against the head blob's own hash before moving on; `git status --short`
was empty in the worktree at the end of every such step and at close. Cleanup: deleted the `node_modules` junction
via PowerShell `[System.IO.Directory]::Delete(...)`, then `git worktree remove --force
.sisyphus/roadmap-completion-20260912/worktrees/u39-review`.

## Files on the range

`git diff --numstat 4d4287fe8..743e6fd49`:

| file | added | deleted |
|---|---|---|
| scripts/qc/roadmap-main-proof.mjs | 139 | 30 |
| scripts/qc/validate-exact-main-regression-ladder.mjs | 55 | 29 |
| scripts/__tests__/roadmap-loop-closure-proof.test.ts | 290 | 3 |
| scripts/__tests__/roadmap-loop-scripts.test.ts | 12 | 1 |
| scripts/__tests__/validate-exact-main-regression-ladder.test.ts | 86 | 11 |

5 files, all under `scripts/qc` or `scripts/__tests__` (unit's `ownershipPaths`). Product: 194 added / 59 deleted =
253 changed lines, against the unit's `caps.maxNonGeneratedLines: 500`. Test: 388 added / 15 deleted = 403 lines,
uncapped per OD-line-cap-product-lines. Both totals match `evidence/u39-local-20260925.json` exactly. No file
outside the two owned paths is touched.

## Findings

1. **[Informational] `--runtime-command` breaks silently (does not refuse) on an unquoted path containing a space, and cannot be made to work at all with a quoted one.**
   `scripts/qc/roadmap-main-proof.mjs` `runtimeStep()`. Probed directly against `ladder()`:
   ```
   runtimeCommand: 'node C:/Users/Wes Rollings/run-u37-proof.mjs'
   -> argv: ["node","C:/Users/Wes","Rollings/run-u37-proof.mjs"]   // wrong, silent
   ```
   versus the parent's real (no-space) invocation shape, which resolves correctly:
   ```
   runtimeCommand: 'node C:/Users/wroll/AppData/Local/Temp/run-u37-proof.mjs'
   -> argv: ["node","C:/Users/wroll/AppData/Local/Temp/run-u37-proof.mjs"]   // correct
   ```
   Quoting the space-containing path to fix it does not help: a `"` is in `SHELL_SYNTAX` and is refused
   `RUNTIME_COMMAND_NOT_ARGV` (proven by the pin `'refuses a quoted path in --runtime-command'`). So a
   space-containing path has no correct spelling under this contract: unquoted it silently produces a broken argv,
   quoted it is refused. This is not a regression — the baseline's `shell: true` string would have split an
   *unquoted* space the same way (cmd.exe word-splits, too); only a *quoted* space-path worked before, and that
   path is now closed off. The unit's own header comment (`--runtime-command "<program> <args...>"`) does not
   claim to handle paths with spaces, so it is not a false comment, but the "fails closed" behavior sentence
   invites the expectation that a malformed command is refused rather than silently misparsed. No current
   real caller is affected (admission's `risksForTheParent` confirms `--runtime-command "node <repo-relative
   file>"` is the only live usage, and every quoted example in the diff and receipts is a repo-relative,
   space-free path). Recommend recording this the way U39 recorded its two other residuals (a
   `FN-u39-*`-style entry) rather than blocking on it, since a real fix needs a quoting/escaping grammar the
   unit's behavior sentence never asked for.

2. **[Informational, already disclosed] `sha256` runs before `restore-next-env` in the ladder's step order** — reproduced live: the `--dry-run` step order on the head is
   `... qc-pin, sha256, restore-next-env, dirty-check`. This matches `FN-u39-sha256-before-restore-next-env`
   exactly as recorded; not a new finding, confirming the receipt's claim rather than adding one.

3. **[Informational, already disclosed] `--rerun` returns the prior `SATISFIED` verdict without spawning anything when the archive/evidence dir already covers the sha** — read `runExactMainLadder` directly
   (`scripts/qc/validate-exact-main-regression-ladder.mjs:378-382`): `if (!rerun || before.verdict === 'SATISFIED') return { exitCode: ..., lines: [verdictLine(before)] }` — no `idleWait()`, no `runGroup()` call, on that
   branch. A skip and a fresh pass print the identical `EXACT_MAIN_LADDER_SATISFIED <sha> ...` line, so the
   `exact-main-ladder.log` the new proof step writes cannot distinguish a rerun that actually executed the smoke
   suite from one that reused an earlier archive. The fake-step pin does **not** exercise this: it fakes the
   `exact-main-ladder` step entirely (`node <fake-step.mjs> exact-main-ladder <original argv>`, which only
   echoes its argv), so it never calls the real `runExactMainLadder` and cannot observe the skip path. This
   matches `FN-u39-rerun-skips-when-archive-covers-commit` and the unit's own `nonClaims` ("the exact-main-ladder
   step was never run for real"); recorded correctly as a residual for a successor unit, not a gap in this one's
   own claims.

No finding rises to REJECT or requires an edit before merge: all three are either pre-existing, already
disclosed in the unit's own findings, or a documented non-claim.

## Gates (head, all under Node 22, via `node node_modules/<pkg>/bin/...` since `npx` is refused in a junctioned worktree)

| gate | last line | exit |
|---|---|---|
| `jest scripts` (after MACHINE_IDLE) | `Test Suites: 80 passed, 80 total` / `Tests: 10 skipped, 1252 passed, 1262 total` | 0 |
| `jest src/__tests__/unit/evidence` (after MACHINE_IDLE) | `Test Suites: 2 passed, 2 total` / `Tests: 18 passed, 18 total` | 0 |
| `tsc --noEmit` | (no output) | 0 |
| `oxlint` | `Found 84 warnings and 0 errors.` | 0 |
| `oxfmt --check` (5 changed files) | `All matched files use the correct format.` | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] workflowContracts=8/8 ... errors=0` | 0 |
| `validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |
| focused: `validate-exact-main-regression-ladder.test.ts` (the ladder pin) | `Tests: 44 passed, 44 total` | 0 |
| focused: `roadmap-loop-closure-proof.test.ts` (the dry-run + fake-step pin) | `Tests: 29 passed, 29 total` | 0 |
| focused: `roadmap-loop-scripts.test.ts` (the loop pin) | `Tests: 14 passed, 14 total` | 0 |

Every total matches `evidence/u39-local-20260925.json` exactly.

**Question 1 — shell-free spawns.** Read every `spawnSync`/`spawn` call on the head: `spawnStep()` (the sole argv
seam, `spawnSync(command, args, { cwd, env, encoding, maxBuffer })`, no `shell` key at all) and
`validate-exact-main-regression-ladder.mjs`'s own `spawn`/`spawnSync` calls for the runner process (unchanged by
U39, already shell-free). No call sets `shell: true` and no call names a `.cmd` file; `resolveArgv` maps `node` →
`process.execPath` and `npm`/`npx` → `process.execPath` + the resolved `npm-cli.js`/`npx-cli.js`, verified live:
```
node   -> [process.execPath, ...]
npm    -> [process.execPath, ".../node_modules/npm/bin/npm-cli.js", "run","build"]   (fs.existsSync = true)
npx    -> [process.execPath, ".../node_modules/npm/bin/npx-cli.js", "openspec","validate"] (fs.existsSync = true)
git    -> ["git","status"]   (unchanged)
```
(from the `'resolves node, npm and npx to the running node and never to a .cmd file'` pin, reproduced above, 29/29
green). Live `--dry-run` against the real head sha, unmodified worktree, no execution:
```
DRY-RUN playwright: node node_modules/jest/bin/jest.js a|(b)&c
DRY-RUN exact-main-ladder: NODE_ENV=production node scripts/qc/validate-exact-main-regression-ladder.mjs --sha 743e6fd49ac6ca93f4b7f721f6d740c1240cf106 --rerun
DRY-RUN openspec-strict: npx openspec validate --all --strict
```
(no `.cmd`, regex reaches the dry-run print with `|`, `(`, `)`, `&` intact; confirmed no log directory was created
and `git status --short` stayed empty). The build/qc-pin/openspec steps that use `npm run build` and
`npm run qc:openspec-ci:validate` do resolve to `process.execPath` + npm's own JS entry point (not `npm.cmd`), so
yes — spawning `npm-cli.js`/`npx-cli.js` through `process.execPath` on Windows works for those steps, and it is the
same file `npm`/`npx` would themselves dispatch to.

**Question 2 — the `--runtime-command` contract.** The parent's real invocation shape
`--runtime-command "node C:/Users/.../run-u37-proof.mjs"` (drive letter, no space) is confirmed to resolve
correctly (see Q1 dry-run and the direct `resolveArgv`/`ladder()` probe above): `command.split(/\s+/)` only splits
on the space between `node` and the path, and the colon in the drive letter is untouched since it is not
whitespace.

A path containing a space is **broken silently, not refused**: unquoted, `'node C:/Users/Wes Rollings/run.mjs'`
splits into three argv elements (`["node","C:/Users/Wes","Rollings/run.mjs"]`), which spawns the wrong program with
the wrong arguments and no error; quoting it to keep it as one token is refused `RUNTIME_COMMAND_NOT_ARGV` instead,
since a quote character is in `SHELL_SYNTAX`. There is no way to pass a space-containing path through
`--runtime-command` correctly today (Finding 1, informational — not a regression from baseline, no current caller
affected).

**Question 3 — the exact-main-ladder step.** Read from the head: `ladder()` places
`{ name: 'exact-main-ladder', argv: ['node', 'scripts/qc/validate-exact-main-regression-ladder.mjs', '--sha', options.merge, '--rerun'], env: { NODE_ENV: 'production' } }` immediately after the runtime step and before `tsc`,
confirmed in the live dry-run order above. `roadmap-unit-closure.mjs:238`'s
`lastLine(logDir, 'playwright', /passed|failed|flaky/)` reads `path.join(logDir, 'playwright.log')` specifically
(`roadmap-ledger-lib.mjs:122-123`, `${name}.log`), so it structurally cannot read the new step's
`exact-main-ladder.log` — `playwright.log` is untouched by the new step and the closure tool's runtime line is
unaffected, confirmed by direct read of the source, not inference. `--rerun`'s skip-on-archived-satisfied path is
covered under Finding 3 above: it logs the identical `EXACT_MAIN_LADDER_SATISFIED` line whether it ran or skipped,
and the fake-step pin (which fakes this step entirely) does not exercise the real skip branch.

**Question 4 — `parseRunnerOutput`.** Ran the two-block fixture and a column-0 group line through the pin suite
on both trees. On the head: both pins reject (`{ passed: 0, failed: 0, rejected: 'two-summary-blocks' }` /
`{ ..., rejected: 'column-0-group-line' }`, and the rerun-branch equivalents archive `0/0` and stay
`EXACT_MAIN_LADDER_MISSING`). On the baseline (files swapped in, sha256 checked against
`baselineFileSha256` before running): 6 of 44 ladder-pin cases fail, matching the red receipt's `R3` exactly,
including the archived-`5/0`-SATISFIED shape the finding names. The two replaced existing cases are genuinely
reversed by the unit sentence — quoting it: *"parseRunnerOutput (validate-exact-main-regression-ladder.mjs:184-206)
rejects two or more summary blocks and any column-0 '\<group\>:' line"* (units.json `behavior`). The old case
`'a labelled line still wins'` asserted a labelled `smoke: 4 passed` line was read as `4 passed` (the old
`parseReceiptGroups`-based label path); the new case with the same input now asserts `rejected:
'column-0-group-line'`. The old case `'repeated summaries add up'` asserted two `passed` blocks summed to 3; the
new case with the same shape now asserts `rejected: 'two-summary-blocks'`. Both are direct behavioral opposites of
their pre-U39 assertions, which is exactly what the sentence calls for.

**Question 5 — reproduce red.** Restored both baseline product files by content (sha256 checked against
`u39-admission-20260925.json`'s `baselineFileSha256` before running, and against the head's `u39-local` sha256
after restoring): `82fd00ec...` / `cf15166c...` in, `d3254537...` / `b3edffa0...` out. Pin totals against the
baseline product code:
```
ladder pin:  6 failed, 38 passed, 44 total   (red receipt: 6 failed, 38 passed, 44 total)
closure pin: 11 failed, 18 passed, 29 total  (red receipt: 11 failed, 18 passed, 29 total)
loop pin:    14 passed, 14 total             (red receipt: 14 passed, 14 total)
```
Exact match on every row. Restored the head files afterward; sha256 matched the head blob exactly and
`git status --short` was empty.

**Question 6 — an independent mutant.** Chose a mutant not among M1-M4: stripped the `npm`/`npx` branch out of
`resolveArgv`, leaving only the `node` branch (so `npm`/`npx` would spawn as bare `npm`/`npx`, undermining the
"never launches a .cmd file" guarantee a different way than M1's regex-through-npx mutant). Hashed before running
(`672a1c74...`, differs from the head's `d3254537...`), then ran the closure-proof pin:
```
Tests: 1 failed, 28 passed, 29 total
```
caught by `'resolves node, npm and npx to the running node and never to a .cmd file'`
(`expected process.execPath, received "npm"`). Restored the file; sha256 returned to `d3254537...` exactly,
`git status --short` empty.

**Question 7 — gates.** See the table above; every gate passes with the exact totals the local receipt records.

**Question 8 — scope and cap.**
- Files: all 5 changed files are under `scripts/qc` or `scripts/__tests__`, matching `ownershipPaths` exactly; no
  other path touched (`git diff --numstat` above is the complete list).
- Product lines: 194 added / 59 deleted = 253 changed, under the unit's 500-line cap.
- AI attribution: `git diff` and the commit message (`743e6fd49 chore(qc): main-proof execution is shell-free and
  fails closed; ...`) both scanned for `claude|anthropic|co-authored|generated with` — none found.
- Absolute machine paths: `git diff` scanned for `C:\Users`, `/c/Users`, `C:/Users` — none found in the diff.
- Function comments: every added or changed top-level function in both product files carries a comment describing
  what it does (`npmEntry`, `resolveArgv`, `spawnStep`, `runtimeStep`, `ladder`, `printable`, `execute`, `main`,
  `runLadder` in `roadmap-main-proof.mjs`; the `parseRunnerOutput`/`GROUP_LINE`/`SUMMARY_ORDER` comments and the
  `runGroup` doc comment in `validate-exact-main-regression-ladder.mjs`). Checked the file's own header comment on
  `--runtime-command` (quoted above under Question 2's evidence): it states the value is treated as
  `"<program> <args...>"` and that a quote or shell operator is refused — both true of the code beneath it; it
  makes no claim about paths containing spaces, so it does not overclaim (Finding 1 is a functional gap, not a
  false comment). The corrected comment at `validate-exact-main-regression-ladder.test.ts:49-51` was checked
  against a fresh oxfmt run and is accurate: a byte-identical probe through `node node_modules/oxfmt/bin/oxfmt`
  confirms oxfmt 0.28.0 does not rewrite a `\u` escape, matching the corrected text and reversing the old (false)
  claim.

## Cap

Product 253 / 500 non-generated lines. Files 5 (all owned paths). No AI attribution. No absolute machine paths in
the diff. Review class `routine` (no Lane B owner ruling required).

## Verdict rationale

Every claim in `evidence/u39-local-20260925.json` was independently reproduced byte-for-byte or line-for-line on
the exact head: the three pin suites' totals, the eight full gates, the red-repro totals against the restored
baseline files (with sha256 checked both directions), and the shell-free spawn behavior via direct source reading
and a live `--dry-run`. An independent mutant outside the receipt's own M1-M4 set was caught by the same pin. The
diff is scoped exactly to the two owned paths, under cap, free of AI attribution and absolute machine paths, and
every touched function's comment matches its code. The two already-disclosed residuals
(`FN-u39-sha256-before-restore-next-env`, `FN-u39-rerun-skips-when-archive-covers-commit`) were independently
confirmed rather than newly discovered. The one new observation (Finding 1, the unquoted-space-path silent
breakage in `--runtime-command`) is informational: it is not a regression from baseline behavior, no real caller
is exposed to it today, and the unit's own header comment does not claim to cover it. None of the findings rises
to a required edit. **APPROVE.**
