# Lane A review: U41
reviewedHead: b3e71a0c9600e816bcc2c481ee8f1a2a25bc0908
baseline: de207e4f19ff535727924844957ef89703f8eef8 (rebased)
reviewerModel: claude-sonnet (Agent model: sonnet, lean-worker)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — exit 0.
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u41-review f1d530c665d3a4e4f633be9046bd4d3cb0353ffd` — exit 0, "HEAD is now at f1d530c66".
- `node_modules` junctioned to the root checkout via PowerShell `New-Item -ItemType Junction`.
- `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH` — `node --version` → v22.22.0. `npm_config_dry_run=true` set for the session; no npm install/ci/prune/build/Playwright/--github run at any point.
- Cleanup performed at the end: deleted the `node_modules` junction with `[System.IO.Directory]::Delete(...)`, then `git worktree remove --force` (both confirmed below).
- origin/main's `units.json` shows U41 `state: "local-verified"` (the parent's fold had already landed), so receipts were read from `origin/main`, not the implementer's worktree, per the charter's fallback rule.

## Files on the range

`git diff origin/main...f1d530c665d3a4e4f633be9046bd4d3cb0353ffd --stat`: exactly 5 files, all under `openspec/planning/2026-09-12-roadmap-completion/`: `DELIVERY.md` (+1/-1), `GOAL.md` (+1/-1), `units.json` (+50/-0), `validate-roadmap.mjs` (+66/-7), `validate-roadmap.test.mjs` (+99/-7). No file outside the ownership path.

## Check-by-check (Q1)

1. **expectedReds ↔ runtime.failedRows one-to-one (validate-roadmap.mjs:373-380)**: `e2eIds()` (line 100) extracts the first `\bE2E-\d+\b` per entry and sorts both lists; `same()` (line 72, `JSON.stringify` equality) compares them, and the code explicitly fails if either list contains an `undefined` (no E2E id found) or the sorted arrays differ — this catches an extra row, a missing row, and a duplicate (duplicates survive the sort so a mismatched count via duplication changes the stringified array). Verified against the real ledger: only U3 (2026-09-17, has `failedRows` of length 3 matching `expectedReds` length 3, ids E2E-01/E2E-02/E2E-16) and U15b (2026-09-17, no `failedRows`) are red among the 62 mainProof receipts (independently scanned all 62 `evidence/*mainproof*.json` files, `node -e` script, output: "red receipts found: 2"). This matches the red receipt's claim exactly.
2. **parseProofLine (validate-roadmap.mjs:87-95)** — three shapes:
   - Ladder: `/^(?:.+?:\s*)?(\d+) failed \/ (\d+) passed$/` → returns N (group 1).
   - Jest: `/^(?:.+?:\s*)?Tests:\s+((?:\d+ (?:failed|skipped|todo|passed), )+)\d+ total$/` → returns the first `K failed` inside the captured group, 0 if absent.
   - Bare "N passed (...)" : `/^(?:.+?:\s*)?(\d+) passed(?:\s+\(([^)]*)\))?$/` → sums every `K failed` inside the parens, 0 if none.
   - Ran `parseProofLine` on the exact `runtime.playwright` lines pulled from the actual evidence files for U16, U22, U35h, U36, U37, U39, U40, U86, U87, U95, U96 (read via `node -e` against `evidence/u*-mainproof-*.json`): all 11 parse and all return `0` (all are green receipts) — U16 "9 passed (node --test, 0 failed...)" → 0; U22 "... 12 passed (privacy-pack 8, proposal-pack 2, two-process 2, each 0 failed, exit 0)" → 0; U35h "1265 passed (jest 1253 passed and 10 skipped of 1263, exit 0; ... all with 0 failed)" → 0; U36 "Tests: 384 passed, 384 total" → 0; U37/U39/U40/U86/U87/U95/U96 all "N passed (jest N, 0 failed, exit 0; ...)" → 0. No shape rejected.
3. **Sensitive class ⇒ packet in blocks from local-verified (validate-roadmap.mjs:459-461)**: `SENSITIVE_REVIEW_CLASSES = ['authority', 'privacy', 'migration', 'replay', 'idempotency', 'concurrency']` (line 26) is byte-identical, same order, to DELIVERY.md:11's Lane B list ("required for authority, privacy, migration, replay, idempotency, and concurrency changes"). `STATE_RANK` (lines 44-58) matches DELIVERY.md's allowed-states list order; `local-verified` = 3 < `merged` = 7, so the new check fires strictly earlier than the pre-existing ruling-at-merged+ check. Confirmed `PK-u92-ruling` (`blocks: ["U92"]`, `decision: null`, `ruling: null`, opened "at fold ... before the ruling") satisfies the check's `packets.some(...)` condition with no decision/ruling required — matches the design note.
4. **--git ownership diff (validate-roadmap.mjs:539-557)**: uses `${unit.mergeSha}^1` as the base — i.e. the squash commit against its own first parent, not `unit.baseline..mergeSha` (which the red receipt shows would pull in 55 of 62 other units' merges). Grepped all 62 `mergeSha` values in `units.json` for parent count via `git rev-list --parents -n1 <sha>`: every one has exactly 1 parent — no two-parent merge commit exists in the ledger today, so the "first-parent-only" approach is not exercised against a real merge commit; this is a latent gap (see Findings). `EVIDENCE_PREFIX` is derived from `planningDir` (the real `2026-09-12-roadmap-completion` directory) and every numstat row starting with it is skipped. `exceptions` is read as `unit.ownershipExceptions` inside the per-unit loop, so a path recorded for one unit cannot excuse another by construction — independently confirmed by mutation test (Q2 below): removing every unit's exceptions in a copy produced exactly the 20 unit+path pairs recorded, one for one, no leakage, no spillover.
5. **finisherModel === reviewerModel (validate-roadmap.mjs:449)**: `if (hasValue(receipts.review.finisherModel) && receipts.review.finisherModel === reviewerModel) fail(...)` — an absent `finisherModel` short-circuits `hasValue` to false, so the check passes silently when the field is absent (matches "say what happens when the field is absent: pass"). The red receipt states no existing review receipt carries `finisherModel`, so this check is currently a no-op on history, consistent.
6. **Cap counting (validate-roadmap.mjs:83-86, 550-556)**: `UNCOUNTED_FILES` has 9 regexes — 6 "generated" (`package-lock.json`, `.next/`, `__snapshots__/`, `*.snap`, `public/data/`, `src/types/contracts/generated/`) + 3 "test" (`__tests__/`, `e2e/`, `*.test.*`/`*.spec.*`) — byte-for-byte the same 9 patterns named in GOAL.md:56 and DELIVERY.md:8, which are identical sentences (diffed with `git diff` — the only difference between the two files' changed lines is this one inserted sentence, same text in both). No pattern in one and not the other.

## History probes (Q2)

- `node validate-roadmap.mjs` (evidence, default), `--git`, `--next` on the real ledger in the worktree: all three print `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` (evidence/--git) or `U41` (--next), exit 0.
- **Result line 1**: with a COPY of `units.json` (never the tracked file — built a sibling `roadmap.json`/`units.json` pair under `.review-tmp/mut/`, reusing the real `validate-roadmap.mjs`, `DELIVERY.md`, and `evidence/` so `EVIDENCE_PREFIX`/`ownershipPaths` still resolve against the real `openspec/planning/2026-09-12-roadmap-completion` path) with every `ownershipExceptions` array and U17b's `capException` stripped, `--no-evidence --git` produced exactly **21 failures**: 20 "touches `<file>` outside its ownershipPaths and ownershipExceptions" lines and exactly one "U17b merge a96d6ec78 counts 707 added non-generated, non-test lines over its cap of 500".
- **Result line 2**: programmatically diffed the 20 "touches" failures against the 20 recorded `(unit, path)` pairs in `units.json` — exact set match (`node -e` script, output "parsed count 20 recorded count 20 / match true"). No other failure appeared and none of the 20+1 was missing.

## Cutover probe (Q3)

- The gate is `String(proof.at) < FAILED_ROWS_CUTOVER` ('2026-09-27'), read from the individual mainProof receipt's own `at` field.
- Built a second rig (same technique: real script/evidence dir, copied `units.json` + one mutated `evidence/u15b-mainproof-20260917.json`). With U15b's receipt unmodified (`at: 2026-09-17...`), evidence-mode run: `ROADMAP VALIDATION PASSED...`, exit 0. With only its `at` changed to `2026-09-27T00:00:00.000Z` (nothing else touched), the same run failed with exactly one error: `U15b mainProof reports 2 failed row(s) without a runtime.failedRows array`.
- Confirmed the closure tool (`scripts/qc/roadmap-unit-closure.mjs:301` computes `failedRows` count from the runtime line; `:328` writes `expectedReds` at the top level; `runtime.failedRows` is populated **only** via `...(options.extraRuntime ? readJson(options.extraRuntime) : {})`, i.e. only when `--extra-runtime` is passed) never itself writes `runtime.failedRows`. This means no red mainProof produced by the closure tool today (from 2026-09-27 on) can satisfy check (1) without `--extra-runtime`. This is recorded in U41's own local receipt findings ("the closure tool never writes runtime.failedRows... a scripts/qc successor"), not hidden — confirmed by reading the receipt and independently confirming the gap in the closure tool's source.

## Red reproduction (Q4)

- Baseline `validate-roadmap.mjs` restored from `de207e4f19ff535727924844957ef89703f8eef8` (`sha256sum` → `4aad5c34afce...786ba0`, matches the red receipt's `validatorUnderTest.sha256` exactly) placed beside the head's `validate-roadmap.test.mjs`.
- `node --test validate-roadmap.test.mjs`: **9 pass, 8 fail** (matches the red receipt's `counts: {tests:17, pass:9, fail:8}` exactly).
- Tests 10, 11, 12, 14, 15, 16, 17 all fail with `expected a failing exit, got 0: ROADMAP VALIDATION PASSED...` — the baseline validator wrongly *accepts* (exits 0) fixtures that should be rejected.
- Test 13 ("(2) a jest red summary parses and its failed count is held to expectedReds") fails differently: `The input did not match .../F1 mainProof receipt reports 1 failed row\(s\) without an expectedReds array/. Input: '... F1 mainProof receipt runtime.playwright is not a ladder or jest result: jest pin: Tests: 1 failed, 2 skipped, 11 passed, 14 total\n'` — the baseline validator does reject the fixture, but for the wrong reason (it can't parse the jest-red shape at all, rather than correctly counting the failure and enforcing expectedReds).
- This exactly matches the red receipt's claim: "10 to 12 and 14 to 17 accepted... 13 rejected for the wrong reason".
- Restored `validate-roadmap.mjs` to the head copy; `sha256sum` → `65bd2b258c3f5da5fdf43bf19b00f384982d5fbca15124abf0a7c0d114b0317b`, matches the head blob and the local receipt's file hash exactly. `node --test` on the restored head: 17 pass, 0 fail.

## Independent mutant (Q5, not one of the receipt's six)

- Mutated `validate-roadmap.mjs:459` from `rank >= STATE_RANK['local-verified']` to `rank > STATE_RANK['local-verified']` (an off-by-one on check (3)'s state boundary — distinct from the six named mutants, which are one per check's core assertion).
- `node --test`: exactly test 14 ("(3) a sensitive unit at local-verified with no packet naming it in blocks fails") failed; 16 pass, 1 fail. Killed as expected.
- Restored; `sha256sum` confirmed `65bd2b258c3f5da5fdf43bf19b00f384982d5fbca15124abf0a7c0d114b0317b` again, `node --test` back to 17/17.

## Gates (Q6)

| Gate | Command | Result |
|---|---|---|
| node --test | `node --test openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.test.mjs` | `# tests 17`, `# pass 17`, `# fail 0`, exit 0 |
| jest | `npx jest scripts/__tests__/roadmap-` | `Test Suites: 2 passed, 2 total`, `Tests: 43 passed, 43 total`, exit 0 |
| tsc | `npx tsc --noEmit` | no output, exit 0 |
| oxlint | `npx oxlint` | `Found 84 warnings and 0 errors` |
| qc:openspec-ci | `npm run --silent qc:openspec-ci:validate` | `[qc:openspec-ci] ... errors=0`, exit 0 |
| validator (evidence) | `node validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows`, exit 0 |
| validator --git | `node validate-roadmap.mjs --git` | same PASS line, exit 0 |
| validator --next | `node validate-roadmap.mjs --next` | `U41`, exit 0 |

All match the local receipt's claimed counts (17/0, 43, tsc 0, oxlint 84/0, qc errors=0) exactly.

## Cap (Q7)

- `git diff --numstat --no-renames origin/main...f1d530c665d3a4e4f633be9046bd4d3cb0353ffd`: DELIVERY.md +1, GOAL.md +1, units.json +50, validate-roadmap.mjs +66, validate-roadmap.test.mjs +99.
- Applying the new counting rule to this very diff: `validate-roadmap.test.mjs` matches the test pattern `\.(test|spec)\.[cm]?[jt]sx?$` (`.test.mjs`) and is excluded. Remaining: 50 (units.json) + 66 (validate-roadmap.mjs) + 1 (DELIVERY.md) + 1 (GOAL.md) = **118**, matching the local receipt's "118 non-test added lines" exactly, well under the 500 cap.
- `git diff origin/main...f1d530c665d3a4e4f633be9046bd4d3cb0353ffd | grep -E '^\+'` for `claude|anthropic|co-authored|generated by` and for `C:\\|/home/|/Users/`: no matches among added lines (the only hits were in unrelated pre-existing context lines quoting CLAUDE.md's own "no AI attribution" rule and GOAL.md's own Node-22 PATH example, both untouched).
- Function/behavior comments checked against the code beneath them: the `parseProofLine` comment (validate-roadmap.mjs:82-86), the `FAILED_ROWS_CUTOVER` comment (:98-99, independently confirmed against all 62 mainProof receipts — only U3 and U15b are red, only U15b lacks `failedRows`), the `e2eIds` comment (:100), the `UNCOUNTED_FILES` comment (:101-102, confirmed identical to GOAL.md:56/DELIVERY.md:8 verbatim), the check-(1) comment (:373-374), check-(3) comment (:457-458), check-(5) comment (:448), and the check-(4)/(6) block comment (:534-539) each match what the code beneath them does; none over-claims.

## Findings

1. **(Low, informational) `<mergeSha>^1` assumes a single-parent (squash) merge with no runtime guard.** `validate-roadmap.mjs:541` (`execFileSync('git', ['diff', ..., \`${unit.mergeSha}^1\`, unit.mergeSha], ...)`) unconditionally takes the first parent. Grepped all 62 `mergeSha` values in the ledger (`git rev-list --parents -n1 <sha>` for each): every one has exactly 1 parent, so this is not live today, but the code has no assertion that `mergeSha` is a squash commit — a future two-parent merge commit would silently diff against only its first parent rather than fail loudly. Not a defect against current data; worth a one-line guard in a successor unit, not a blocker for U41.
2. **(Informational, already disclosed) The closure tool never writes `runtime.failedRows`.** Confirmed independently (`scripts/qc/roadmap-unit-closure.mjs:301-328`): `failedRows` only appears via `--extra-runtime`. This means check (1) cannot be satisfied by a same-day closure run on any red produced after 2026-09-27 without that flag. U41's own local receipt already names this as a finding for a scripts/qc successor; it is not hidden, and it is outside U41's stated scope (validate-roadmap.mjs + its tests + docs, not the closure tool).
3. **(Informational) `validate-roadmap.test.mjs` has no CI caller.** Grepped `.github/`, `package.json`, `scripts/` for the filename: no hits. This matches the local receipt's own "NON-CLAIMS" disclosure and is consistent with the charter's instruction that this review only runs `node --test`, the validator, and `npx jest scripts/__tests__/roadmap-*` locally.
4. **(Informational) The reviewed head's `units.json` sha256 does not match the local receipt's claimed `989b98e0...` hash**, nor does it match origin/main's post-fold `units.json`. Explained by file size: the reviewed head's copy (788,553 bytes) predates several parent-fold commits that landed on top of it on `origin/main` (`bb1f30474`, `95f80aa94`, ...; 792,490 bytes on origin/main) — i.e. the local receipt's hash was very likely taken at a different point in the branch's history before the final rebase. Doesn't affect the correctness of the reviewed diff itself (confirmed identical via `git diff origin/main...<head>`), but is a receipt-hygiene nit, not a functional defect.

No findings block merge; all are informational/low-severity and either already disclosed by the implementer or latent (not exercised by current data).

## Verdict rationale

All six checks were read at their exact `file:line` and independently exercised: parseProofLine was run against real receipt lines for all 11 named units and returned the correct 0 for every shape; the E2E-id one-to-one comparison was confirmed against the only two red receipts in the ledger (U3, U15b); the sensitive-class-at-local-verified check's design (packet named regardless of ruling) was confirmed against the real `PK-u92-ruling`/`PK-u96-ruling` packets; the ownership/cap `--git` check was proven, via a from-scratch mutation of a *copy* of `units.json` (never the tracked file), to fail exactly the 20 recorded exception paths and exactly U17b's 707-line cap exception, nothing more, nothing less; the cutover date gate was proven with a minimal single-field mutation of a copy of U15b's own receipt; the red-state reproduction against the literal baseline blob matched the red receipt's per-test claims exactly, including the "wrong reason" nuance on test 13; an independently chosen mutant (not one of the receipt's six) was killed by the same test file; every required gate matches the receipt's claimed counts; the cap counting rule was independently recomputed on the live diff and landed on the same 118 lines the receipt claims; and no added line carries AI attribution or an absolute machine path. The only findings are informational/latent and are either already disclosed by the implementer or do not affect current data. APPROVE.

## Delta review (re-cut head b3e71a0c9600e816bcc2c481ee8f1a2a25bc0908)

reviewedHeadDelta: b3e71a0c9600e816bcc2c481ee8f1a2a25bc0908

### Setup

- `git -C E:/Projects/MekStation fetch origin` — exit 0 (no new output).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u41-review2 b3e71a0c9600e816bcc2c481ee8f1a2a25bc0908` — exit 0, "HEAD is now at b3e71a0c9 docs(roadmap): validate-roadmap checks what receipts say...".
- `node_modules` junctioned via PowerShell `New-Item -ItemType Junction`; `npm_config_dry_run=true` set for the session; no npm install/ci/prune/build/Playwright at any point.
- Cleanup performed at the end: `[System.IO.Directory]::Delete(...)` on the junction, then `git worktree remove --force` — confirmed removed from `git worktree list` afterward (only `u41`, `u42`, `u89` remain, no `u41-review2`).

### Q1 — content identity

`--stat` lines, byte-identical between old and new head's own commit diff:

```
=== OLD stat (f1d530c665d^..f1d530c665d) ===
 .../2026-09-12-roadmap-completion/DELIVERY.md      |   2 +-
 .../planning/2026-09-12-roadmap-completion/GOAL.md |   2 +-
 .../2026-09-12-roadmap-completion/units.json       |  50 ++++++++++
 .../validate-roadmap.mjs                           |  73 ++++++++++++--
 .../validate-roadmap.test.mjs                      | 106 +++++++++++++++++++--
 5 files changed, 217 insertions(+), 16 deletions(-)
=== NEW stat (b3e71a0c9^..b3e71a0c9) ===
 .../2026-09-12-roadmap-completion/DELIVERY.md      |   2 +-
 .../planning/2026-09-12-roadmap-completion/GOAL.md |   2 +-
 .../2026-09-12-roadmap-completion/units.json       |  50 ++++++++++
 .../validate-roadmap.mjs                           |  73 ++++++++++++--
 .../validate-roadmap.test.mjs                      | 106 +++++++++++++++++++--
 5 files changed, 217 insertions(+), 16 deletions(-)
```

`diff <(git diff <old>^..<old> -- <file>) <(git diff <new>^..<new> -- <file>)` produced **empty output (exit 0, no diff of the diffs)** for each of `validate-roadmap.mjs`, `validate-roadmap.test.mjs`, `GOAL.md`, `DELIVERY.md` — the hunks are byte-identical between the two heads.

`units.json`'s own-commit diff (`git diff b3e71a0c9^..b3e71a0c9 -- .../units.json --stat`) shows the same 50 inserted lines as the reviewed head: 13 blocks adding an `ownershipExceptions` array (5 blocks of 2 items on the harden-gm-two-player-campaign-sessions units, 2 more single-item blocks on that same group, then 6 single/multi-item blocks on rewindPreviewRoute/rewindCommitRoute/lobby-roomcode(x2)/useGmCorrectionProducers+useGmRewindProducers/campaignCommandsRoute units — 13 `ownershipExceptions` additions total) plus one `capException: { countedLines: 707, recordedBy: "U41 (historical, measured at admission)" }` on U17b's ledger entry — the same fields the old head added, now applied as a diff against the current ledger (which already carries U41's own fold and later units' folds, so the surrounding context/line numbers differ but the added content is the same).

### Q2 — validator + tests on the head

```
=== evidence mode ===
ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows
exit=0
=== --git ===
ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows
exit=0
=== --next ===
U89
exit=0
```

Note: `--next` now prints `U89` (not `U41`) because on this ledger U41 is already folded as complete and U89 is the next open unit — this differs from the original review's `--next` output (`U41`) only because the ledger has moved on, not because of any behavior change in the validator itself.

```
node --test openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.test.mjs
1..17
# tests 17
# suites 0
# pass 17
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

### Q3 — parent vs current main

- `git rev-parse b3e71a0c9600e816bcc2c481ee8f1a2a25bc0908^` → `0dc74d7e702cac668eb44c3ad131cb7e8230d4b2`
- `git rev-parse origin/main` (after `git fetch origin`) → `0dc74d7e702cac668eb44c3ad131cb7e8230d4b2`

Equal — the head's parent is exactly current `origin/main` at review time; no re-cut needed.

Verdict (delta): APPROVE
