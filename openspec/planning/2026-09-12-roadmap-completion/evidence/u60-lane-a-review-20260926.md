# Lane A review: U60
reviewedHead: 3207ff20d3af310e20180f65d0afe776cee3367c
baseline: bd98895490911cd841cac8385898b6f333af8472
reviewerModel: claude-sonnet (Agent model: sonnet, lean-worker)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (already up to date at review time; head confirmed present locally).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u60-review 31f9424d5f913892554674620b4d0de113f9e397` — succeeded, `HEAD is now at 31f9424d5`.
- Junction: `New-Item -ItemType Junction -Path ...\u60-review\node_modules -Target ...\node_modules` — succeeded.
- `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH; node --version` → `v22.22.0`.
- `export npm_config_dry_run=true` set before every npm/npx command; no `npm install/ci/prune`, no build, no Playwright, no real CAMP receipt command was run.
- Before the full `npx jest scripts` run: `node scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` → stdout `MACHINE_IDLE`.
- All file mutations made for red-reproduction and the independent mutant were restored and re-verified by sha256 before this file was written; `git status --porcelain` in the review worktree is empty at time of writing (confirmed twice).
- Cleanup deferred to the very end of this session per the charter (junction delete, then `git worktree remove --force`).

## Files on the range

`git diff --stat bd98895490911cd841cac8385898b6f333af8472..31f9424d5f913892554674620b4d0de113f9e397`: 6 files changed, 116 insertions(+), 5 deletions(-):
- `openspec/changes/add-saved-custom-unit-campaign-roster/specs/journey-qc/spec.md` (+41/-1)
- `scripts/__tests__/camp01-authority-receipt-writer.test.ts` (+18/-1)
- `scripts/__tests__/camp01-camp00-listener-adapter.test.ts` (+35/-0)
- `scripts/qc/camp01-authority-receipt.mjs` (+8/-2)
- `scripts/qc/camp01-authority-receipt.schemas.mjs` (+9/-0)
- `scripts/qc/validate-camp01-authority-receipt.mjs` (+5/-1)

All 6 are inside the unit's ownership paths (`openspec/changes/add-saved-custom-unit-campaign-roster`, `scripts/qc`, and the two explicitly named test files). `git diff` on `scripts/qc/camp01-proof-environment.mjs`, `scripts/qc/camp01-github-provenance.mjs`, `scripts/qc/camp01-authority-receipt.contract.mjs` (WAVE_CONTRACTS), `package.json`, `units.json`, `roadmap.json` over the same range is empty (exit 0, no output) — none of these files moved.

## Question 1 — spec delta

Quoted in Findings F1-F5 below; short answer: yes to all five sub-questions — it is a whole-requirement MODIFIED entry, it carries exactly one solo rule (line 5's paragraph now says "it is not restated here"), the ruling shape is field-identical to U59's validator (`ruledHead, pr, commentId, author, bodySha256`), APPROVED-on-solo is defined and matches U59's code (state stays APPROVED, only `nonAuthor` relaxes), and "a new head voids the ruling" is enforced in code via `ruling.ruledHead !== gate.head`, not prose-only — though that check trusts whatever `head` is recorded on the gate (disclosed non-claim, not a defect).

## Findings

1. **F1 — MODIFIED entry restates the whole requirement (informational, confirmed).** `openspec/changes/add-saved-custom-unit-campaign-roster/specs/journey-qc/spec.md:19-23` (worktree line numbers): header is `## MODIFIED Requirements` / `### Requirement: Exact-SHA and Canonical-Provenance Execution`, followed by the full canonical text (worktree checkout, corresponding to diff hunk lines 19-23) with the exception clause folded in inline, plus the same three pre-existing scenarios (Reviewed head binds..., Audit and no-PR rows..., Exact main is fetched...) verbatim. `npx openspec show add-saved-custom-unit-campaign-roster --json --deltas-only` lists `journey-qc MODIFIED` among its 7 deltas (measured, see Gates). This is a whole-requirement restatement, not a fragment patch.

2. **F2 — one rule; line 5 says so (confirmed).** `openspec/changes/add-saved-custom-unit-campaign-roster/specs/journey-qc/spec.md:5` (ADDED requirement) ends its exception clause with: *"Spec/product authors MAY be the same, but each exact PR head SHALL have an independently verified non-author approval, EXCEPT under the declared solo-maintainer exception, whose one rule (the 2026-08-09 API-verified reduction, amended 2026-09-26 to require a head-bound OWNER-RULING on a solo gate) is the `Exact-SHA and Canonical-Provenance Execution` requirement modified below; it is not restated here."* No second solo rule remains at line 5 — it points at the MODIFIED entry instead of repeating it.

