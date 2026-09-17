# Lane A review: U16
reviewedHead: 356f2037590cea2e8ab1ce11568ed8fa792dd17c
baseline: 4bcd6f8d5fa752270d40ed331423b37f89c15f8a
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — ran, no output (up to date).
- Leftover worktrees confirmed present and untouched: `worktrees/u15b-review` (30c81495c), `worktrees/u4` (9913f06e7) — no `worktrees/u16` existed, so no collision.
- Created `git worktree add --detach E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u16-review 356f2037590cea2e8ab1ce11568ed8fa792dd17c` — succeeded, HEAD at `356f20375`.
- Junctioned `node_modules` via `cmd /c mklink /J <worktree>\node_modules E:\Projects\MekStation\node_modules` (required `MSYS_NO_PATHCONV=1` to stop Git Bash mangling the Windows paths) — junction created successfully.
- `export npm_config_dry_run=true` set in every shell before any npm command. No `npm install/ci/prune`, no build, no Playwright, no commit, no edits to the root checkout. All probes below ran inside the review worktree or against throwaway `os.tmpdir()` fixtures.
- Node 22 confirmed: `node --version` → `v22.22.0`.

## Files on the range

`git diff --numstat 4bcd6f8d5..356f20375`:

```
79  0  evidence/u16-admission-20260917.json
203 0  evidence/u16-local-20260917.json
69  0  evidence/u16-red-20260917.json
5   1  evidence/u3-mainproof-20260917.json
86  2  validate-roadmap.mjs
249 0  validate-roadmap.test.mjs
```

All 6 files live under `openspec/planning/2026-09-12-roadmap-completion/` (verified: `git diff --name-only ... | grep -v '^openspec/planning/2026-09-12-roadmap-completion/'` printed nothing). `units.json`, `roadmap.json` and `evidence/admission-snapshot.json` do not appear in the file list (verified by grep — no hits).

## Findings

1. **[Info] Strengthening only, no removed or weakened check.** Read the full `validate-roadmap.mjs` diff hunk by hunk (`git diff 4bcd6f8d5..356f20375 -- .../validate-roadmap.mjs`). The only two deleted lines are the `inFlightPaths` `Set` construction and the old `pathFree` line, both immediately replaced by strictly more permissive-refusing equivalents (array + `pathsOverlap`, a superset of exact-string equality — see Finding 4). No existing `fail(...)` call, message string or exit path was deleted, reworded to be milder, or reordered before an earlier check. New failure messages introduced (12, all additive):
   - `${label}.stageReceipts.${stage} path does not exist: ${value.path}`
   - `${label} mainProof receipt is not readable JSON: ${receipts.mainProof.path}`
   - `${label} mainProof receipt runtime.playwright is not a ladder or jest result: ...`
   - `${label} mainProof receipt reports ${failedRows} failed row(s) without an expectedReds array`
   - `${label} mainProof expectedReds has ${n} entr(y/ies) but the run reports ${failedRows} failed row(s)`
   - `${label} mainProof expectedReds has an entry that is not a non-empty string naming a red row`
   - `${unit.id} carries sensitive classes and is ${unit.state} but its merge receipt names no PR number`
   - `${unit.id} merge receipt has no 40-hex head to bind an owner ruling to`
   - `${unit.id} PR #${pr} could not be read with gh, so its owner ruling is unproved`
   - `${unit.id} PR #${pr} is ${view.state}, not MERGED`
   - `${unit.id} PR #${pr} does not carry the owner-ruled label`
   - `${unit.id} PR #${pr} has no comment containing OWNER-RULING ${head}`
   Default is evidence ON: `const wantEvidence = !argv.includes('--no-evidence');` (line ~21) — `--no-evidence` is the only opt-out and prints `NOTICE: evidence mode is off (--no-evidence); ...` to stderr. Confirmed live: `node validate-roadmap.mjs --no-evidence` on the real ledger printed that exact notice line then `ROADMAP VALIDATION PASSED`, exit 0.

