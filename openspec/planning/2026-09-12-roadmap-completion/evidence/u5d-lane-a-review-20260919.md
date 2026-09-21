# Lane A review: U5d
reviewedHead: 08014be1646c7ec7d9aad9cfbfaa569e6a4aa23a
baseline: 66ecd2695f59eb4b420379191a3066db11507cd2
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` run; both `08014be1646c7ec7d9aad9cfbfaa569e6a4aa23a` and `66ecd2695f59eb4b420379191a3066db11507cd2` resolved locally before the worktree was created.
- Detached worktree created at `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u5d-review`, HEAD confirmed at `08014be16` via `git rev-parse HEAD` inside the worktree.
- `node_modules` junctioned from the root checkout via PowerShell `New-Item -ItemType Junction`; `npx jest --version` (29.7.0) confirmed the junction resolves.
- Node 22.22.0 confirmed via `node --version` after prepending the nvm path. `npm_config_dry_run=true` set for the session; no `npm install`/`ci`/`prune`, no build, no Playwright, no commit, and every git/npm/node command was run with cwd or `-C` pinned inside the review worktree — the root checkout was never touched (its working tree was only read, never before this session, and no edit tool ever targeted it).
- Jest suites run one at a time as instructed.
- Cleanup performed at the end of this review (see final section).

## Files on the range

`git diff 66ecd2695..08014be16 --numstat` (run inside the worktree):

```
170  0  openspec/planning/2026-09-12-roadmap-completion/evidence/u5d-admission-20260919.json
354  0  openspec/planning/2026-09-12-roadmap-completion/evidence/u5d-local-20260919.json
49   0  openspec/planning/2026-09-12-roadmap-completion/evidence/u5d-red-20260919.json
94   9  src/lib/multiplayer/client/__tests__/commitGmCombatRewind.test.ts
7    3  src/lib/multiplayer/client/commitGmCombatRewind.ts
```

5 files total, one commit (`08014be16`, author Wes Rollings, no AI-attribution trailer). Only `src/lib/multiplayer/client/commitGmCombatRewind.ts` (product) and its test change inside `src/lib/multiplayer/client`; the other three are the unit's own evidence receipts. Nothing under `src/pages`, `src/pages-modules`, or any e2e path changed — matches the unit's "no route change (U5c) and no e2e row (U2b)" behavior sentence.

sha256 of the two changed source files, measured independently in the worktree, matches the local receipt's `finalContentHashes` exactly:
- `commitGmCombatRewind.ts`: `210d07d9ad636a09f4ce22a3a2a15230da3cd3e64c206cae8f61fd205f4c5813`
- `commitGmCombatRewind.test.ts`: `5aeff3830e38a5a71188ecc45b7988ad5c9aebc431e2b64e1b244f2271b5ae0d`

## Findings

1. **[INFO] Contract verified independently — pass.** I wrote a standalone probe suite (`laneA-probe-commitGmCombatRewind.test.ts`, never committed, deleted before cleanup) exercising (a)-(d) directly against the reviewed head, not reusing the implementer's assertions:
   - (a) `commitGmCombatRewind.ts:45-68` — a non-empty (post-trim) reason is added as a `reason` key after the five existing keys; probe asserted key order `[targetRevision, expectedBranchId, expectedRevision, expectedDigest, expectedGeneration, reason]` and the trimmed value. PASS.
   - (b) Absent, `''`, and `'   \t\n  '` reasons all produced a body `JSON.stringify`-identical, byte-for-byte, to the five-field baseline body (`FIVE_FIELD_BODY` constant, `toBe` — not `toEqual` — so this is a strict string-identity check). PASS.
   - (c) A committed outcome returned by the mocked route does not gain a `reason` property, and `JSON.stringify(outcome)` does not contain the input reason text (`'secret detail'`). PASS. Source confirms why: `input.reason` never reaches `isCommittedOrRefused`'s return value — the local `reason` const is used only inside the request body construction (`commitGmCombatRewind.ts:45,67`).
   - (d) `previewGmCombatRewind` was called with a commit-shaped input that includes `reason`; the resulting POST body was still the exact five-field `FIVE_FIELD_BODY` string. This is expected because `previewGmCombatRewind.ts` (untouched by the diff) explicitly re-serializes its own five named fields — `reason` was never a candidate for inclusion, confirmed by reading the full file (32 lines, sha unchanged from baseline per the numstat above, which lists no changes to this file).
   All 5 probe assertions passed: `Tests: 5 passed, 5 total`.

2. **[INFO] No logging/echo path — pass.** `grep -n "console\.\|logger\." src/lib/multiplayer/client/commitGmCombatRewind.ts` (full file, reviewed head) returned no match, and the same grep against the diff hunks returned no match. The adapter has no logger dependency at all. Satisfies (e).

3. **[INFO] Scope — pass.** Confirmed via `--numstat` above: only `commitGmCombatRewind.ts` + its test changed under `src/lib`; the remaining three files are the unit's own evidence JSON. No producer (`useGmCorrectionProducers.ts`), page, or route file changed on the range. Satisfies (f).

4. **[INFO, non-blocking, self-disclosed] Stale doc comment outside this unit's ownership.** `src/pages-modules/multiplayer/useGmCorrectionProducers.ts:19-27` (read at the reviewed head, file unchanged by this diff) still states "NOT YET DELIVERED - the transport DROPS the field... `commitGmCombatRewind` serialises a fixed five-field body". That sentence is now stale: once this PR's `reason` field is present, and once the caller already forwards `reason` into the commit argument (`useGmCorrectionProducers.ts:131`, also unchanged, pre-existing since U5b), the transport does carry it. This file sits outside `src/lib` (this unit's sole ownership path), so leaving it untouched is correct per the caps and per the unit's declared scope. The implementer's own `u5d-local-20260919.json` receipt already reports this exact finding under `findingsReportedNotFixed` — it is not a gap I found independently, but I confirm the underlying fact (the comment text really is present and really is now inaccurate) by direct read. No action required of this PR; flagging only so the successor/owner sees it is tracked twice (independently and self-reported) rather than dropped.

5. **[INFO] Server-side behavior at this head (context, not a defect).** `src/pages-modules/api/rewindCommitDeps.ts`'s `IRewindCommitBody`/`isRewindCommitBody` (read at the reviewed head) has no `reason` field and does not validate one — U5c (PR #1854, head `516d2c2bc`, `local-verified`, not an ancestor of this head per the admission receipt's own `git merge-base --is-ancestor` check) is a separate, unmerged unit. I additionally read `src/pages/api/matches/[id]/rewind-commit.ts:199` and confirmed the route spreads the raw request body (`...body`) into the commit call but then explicitly re-sets `reason: REWIND_COMMIT_REASON` on the same object literal, after the spread — so even though this PR's client would put a `reason` key on the wire today, the current route overwrites it with the constant before it reaches the commit module. Today's server neither rejects nor honors a caller-supplied `reason`; it is silently shadowed. This matches the unit's own "no route change (U5c)" scope and the risk the admission receipt records ("U5c is absent on this baseline; transport alone cannot establish private-record storage or end-to-end privacy"). Not a defect in U5d's diff.

No BLOCKER, HIGH, or MEDIUM findings.

## Boundary (review question 2)

Reason length above 2000 trimmed characters: the adapter has no length policy — no truncation, no client-side refusal. My probe sent a 2500-character reason; it was forwarded verbatim, trimmed only for whitespace, at its full 2500-character length (`parsed.reason.length === 2500`). This matches the receipts exactly: the local receipt's `nonClaims` states "No client policy for reasons above 2000 trimmed characters. U5c rejects them. No truncation is introduced," and the admission receipt's `risksForTheParent` says the same. Consistent, no discrepancy.

## Mutant reproduction (review question 3)

I independently reproduced a mutant equivalent to the receipts' **M1** ("reason accepted but not serialised"):

1. Recorded pre-mutant sha256: `210d07d9ad636a09f4ce22a3a2a15230da3cd3e64c206cae8f61fd205f4c5813` (matches the reviewed head and the receipts' `preMutantSha256`/`restoredSha256`/`finalContentHashes`).
2. Backed up the file outside the worktree, then edited `commitGmCombatRewind.ts` to delete the `...(reason ? { reason } : {})` spread from the `JSON.stringify` body, leaving the five original keys only (reason still accepted as a parameter and trimmed, just never serialized — same mutant shape as M1's description).
3. Ran `npx jest src/lib/multiplayer/client/__tests__/commitGmCombatRewind.test.ts --runInBand` (the implementer's own pin) against the mutant: **3 failed, 7 passed, 10 total** — the exact same three named tests failed as the receipts' M1 (`POSTs the trimmed private reason (plain)`, `(padded)`, `(2000 characters)`), with the same assertion shape (expected body has `"reason":...`, received body has no `reason` key).
4. Restored the file from the backup and re-hashed: sha256 `210d07d9ad636a09f4ce22a3a2a15230da3cd3e64c206cae8f61fd205f4c5813` — identical to the pre-mutant hash. `git status --porcelain` in the worktree showed no diff after restoration.
5. Re-ran `npx jest src/lib/multiplayer/client --runInBand` post-restore: 21/21 passed again.

**The receipts' mutant table matches** what I independently measured for M1 (same failure count, same failing test names, same restored hash). I did not re-run M2/M3 myself; M1 alone was sufficient to confirm the mutation-testing methodology and hash-restoration discipline claimed in the receipts are real and reproducible.

## Gates

All commands run inside the review worktree, Node 22.22.0, `npm_config_dry_run=true`, one at a time, exit codes captured without pipe-masking (`cmd > file 2>&1; echo $?`):

| Gate | Command | Exit | Last line |
|---|---|---|---|
| Client jest | `npx jest src/lib/multiplayer/client --runInBand` | 0 | `Test Suites: 3 passed, 3 total` / `Tests: 21 passed, 21 total` |
| Adapter jest (subset) | `npx jest src/lib/multiplayer/client/__tests__/commitGmCombatRewind.test.ts --runInBand` | 0 | `Test Suites: 1 passed, 1 total` / `Tests: 10 passed, 10 total` |
| Typecheck | `npx tsc --noEmit` | 0 | (no output — 0 diagnostics) |
| Format | `npx oxfmt --check --ignore-path .gitignore <5 changed files>` | 0 | `All matched files use the correct format. Finished in 135ms on 5 files using 16 threads.` |
| Unit boundaries | `npm run lint:units` | 0 | `LINT_UNITS_PASS 100/100` |
| OpenSpec CI quality | `npm run qc:openspec-ci:validate` | 0 | `[qc:openspec-ci] workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=19/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9 errors=0` |
| Roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | 0 | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` |

