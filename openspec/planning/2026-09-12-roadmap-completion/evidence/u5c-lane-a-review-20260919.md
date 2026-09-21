# Lane A review: U5c
reviewedHead: 516d2c2bcf925d2fc5356d0963f2e6d955d6c156
baseline: 09df54a70c744eb17466f28333009d46dbfddeb1
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (clean, no output).
- Confirmed the implementer's own worktree already existed at `.sisyphus/roadmap-completion-20260912/worktrees/u5c` (branch `codex/roadmap-u5c-commit-reason-route-20260919`); left it untouched and created a separate detached worktree at `.sisyphus/roadmap-completion-20260912/worktrees/u5c-review` at `516d2c2bc` via `git worktree add --detach`.
- Junctioned `node_modules` from PowerShell: `New-Item -ItemType Junction -Path '...\worktrees\u5c-review\node_modules' -Target '...\node_modules'` — succeeded.
- `npm_config_dry_run=true` set in the review shell for the whole session; no `npm install`/`ci`/`prune` was run at any point; no build; no Playwright; no commit; every git command used an explicit `-C E:/Projects/MekStation` or ran inside the review worktree.
- Node 22 confirmed: `node -v` → `v22.22.0`, `npm -v` → `11.6.2`.
- Jest suites were run one at a time (reason suite alone, then the two-directory suite, then the exact charter command), never as a single mega-run.
- Cleanup performed at the end of the session (see bottom of this file for the exact commands and their exit codes).

## Files on the range

`git diff --numstat 09df54a70c7..516d2c2bc` (6 files):

| File | + | - |
|---|---|---|
| `openspec/planning/2026-09-12-roadmap-completion/evidence/u5c-admission-20260919.json` | 141 | 0 |
| `openspec/planning/2026-09-12-roadmap-completion/evidence/u5c-local-20260919.json` | 389 | 0 |
| `openspec/planning/2026-09-12-roadmap-completion/evidence/u5c-red-20260919.json` | 99 | 0 |
| `src/__tests__/api/matches/rewindCommitRoute.reason.test.ts` | 477 | 0 |
| `src/pages-modules/api/rewindCommitDeps.ts` | 6 | 1 |
| `src/pages/api/matches/[id]/rewind-commit.ts` | 26 | 2 |

Matches the charter's expected file list exactly (deps guard, route, reason test, three receipts). No `src/lib` file appears on the range (confirmed by the file list above; also re-confirmed by grep, see Gates §5(g)).

## Findings

1. **[INFO] Constant preserved on lease/supersession, GM's text isolated to a new private record — design matches the addendum exactly.** `src/pages/api/matches/[id]/rewind-commit.ts:196-210` still builds the commit input with `reason: REWIND_COMMIT_REASON` unconditionally (object-spread of `...body` happens *before* this key, so even though `body.reason` may be present on the spread object, the literal `reason: REWIND_COMMIT_REASON` line wins — verified by reading the object literal order). On the `committed` arm only (`rewind-commit.ts:212-227`), when `body.reason !== undefined`, the route calls `GmPrivatePreviewRecordWriter.store(...)` with `principalId: viewer.principalId`, `campaignSessionId: matchId`, `commandId: null`, `privateReason: body.reason`, using `new AuthorizedViewerResolver(new HostAsGmMembershipSource(membership, meta.hostPlayerId))` — byte-identical resolver construction to `rewind-preview.ts:227-233`. Probe: ran the full `rewindCommitRoute.reason.test.ts` (21 tests) in my own worktree — all 21 passed, covering exactly this law (see Gates). No severity — this is the core behavior working as designed.