2. **[Info] Evidence mode: all four constructed fixture cases behave as claimed.** Built each fixture in a fresh `os.tmpdir()` directory (never the worktree's real `evidence/`), running the exact head validator as a child process:
   - Missing receipt path (`stageReceipts.admission.path` = a nonexistent file): `ROADMAP VALIDATION FAILED (1 issue)` / `F1.stageReceipts.admission path does not exist: evidence/f1-does-not-exist.json`, exit 1. (= pinned test 1, reran via `node --test`, `ok 1`.)
   - `mainProof.runtime.playwright` in each accepted form, no failures — `'  1 passed (30.8s)'`, `'evidence-smoke:   1 passed (12.1s)'`, `'token-pack:   2 passed (1.7m)'`, `'jest machine-idle pin: Tests:       62 passed, 62 total'` — all four parse to 0 failed rows and the fixture passes (pinned test 6, `ok 6`).
   - Ladder form **with** failures, `'authority: 1 failed / 17 passed'`, no `expectedReds`: `F1 mainProof receipt reports 1 failed row(s) without an expectedReds array`, exit 1 (pinned test 3, `ok 3`). Same line with a one-entry `expectedReds`: `ROADMAP VALIDATION PASSED`, exit 0 (pinned test 4, `ok 4`).
   - `expectedReds` of the wrong length (`'authority: 3 failed / 17 passed'` with a 1-entry array): `F1 mainProof expectedReds has 1 entr(y/ies) but the run reports 3 failed row(s)`, exit 1 (pinned test 5, `ok 5`).
   - **Independently constructed (not in the pin):** a docs-class unit, `main-verified`, `mainProof.runtime.playwright = 'this is not a proof line at all'` (unparseable). First attempt with `ownershipPaths: ['e2e']` failed on an unrelated pre-existing check (`F1.ciClass is docs but its ownership paths derive product`); retried with `ownershipPaths: ['openspec/planning/2026-09-12-roadmap-completion']` (a genuinely docs-shaped path) → `ROADMAP VALIDATION PASSED`, exit 0. Confirms the mainProof proof-line parse rule is gated to `unit.ciClass === 'product'` only, so a docs-class unit's unparseable/absent runtime line is exempt exactly as claimed.
   - U3 backfill: `git diff 4bcd6f8d5..356f20375 -- evidence/u3-mainproof-20260917.json` shows exactly one field changed — `expectedReds` from a prose string to a 3-entry array (`+5/-1`, matching the claimed numstat exactly). No other key in the file was touched.

3. **[Info] `--github`.** Ran on the real ledger with `gh` authenticated (`gh auth status` confirmed logged in as SwiggitySwerve): `node validate-roadmap.mjs --github` → `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows`, exit 0. Ran again with `PATH` restricted to only the Node directory (no `gh` reachable): `NOTICE: gh is not available or refused the query, so --github cannot prove any owner ruling (spawnSync gh ENOENT)` then `ROADMAP VALIDATION FAILED (1 issue)` / `- U3 PR #1797 could not be read with gh, so its owner ruling is unproved`, exit 1. Read the code path (`validate-roadmap.mjs` ~line 511-538): it selects units whose `reviewClasses` intersect the sensitive set and whose `STATE_RANK[unit.state] >= STATE_RANK.merged`; requires `merge.pr` and a 40-hex `merge.head`; calls `gh pr view <pr> --json state,labels,comments`; requires `view.state === 'MERGED'`, `labels.includes('owner-ruled')`, and some comment body containing `OWNER-RULING <exact 40-hex head>`. The `catch` block on the `gh` call always calls `fail(...)` before `continue` — there is no path where a `gh` error, a missing field, or an unexpected JSON shape falls through to a pass; every branch either fails explicitly or requires the positive condition. On this baseline the only sensitive unit at rank ≥ merged is U3 (verified via `units.json`: `reviewClasses: ["idempotency","replay","concurrency"]`, `merge.pr: 1797`, `merge.head: 935fe0423e9eef2c806ab8b4e012c9a9a8d6c929`), matching the council decision doc's independently-verified PR #1797 / head 935fe0423 / label `owner-ruled` / comment 5710327985.

4. **[Info] `pathFree` (prefix-containment).** Ran `--next` on the real ledger with both the baseline and head validator: swapped the baseline validator's exact source into the worktree file in place (`git show 4bcd6f8d5:.../validate-roadmap.mjs > validate-roadmap.mjs`), ran `--next` → `U16`, exit 0; restored the head file from a backup copy and confirmed `sha256sum` identical before/after (`4aad5c34afce298291b376145a36f3076004fc58086019ed3a08def173786ba0`) and `git status --short` clean. Re-ran head validator `--next` → `U16` again. **Confirmed: the implementer's claim that the pathFree strengthening is latent at this baseline is correct** — both validators pick the same unit, because U15a already holds `src/lib/multiplayer/server` exactly, so the two units the prefix rule would newly block (U5a, U10) are already blocked by the old exact-string test.
   Extracted the exact `normalisePath`/`pathsOverlap` source (verbatim, via `sed -n '74,80p'` on the head file) and evaluated it standalone (a full validator run of a `src/libx` fixture is blocked by an unrelated, pre-existing check requiring ownership paths to exist on disk, and no `src/libx` directory exists in this repo — noted as a harness limitation, not a defect): `pathsOverlap('src/lib','src/lib/multiplayer/server')` → `true`; reverse → `true`; `pathsOverlap('src/lib','src/libx')` → `false`; reverse → `false`; `pathsOverlap('src/lib','src/lib')` → `true`. This matches the pinned `--next` fixture test (`FA` local-verified at `src/lib`, `FB` planned at `src/lib/multiplayer/server`, `FC` planned at `e2e` → validator picks `FC`, skipping `FB`), independently reran via `node --test` (`ok 8`).

5. **[Info] Independent mutant reproduction.** Chose a mutant distinct from the implementer's own 5-mutant table: in `parseProofLine`, changed `if (ladderRed) return Number(ladderRed[1]);` to `return Number(ladderRed[2]);` (returns the *passed* count instead of the *failed* count). Backed up the file first (`sha256sum` before mutation: `4aad5c34afce298291b376145a36f3076004fc58086019ed3a08def173786ba0` — this matches the implementer's own recorded `preMutantSha256` in `evidence/u16-local-20260917.json`, confirming I reviewed the byte-identical file). Ran `node --test validate-roadmap.test.mjs`: `# tests 9 / # pass 6 / # fail 3`, with `not ok 3`, `not ok 4`, `not ok 5` — the three cases that assert on failed-row counts and `expectedReds` length (tests 1, 2, 6, 7, 8, 9 still pass, since they don't exercise a nonzero-failure ladder line). Restored the file from the backup; `sha256sum` afterward: `4aad5c34afce298291b376145a36f3076004fc58086019ed3a08def173786ba0` (identical), `git status --short` and `git diff --stat` on the file both empty.

6. **[Info] Non-blocking notes carried forward from the implementer's own receipt, independently confirmed true (not new findings, not blocking):**
   - `oxfmt --check` on the two changed `.mjs` files: `npx oxfmt --check validate-roadmap.mjs validate-roadmap.test.mjs` → `Expected at least one target file`, exit 2. Confirmed `.oxfmtignore` line 11 is the bare entry `openspec`, so the formatter gate is inapplicable to this unit's paths by pre-existing repository configuration, not a gap introduced by this change.
   - `units.json` line 608 still carries a second, un-normalised copy of U3's `expectedReds` as a prose string (inside the ledger's own `stageReceipts.mainProof`), independently confirmed by reading that region of `units.json` directly. `units.json` is outside U16's ownership paths, so this is correctly left untouched and reported rather than fixed.
   - Confirmed no unit's `stageReceipts.<stage>` value in the real ledger is a bare string (106 object receipts, 69 nulls, 0 bare strings, 0 other) — the new evidence check's object-shape guard (`typeof value !== 'object' || Array.isArray(value)`) has no silent-bypass exposure on the current data, even though the guard exists defensively for a shape the ledger doesn't currently contain.