3. **F3 — ruling shape matches U59 field-for-field (confirmed).** Spec delta (:23 of the MODIFIED entry): *"recorded as `{ruledHead, pr, commentId, author, bodySha256}`"*. Validator `openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs:300-306`: `malformed` array checks `ruling.ruledHead` (40-hex), `ruling.pr` (integer), `ruling.commentId` (integer), `ruling.author` (`hasValue`), `ruling.bodySha256` (64-hex) — same five field names, same order as named in the comment at :288-290. Exact match.

4. **F4 — APPROVED-on-solo definition matches U59's code (confirmed).** Spec (:23): *"GitHub does not let a pull request's author approve it, so on a solo gate `APPROVED` means the owner's head-bound ruling: the ruling comment stands in for the approval, the exact-head, non-dismissed and `WRITE|MAINTAIN|ADMIN` requirements stay, and only the non-author requirement is relaxed."* Validator (`validate-roadmap.mjs:295`): `gate.state !== "APPROVED"` fails regardless of `solo`; `gate.exactHead !== true`, `gate.nonDismissed !== true`, and the `WRITE/MAINTAIN/ADMIN` permission-triple check are unconditional; only `gate.nonAuthor !== !solo` flips per `solo`. Prose and code agree on exactly one relaxed field.

5. **F5 — "a new head voids the ruling" is code-enforced, not prose-only (confirmed, with a disclosed trust boundary).** Spec (:23): *"a new head voids the ruling."* Validator (`validate-roadmap.mjs:307`): `else if (ruling.ruledHead !== gate.head) fail(...)`. This is a real equality check, not just documentation — a ruling recorded against a stale head fails the gate the moment `gate.head` is updated to the new head. It does **not** independently discover "the head changed" from GitHub; it trusts whichever `head` value is written into the gate record (already disclosed in the u60-local receipt's non-claims: "the check trusts the gate record and its ruling ... neither reading GitHub"). Severity: informational — this is the same trust boundary U59 already disclosed, not a new gap U60 introduces.

6. **F6 — camp-00 controller-env pass-through matches the claimed shape (confirmed).** `scripts/qc/camp01-authority-receipt.mjs:115-117` (comment) / `:119` (code): comment reads *"Default runner of the low-level writer: ... For the camp-00 row only, it also passes the parent's CAMP01_NEXT_DIST_DIR through when the parent sets one (OD-camp00-controller-env); it never invents one, and every other ambient variable stays dropped."* Code: `...wave==='camp-00'&&process.env.CAMP01_NEXT_DIST_DIR?{CAMP01_NEXT_DIST_DIR:process.env.CAMP01_NEXT_DIST_DIR}:{}` inside the fixed env object. Comment matches code exactly (camp-00-only, conditional on the parent having set it, no invention).

7. **F7 — production controller unchanged; injects its own value (confirmed).** `git diff bd98895490911cd841cac8385898b6f333af8472..31f9424d5f913892554674620b4d0de113f9e397 -- scripts/qc/camp01-proof-environment.mjs` is empty. Reading the file: `commandEnvironment` (around the file's `state.row.wave==='camp-00'?{CAMP01_NEXT_DIST_DIR:path.join(state.runtimeRoot,'next')}:{}`) injects its own folder unconditionally for camp-00, never reading `process.env.CAMP01_NEXT_DIST_DIR`. Confirms the receipt's disclosed duplicate-mechanism finding FN-u60-two-camp00-env-builders.

8. **F8 — sentinel provenance check unchanged, does not read any OWNER-RULING (confirmed).** `git diff ... -- scripts/qc/camp01-github-provenance.mjs` is empty. `verifyCitation` (around line ~147) checks `collaborators.length===1`, author, merger, and ADMIN permission for `approvalId==='solo-maintainer'`, and never reads `ruling`/`OWNER-RULING`. Matches the receipt's disclosure that the solo rule is enforced in two separate places (the ledger validator and the sentinel), neither of which this unit's diff touches.

9. **F9 — terminal form: all-green validates, empty cause graph still fails (confirmed, own probes).** `scripts/qc/camp01-authority-receipt.schemas.mjs:88-91` defines `PROOF02_ALL_GREEN_TERMINAL = 'PROOF02_TRIAGE_TERMINAL {"causes":0,"verdict":"all-green"}'`; `:97` `validateProof02Triage` returns it early when `observations.length && !nonPassing.length`, else falls through to `assertProofCauseGraph`, which `camp01-authority-receipt.contract.mjs:161` fails with `'empty cause graph'` when given an empty array — so `validateProof02Triage([], [])` still fails (no observations, no early return). Independently re-ran the two writer-suite rows twice: once against head bytes (pass, see Gates), once against a self-authored mutant (Finding F10) that killed it.

10. **F10 — my own mutant (not M1-M6): the terminal string's `causes` count.** Mutated `scripts/qc/camp01-authority-receipt.schemas.mjs`'s `PROOF02_ALL_GREEN_TERMINAL` from `{"causes":0,...}` to `{"causes":1,...}` (sha256 of the mutated file: `637dcc1d720d8d04dca863d337a974b0c87586c61836dfd8f32c2d28bb544983`). Ran `npx jest scripts/__tests__/camp01-authority-receipt-writer.test.ts -t all-green`: `Tests: 2 failed, 61 skipped, 63 total`, exit 1 — both all-green rows failed on the exact-string assertion (`toMatchObject` diff showed `"causes":0` expected vs `"causes":1` received). Killed. Restored the file from a pre-mutation backup and confirmed sha256 back to `e93f3db69b6850f592b1352a335d9c010f56b09ccd9c894c5ad0bbad967cee51` (the recorded head hash) and `git diff --stat` on the file is empty.

11. **F11 — M3 (the receipt's surviving mutant) independently reproduced.** Backed up `openspec/.../journey-qc/spec.md` (sha256 `b6b10160761e646b700cb761ea542d45c73c1ee48f2adcb36a5d3095eeea9234`, matches the head hash recorded in the receipt), changed line 87's *"the gate SHALL be refused"* to *"the gate SHALL be accepted"* in the "A solo gate without a head-bound ruling is refused" scenario. Ran `npx openspec validate --all --strict` → `Totals: 229 passed, 0 failed (229 items)`; ran `npm run --silent qc:openspec-ci:validate` → `errors=0`. Both gates pass on the contradicted scenario — confirms the receipt's own disclosure that no check reads a scenario's meaning. Restored the file (sha256 back to the head value, `git diff --stat` empty). No mechanism in this codebase (validator, jest, openspec CLI) would catch a scenario whose prose contradicts its own requirement text; this is a real, disclosed gap, not a hidden one — recorded as a non-claim in the local receipt, and I found no test or lint rule anywhere in the diff or the touched files that reads scenario semantics.

12. **F12 — task text frozen, checkbox untouched (confirmed).** `openspec/changes/add-saved-custom-unit-campaign-roster/tasks.md:4` (P.2) still reads *"...accept only a non-dismissed exact-head `APPROVED` review from a non-author with `WRITE`, `MAINTAIN`, or `ADMIN`..."* with `- [ ]` unchecked — matches FN-u60-p2-wording-frozen and the reason given (`run-viewport-sweep.test.ts:401-411` requires exact camp01-*.test.ts inventory match against the package.json umbrella list, so a new camp01-*.test.ts file can't be added by a unit that doesn't own package.json).

13. **F13 — package.json / units.json / roadmap.json byte-identical (confirmed).** `git diff bd98895490911cd841cac8385898b6f333af8472..31f9424d5f913892554674620b4d0de113f9e397 -- package.json units.json roadmap.json` is empty.

14. **F14 — OD status fields are stale (informational, already self-disclosed).** `roadmap.json:15780` (`OD-camp00-controller-env`) still reads `"status": "owner decision required; not executed, not modified"`; `roadmap.json:15793` (`OD-proof02-empty-cause-graph`) similarly stale, though both carry a `packet20260922` sub-object recording the fold into `PK-camp-review-gate` option (b). This matches FN-u60-decision-status-fields-stale, which the unit already recorded as a finding for its own future tick/closure, not a defect in this diff (units.json/roadmap.json are outside this unit's ownership paths and correctly untouched — see F13).

15. **F15 — no AI attribution, no absolute machine paths in the diff (confirmed).** `git diff bd98895490911cd841cac8385898b6f333af8472..31f9424d5f913892554674620b4d0de113f9e397 | grep -inE "generated by|co-authored-by|claude|anthropic|gpt|openai"` → no matches (exit 1). Same diff `| grep -inE "C:\\\\Users|/home/|/Users/wroll|E:\\\\Projects|E:/Projects"` → no matches (exit 1).

## Gates

All commands run from the detached review worktree with `npm_config_dry_run=true` and Node 22.22.0.

| Command | Exit | Last line / result |
|---|---|---|
| `npx openspec validate --all --strict` | 0 | `Totals: 229 passed, 0 failed (229 items)` |
| `npx openspec show add-saved-custom-unit-campaign-roster --json --deltas-only` | 0 | 7 deltas listed, includes `journey-qc MODIFIED` |
| `npm run --silent qc:openspec-ci:validate` | 0 | `[qc:openspec-ci] workflowContracts=8/8 ... errors=0` |
| `node scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` | (ran to completion) | `MACHINE_IDLE` |
| `npx jest scripts` (full) | 0 | `Test Suites: 80 passed, 80 total` / `Tests: 10 skipped, 1264 passed, 1274 total` |
| `npx tsc --noEmit` | 0 | (no output) |
| `npx oxlint` | 0 | `Found 84 warnings and 0 errors.` |
| `npx oxlint <5 changed .mjs/.ts files>` | 0 | `Found 0 warnings and 0 errors.` (0 files matched by config — says nothing about these files) |
| `npx oxfmt --check <5 changed files>` | 0 | `All matched files use the correct format.` |
| `npx oxfmt --check <spec.md>` | n/a | `Expected at least one target file` (oxfmt targets no `.md`; matches receipt disclosure) |
| `npm run --silent lint:units` | 0 | `LINT_UNITS_PASS 17899/17899`; `LINT_UNITS_PATH scripts files=186 findings=50 ceiling=50 PASS` |
| `node .../validate-roadmap.mjs` | 0 | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 381 tasks, 40 triage rows` |
| `node .../validate-roadmap.mjs --git` | 0 | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 381 tasks, 40 triage rows` |
| `node .../validate-roadmap.mjs --next` | 0 | `U94` |
| **Red reproduction**: baseline bytes of the 3 product files + `npx jest camp01-camp00-listener-adapter.test.ts camp01-authority-receipt-writer.test.ts` | 1 | `Test Suites: 2 failed, 2 total` / `Tests: 3 failed, 67 passed, 70 total`. The 3 failing rows: "passes the parent CAMP01_NEXT_DIST_DIR through..." (R1), "returns the one-line all-green terminal form..." (R2a), "publishes an all-green proof-02-triage receipt..." (R2b) — same 3 rows the red receipt names. (Total is 70, not the receipt's 69, because the current test files include one guard row the red receipt itself says was "added after this red run"; that row passes on baseline bytes as documented, so 67 passed vs the receipt's 66, consistent, not a discrepancy.) |
| **My mutant (F10)**: `causes:0`→`causes:1` in `PROOF02_ALL_GREEN_TERMINAL` + `npx jest ... -t all-green` | 1 | `Tests: 2 failed, 61 skipped, 63 total` — killed |
| **M3 reproduction (F11)**: refusal scenario flipped to "accepted" + `npx openspec validate --all --strict` + `npm run qc:openspec-ci:validate` | 0 / 0 | Both pass — confirmed survives |

All mutated files were restored and their sha256 verified equal to the recorded head hashes before this file was written; `git status --porcelain` in the review worktree is empty.

## Cap

- Files: 6 of 15 cap (`maxFiles: 15`), all within ownership paths — confirmed by `git diff --stat` (F-Files-on-the-range) and cross-checked against `ownershipPaths` in `units.json`'s U60 entry.
- Lines: counted product lines = sum of added lines on the 4 non-test files = 41 (spec.md) + 8 (camp01-authority-receipt.mjs) + 9 (schemas.mjs) + 5 (validate-camp01-authority-receipt.mjs) = 63, matching `git diff --numstat` measured independently; cap is `maxNonGeneratedLines: 500`. 63 of 500.
- No AI attribution, no absolute machine paths (F15).
- Every added/changed function comment I checked (F6, F9, and the two test-file block comments at `camp01-camp00-listener-adapter.test.ts` "default runner environment" describe block and `camp01-authority-receipt-writer.test.ts`'s `triageFixture` comment) states what the code actually does and I found no comment claiming more than the code implements.

## Verdict rationale

Every gate I ran reproduced the receipt's exact numbers (openspec 229/0, qc:openspec-ci errors=0, jest scripts 80 suites / 1264 passed / 10 skipped, tsc clean, oxlint 84/0, oxfmt clean, lint:units 17899/17899, roadmap validator 75/13/381/40, `--next` → U94). The spec delta is a genuine whole-requirement MODIFIED entry with exactly one solo rule, field-identical to U59's validator, and "a new head voids the ruling" is a real code check, not prose (F1-F5). The controller-env pass-through is camp-00-scoped, parent-value-only, and the production controller and sentinel-provenance checks are untouched and behave as disclosed (F6-F8). The proof-02-triage terminal form validates all-green and still fails on an empty cause graph, and I killed an independent mutant of the terminal string myself (F9-F10). I independently reproduced the red state (3/69→70 failing rows, same causes) and independently reproduced the receipt's one surviving mutant (M3, the contradicted refusal scenario), confirming both the fix and the disclosed gap are real and not overstated. Scope, caps, and the no-AI-attribution / no-absolute-path checks all pass. I found no finding above minor/informational severity, and the two informational items (F5's trust boundary, F14's stale status text) are both already self-disclosed by the implementer's own receipt and findings, not new gaps this review uncovered. This is a case for APPROVE with no required edits.

## Delta review (head 3207ff20d3af310e20180f65d0afe776cee3367c)

reviewedHeadDelta: 3207ff20d3af310e20180f65d0afe776cee3367c
previousHeadReviewed: 31f9424d5f913892554674620b4d0de113f9e397 (this file's original body above)

### Setup

- `git -C E:/Projects/MekStation fetch origin` — ran (no new output; head already reachable).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u60-review2 3207ff20d3af310e20180f65d0afe776cee3367c` — succeeded, `HEAD is now at 3207ff20d test(qc): the camp01 writer-runner rows run on Windows only, where the runner runs (verified npm CLI beside node, SystemRoot, ComSpec); rows split into formatted lines`.
- Junction: `New-Item -ItemType Junction -Path ...\u60-review2\node_modules -Target ...\node_modules` — succeeded.
- `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH; node --version` → `v22.22.0`.
- `export npm_config_dry_run=true` set before every npm/npx command; no install/ci/prune/build/Playwright run; nothing committed or pushed; no other worktree touched.

### Q1 — diff scope, gating pattern, :417 assertion

`git diff 31f9424d5f913892554674620b4d0de113f9e397..3207ff20d3af310e20180f65d0afe776cee3367c --stat`:

```
 .../camp01-authority-receipt-writer.test.ts        | 59 ++++++++++++++++++++--
 .../camp01-camp00-listener-adapter.test.ts         |  6 ++-
 2 files changed, 61 insertions(+), 4 deletions(-)
```

Only the two named test files, confirmed.

Gating pattern match: the writer test uses `(process.platform === win32 ? it : it.skip)(` verbatim, identical in shape to the existing pattern at `scripts/__tests__/camp01-durable-export.test.ts:243` (`it.skip : it`, inverted sense) and `:248` (`it : it.skip`, same sense) — same ternary idiom, only the target changes. The listener-adapter test introduces a `windowsDescribe` constant using the same `process.platform === win32` ternary and wraps the whole `describe(default runner environment, ...)` block in it — the same idiom applied at `describe` granularity instead of `it` granularity.

Coverage check: exactly three rows are gated, all and only the rows that go through the writer's default (spawning) runner:
1. `camp01-authority-receipt-writer.test.ts:417-470` — the row named "keeps the parent CAMP01_NEXT_DIST_DIR out of a non-camp-00 child run by the default runner" — individually gated.
2. `camp01-camp00-listener-adapter.test.ts:245-270` — the `describe(default runner environment, ...)` block containing two rows: the camp-00 pass-through row ("passes the parent CAMP01_NEXT_DIST_DIR through to the camp-00 child, which then closes a receipt") and the camp-00-only limit row ("invents no dist directory: without a parent value the child still refuses and no receipt is written") — both gated together via the `windowsDescribe` wrapper.

No other row in either file changed (confirmed by the diff hunks: only these two regions changed).

`:417` row assertion, before (old head, `git show 31f9424d5f913892554674620b4d0de113f9e397` of the writer test file, line 417): the assertion checked that `result.stderr` did not contain the short substring emitted by the fixture's console.error call, and that `result.status` equalled 0.
After (new head, same file, same row, now split across lines): the assertion checks that `result.stderr` does not contain the full literal string emitted by that same console.error call, and that `result.status` equals 0.
Meaning unchanged: the only text the fixture's child script can ever write to stderr containing that short substring is the one console.error call in the same test's fixture body (unchanged across this diff) — checking the fuller literal instead of the short substring verifies the identical fact (the leak marker did not appear), just spelled more completely; it is not a behavior change.

### Q2 — why the runner cannot run on Linux; is gating the right least change

`scripts/qc/camp01-authority-receipt.mjs:115-119` (comment at :115-117, function at :119), `runLogicalCommand`, resolves `npmCli` by joining the directory of `process.execPath` with `node_modules`, `npm`, `bin`, `npm-cli.js` — i.e. it looks for the npm CLI beside the node executable; if that path does not exist it calls `fail(verified npm CLI unavailable)`, the exact string named in the charter and in the reported CI failure. The same function also reads `process.env.SystemRoot` and `process.env.ComSpec` and calls `fail(verified Windows environment unavailable)` if either is missing, and it builds the child `PATH` by joining the executable directory and the System32 directory with a semicolon — the Windows path-list separator, not the POSIX colon. All three are Windows-only preconditions in the one function the writer-runner rows exercise; a Linux runner has none of them (npm is not colocated with node's own directory on typical Linux installs, and `SystemRoot`/`ComSpec` do not exist there), so the function fails fast on Linux rather than running the writer at all.

`openspec/changes/add-saved-custom-unit-campaign-roster/tasks.md:5` (task P.3) reads: "Pin Windows proof bootstrap to npm ci --fund=false --audit=false over the target package-lock.json, Node 22.22.0, npm 11.6.2, resolved System32 cmd.exe, process.execPath, the verified npm CLI, and a row-declared child environment." This names the Windows proof setup as the task's own contract. `grep -in portab openspec/changes/add-saved-custom-unit-campaign-roster/tasks.md` returned exit 1 (no match) — the task sentence does not name portability anywhere.

Is gating the tests, rather than making the runner portable, the right least change for this unit: yes. Task P.3 pins the writer's default runner to a Windows bootstrap as its stated contract (System32 cmd.exe, npm CLI colocated with process.execPath, no portability language anywhere in the task). Making the runner cross-platform would mean rewriting that pinned contract — a materially larger change outside the scope of a CI-failure-driven test-gating fix. Gating the three rows to win32 is the least change that (a) keeps the assertions exercised wherever the code under test can actually execute, (b) touches no product file (confirmed by Q1's diff --stat showing only the two test files), and (c) does not invent a new portable code path that P.3 never asked for.

### Q3 — consequence of the Linux-CI skip

On Linux CI the camp-00 pass-through row and the camp-00-only limit row (inside the now-windowsDescribe-gated block) report as skipped rather than run, so whatever mutants they would catch (the unit's earlier receipt names these M1 and M4) are only killed when CI runs on a Windows runner.

Acceptable for this unit because the runner under test fails fast and by design on Linux (per Q2's three Windows-only preconditions), so a Linux run of these rows could only ever exercise the failure branch, not the pass-through/limit behavior they are written to prove — there is no meaningful "run on Linux" for this runner today. A later unit would need to make the writer's default runner (or an alternate runner selected on non-Windows) actually portable — replacing the node-colocated npm-CLI lookup, the SystemRoot/ComSpec requirement, and the semicolon-joined PATH with a cross-platform equivalent — before these two rows, and their M1/M4 coverage, could run in Linux CI.

### Q4 — suite counts, oxfmt, lint:units

`npx jest scripts/__tests__/camp01-authority-receipt-writer.test.ts scripts/__tests__/camp01-camp00-listener-adapter.test.ts` (run on this Windows box, so the gated rows executed rather than skipped):

```
PASS unit scripts/__tests__/camp01-camp00-listener-adapter.test.ts
PASS unit scripts/__tests__/camp01-authority-receipt-writer.test.ts (12.867 s)
Test Suites: 2 passed, 2 total
Tests:       70 passed, 70 total
```

`npx oxfmt --check` on the two changed test files: exit 0, "All matched files use the correct format." (2 files, 45ms).

`npm run --silent lint:units`: exit 0, last line `LINT_UNITS_PASS 17899/17899` (same count as the original head's review). `package.json` line 19, the scripts entry: `"lint:units": "node scripts/qc/lint-units.mjs",`.

### Verdict (delta): APPROVE