All six gates match the local receipt's recorded commands, exit codes, and last lines exactly. I did not additionally run `npx oxlint` (not in the charter's required gate list) but note the local receipt records it as `0 errors, 84 warnings` (pre-existing warning count, per the receipt's `lintWarnings.changedFrom84: false`).

## Cap

- `git diff --numstat` (above): 5 files total (cap 15 — well within).
- Product line count in the sole product file, `commitGmCombatRewind.ts`: 7 added / 3 deleted = 10 changed (cap 500 non-generated lines — well within). The test file (94/9) and the three evidence JSON files are test/evidence class, not product, consistent with how the local receipt classifies them (`productTotals.changed: 10`).
- Ownership: the node's ownership string is `src/lib`; both non-evidence changed files (`commitGmCombatRewind.ts` and its test) sit under `src/lib/multiplayer/client`, inside that ownership. No file outside `src/lib` or `openspec/planning/.../evidence/` changed.
- No AI attribution in the commit message (`git show 08014be16 -s`: author Wes Rollings, subject/body contain no AI/model credit). The strings `codex`, `gpt-6-astra` appear only inside the three evidence JSON receipts as the `implementerModel`/`branch` fields, which DELIVERY.md step 5 and GOAL.md's admission stage explicitly require the receipts to record — this is required process metadata, not "AI attribution" in a commit message, PR body, or comment, so it does not violate the "No AI attribution" standing constraint.
- No personal/machine-specific absolute paths (`C:\Users\...`, `/home/...`) in the product or test file (`grep` returned no match). The two evidence receipts do contain `E:/Projects/MekStation/.sisyphus/.../worktrees/u5d` as a `worktree` field — this is a project-root-relative path with no username or personal directory component, consistent with the pattern GOAL.md itself prescribes for program-owned worktrees ("Work in a program-owned worktree branched from a freshly fetched `origin/main`"); I do not read this as the kind of "absolute machine path" the review question is aimed at (there is no evidence of a personal home-directory leak), but I note it for the owner's awareness since it is technically an absolute path recorded in an evidence artifact.
- The receipts describe what the diff contains: the local receipt's `behavior`, `lineCounts`, and `finalContentHashes` all match what I independently measured. The red receipt shows the pre-change (baseline) state genuinely dropping the field: `3 failed / 7 passed` with `Received: <five-field body only>` against an `Expected` body carrying `reason` — this is a real, reproduced-by-me-via-mutant failure shape (see Mutant reproduction above), not a fabricated or weakened assertion.

## Verdict rationale

Every review question in the charter was independently measured, not just re-read from the receipts: I wrote and ran my own probe suite for the contract questions (1a-1f), independently reproduced the boundary behavior (2), independently reproduced a mutant with hash-verified restoration (3), re-ran every required gate myself with unmasked exit codes (4), and independently computed the diff's file/line counts and scanned for attribution/path violations (5). Every measurement matches what the receipts claim, with no discrepancy found. The one repo-wide implication I found (the stale doc comment in `useGmCorrectionProducers.ts`) is outside this unit's ownership, correctly left untouched under the unit's caps, and is already self-reported in the local receipt — so it does not count against this PR.

This unit's `reviewClasses` include `privacy`, so per DELIVERY.md step 5 a Lane B owner ruling on this exact head is still required before merge (packet `PK-u5d-ruling` in `units.json` currently has `decision: null`, `ruling: null` — unresolved as of this review). That is a separate, owner-only gate and does not change this Lane A code-review verdict; I flag it only so it is not mistaken for something Lane A clears.

**Verdict: APPROVE.**

## Cleanup

Performed after writing this review: delete the `node_modules` junction via `[System.IO.Directory]::Delete(...)` (link only, not recursive through it), then `git worktree remove --force` the review worktree.