2. **[INFO] Independent mutant reproduction confirms the receipt is honest.** I edited `rewind-commit.ts:208` from `reason: REWIND_COMMIT_REASON` to `reason: body.reason ?? REWIND_COMMIT_REASON` (this is receipt mutant M2: "Pass private body.reason into the commit lease/supersession label") in my own worktree, independent of the implementer's saved mutant copies. Pre-edit sha256 of the file was `275f0edc63b8074f8e36e27dfb887b72dc11f366f29fde69313fa8a1e0687aa2`, matching the receipt's `preSha256` for M2 exactly. Post-edit sha256 was `79165d8a9114ab5ecb06afe001a6a09634c0011f2d47ea193ff99b02baec708e`, matching the receipt's `mutatedSha256` for M2 exactly. Running `npx jest src/__tests__/api/matches/rewindCommitRoute.reason.test.ts --runInBand` against the mutant produced **1 failed, 20 passed** — the failing test was `keeps the constant in committed history even with a private reason`, asserting `committedReason()` toEqual `{ reason: DEFAULT_REASON }`, which failed with the GM's private text instead. This is the exact same count (1) and the same test the receipt's M2 entry names. I then restored the line and re-verified sha256 `275f0edc...` (matches pre-mutant exactly) and `git status --porcelain` on the file (clean). **The receipts' mutant table matches**: M1=2 failed, M2=1 failed, M3=4 failed, M4=1 failed — I independently confirmed M2's count and sha256 chain; M1/M3/M4 counts were read from the receipt and are internally consistent with the PR body's table, but I did not independently re-run those three (time-boxed to one independent mutant per the charter).

3. **[LOW, non-blocking] Absolute machine paths appear in the local receipt, not in product code.** `evidence/u5c-local-20260919.json` records `"savedCopy": "C:\\Users\\wroll\\AppData\\Local\\Temp\\u5c-pass2-evidence-20260919\\M1.saved"` (and M2/M3/M4 siblings) — literal Windows paths under the operator's home directory. Checked whether this is a real product-code violation: `git diff ... -- src/` grepped for `C:\Users`, `/c/Users`, and `wroll` returned **no matches** — the machine path appears only in the evidence JSON, never in shipped code. Checked whether it is even an evidence-convention violation: DELIVERY.md itself instructs receipt-writers to "Record canonical absolute paths and the associated Git worktree ID/ref/HEAD at creation," and the sibling `u5c-admission-20260919.json` records `"worktree": "E:\\Projects\\MekStation\\...\\worktrees\\u5c"` — an absolute path — which is the same pattern used across many other units' admission receipts (`u1`, `u11`, `u12`, `u15b` admission receipts all record `"worktree": "E:\\..."`). Every receipt in this ledger also embeds the operator's username via the mandated Node-version PATH incantation (`export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH`), confirmed present in dozens of other units' receipts by grep. So the M1-M4 `savedCopy` paths add nothing not already ubiquitous in every other receipt in this ledger, and the practice of recording absolute paths in evidence is the documented convention, not a slip. I record this as informational rather than a required edit.

## Boundary (review question 2)

- **Where enforced:** the guard alone, `src/pages-modules/api/rewindCommitDeps.ts:75-78`, inside `isRewindCommitBody`: `!('reason' in body) || (typeof body.reason === 'string' && body.reason.trim().length > 0 && body.reason.trim().length <= 2000)`.
- **Trimming:** applied only for the length/emptiness check, never before the write. The route stores `body.reason` verbatim (untrimmed) into the private record (`rewind-commit.ts:225`, `privateReason: body.reason`). Verified via the existing test `accepts a reason at the trimmed upper boundary without changing its content`, which sends `` ` \t${'x'.repeat(2000)}\n ` `` (2004 raw characters, 2000 after trim) and asserts the stored `payload` equals the *raw padded* string, not the trimmed one — I ran this test and it passed.
- **Exact bound behavior:** a reason whose trimmed length is exactly 2000 passes (`'x'.repeat(2000)` and the padded-2000 case both accepted, 200); a reason whose trimmed length is 2001 (`'x'.repeat(2001)`, and the padded/2001 variant) is refused 400 with no commit. Both directions are covered by the existing `it.each` tables and I confirmed both suites (the accept-boundary and reject-over-long cases) passed in my own run.

## Gates