## Gates

| Gate | Command | Last line | Exit |
|---|---|---|---|
| Pin | `node --test .../validate-roadmap.test.mjs` | `# tests 9 / # pass 9 / # fail 0` | 0 |
| Validator, no flags | `node validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |
| Validator, `--no-evidence` | `node validate-roadmap.mjs --no-evidence` | `NOTICE: evidence mode is off...` then `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |
| Validator, `--next` | `node validate-roadmap.mjs --next` | `U16` | 0 |
| Validator, `--git` | `node validate-roadmap.mjs --git` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |
| Validator, `--github` (gh authenticated) | `node validate-roadmap.mjs --github` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |
| Validator, `--github` (PATH without gh) | `PATH=<node-only> node validate-roadmap.mjs --github` | `NOTICE: gh is not available...` then `ROADMAP VALIDATION FAILED (1 issue)` / `U3 PR #1797 could not be read with gh...` | 1 |
| `npm run qc:openspec-ci:validate` | (`npm_config_dry_run=true`) | `[qc:openspec-ci] workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=19/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9 errors=0` | 0 |

## Cap

`git diff --numstat`: validator `+86/-2` (matches claim exactly), `validate-roadmap.test.mjs` new file, `wc -l` = 249 lines (matches claim exactly), U3 receipt `+5/-1` (matches claim exactly). Total files touched: 6 (`git diff --name-only | wc -l`), well under the 15-file cap. All 6 files resolve under `openspec/planning/2026-09-12-roadmap-completion/` (grep for paths outside that prefix returned nothing); `units.json`, `roadmap.json`, `evidence/admission-snapshot.json` do not appear in the changed-file list. `grep -rniE "wroll|C:\\Users|E:\\Projects|/c/Users|/e/Projects|anthropic|claude code|co-authored"` over the two changed code files, and a separate grep over the commit message for `anthropic|claude|co-authored|generated by`, both returned no matches — no absolute machine paths, no AI attribution.

## Verdict rationale

Every review question resolves cleanly against commands I ran myself in an isolated worktree against the exact reviewed head: the diff strengthens only (2 deletions are refactors subsumed by the new, more permissive-refusing logic; 12 new failure messages, 0 removed); evidence mode is default-on with a single announced opt-out and behaves correctly across missing-receipt, all-three proof-line-with/without-failure forms, wrong-length `expectedReds`, and docs-class exemption; `--github` proves MERGED + `owner-ruled` + exact-head `OWNER-RULING` comment through `gh` and fails loudly (never silently passes) when `gh` is unavailable; `pathFree` correctly implements bidirectional directory-boundary prefix containment, correctly excludes `src/libx`, and the implementer's "latent at this baseline" claim is independently confirmed true by running both validator versions against the same real ledger; an independently chosen mutant (distinct from the implementer's own 5) is killed by the pin, and the file was restored byte-identical (sha256-verified, matching the implementer's own pre-mutant hash); all required gates are green on the exact head; and the change stays inside its cap, its ownership path, and touches none of the forbidden ledger files, with no AI attribution or absolute machine paths introduced. No blocking or required-edit findings were found. **APPROVE.**