| Gate | Command | Result |
|---|---|---|
| 1 | `npx jest src/__tests__/api/matches src/pages-modules/api` | **PASS** — `Test Suites: 10 passed, 10 total`, `Tests: 96 passed, 96 total`, last line `Time: 5.013 s`. Matches PR body's claimed "10 suites, 96/96" exactly. |
| 1a | `npx jest src/__tests__/api/matches/rewindCommitRoute.reason.test.ts` (run alone first) | **PASS** — `21 passed, 21 total`. |
| 2 | `npx tsc --noEmit` | **PASS**, exit 0, no output. |
| 3 | `npx oxfmt --check` on the three changed source/test files | **PASS** — "All matched files use the correct format. Finished in 25ms on 3 files using 16 threads.", exit 0. |
| 4 | `npm run lint:units` (ran as `node scripts/qc/lint-units.mjs`, the literal script body) | **PASS** — last line `LINT_UNITS_PASS 100/100`, exit 0. |
| 5 | `npm run qc:openspec-ci:validate` (ran as `node scripts/qc/validate-openspec-ci-quality.mjs`) | **PASS** — `workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=19/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9 errors=0`, exit 0. |
| 6 | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | **PASS** — `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows`, exit 0. Matches PR body's claimed counts exactly. |
| 5(f) | `git diff ... -- rewindCommitDeps.ts rewind-commit.ts \| grep -iE "console\.|logger\."` | **PASS (no matches)**, exit 1 (grep convention: no hit) — the reason is never logged anywhere in the product diff. |
| 5(g) | `git diff --name-only ...` inspected for any `src/lib` path | **PASS (no matches)** — confirmed no `src/lib` file is present in the 6-file change list. |
| — AI attribution | `git log --format='%B' -1 516d2c2bc \| grep -i "co-authored\|claude\|anthropic\|generated with"` | **PASS (no matches)** — commit message contains no AI attribution. |
| — Machine paths in product code | `git diff ... -- src/ \| grep -iE "C:\\\\Users\|/c/Users\|wroll"` | **PASS (no matches)** — machine paths appear only in evidence JSON (see Finding 3), never in `src/`. |

## Cap

- `git diff --numstat` on the two product files: `rewindCommitDeps.ts` +6/-1, `rewind-commit.ts` +26/-2 → **32 lines added, 3 removed**, well under the 500-line cap. PR body's claimed "32 product lines added and 3 removed" matches exactly.
- **6 files total** on the range (2 product, 1 test, 3 receipts) — well under the 15-file cap.
- **Scope**: every changed path is inside `src/pages/api/matches`, `src/pages-modules/api`, `src/__tests__/api/matches`, or the `openspec/planning/.../evidence/` receipts — nothing else touched, no `src/lib` change (re-confirmed above).

## Verdict rationale

The corrected pass-2 design (constant stays on the lease/supersession row; GM's text is written as a separate private record via the existing `GmPrivatePreviewRecordWriter`, reusing the preview route's exact resolver construction, only on the committed arm, only when a reason is supplied) is implemented exactly as the addendum specifies, and I independently verified the load-bearing claims rather than trusting the receipts alone:

- Read the object-literal ordering in `rewind-commit.ts` myself to confirm `REWIND_COMMIT_REASON` cannot be shadowed by `...body`.
- Ran the full 21-test reason suite, the 96-test combined suite, tsc, oxfmt, lint:units, the OpenSpec CI-quality validator, and the roadmap validator myself in a clean, isolated worktree — all six matched the PR body's claimed numbers exactly, with no dry-run/install/build steps taken.
- Independently authored and ran my own copy of mutant M2 (the highest-stakes mutant — leaking the GM's private text into the supersession/lease row), confirmed its pre- and post-mutation sha256 hashes exactly match the receipt's recorded hashes, confirmed it fails exactly 1 test (matching the receipt), and confirmed clean restoration.
- Confirmed the boundary is enforced only in the guard (trim-based check) while storage keeps the untrimmed text, and confirmed both the exact-2000 accept and 2001 reject cases pass.
- Confirmed no `src/lib` file changed, no reason is logged, no AI attribution, and no machine path leaks into shipped code (the one absolute-path observation is confined to an evidence receipt and is the ledger's own documented, ubiquitous convention, not a fresh defect).

No behavior contradicts the E2E-25 server-half law this unit claims. The one finding (Finding 3) is informational and does not affect product behavior, privacy law, or the shipped diff. Recommend **APPROVE**.

## Cleanup

- `[System.IO.Directory]::Delete('E:\Projects\MekStation\.sisyphus\roadmap-completion-20260912\worktrees\u5c-review\node_modules')` — deletes the junction without recursing through the link.
- `git -C E:/Projects/MekStation worktree remove --force E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u5c-review` — removes the review worktree.
- Root checkout (`E:/Projects/MekStation`) and the implementer's own worktree (`.../worktrees/u5c`) were never touched by this review.
