# Lane A review: U10
reviewedHead: 542155517552b353ade5ff145fb7bc58a2472711
baseline: ec23e8794df18a6cc032f223c20e56de292deb87
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — completed (no new output; local refs already covered the reviewed head and baseline).
- Confirmed both commits are present locally: `git log --oneline -1 542155517552b353ade5ff145fb7bc58a2472711` → `fix(multiplayer): the match-store branch reader serves the baseline branch id alongside root`; `git log --oneline -1 ec23e8794df18a6cc032f223c20e56de292deb87` → `docs(roadmap): U5a closure, review through tick, unit complete; ruling transcribed (#1848)`.
- Created a detached worktree at `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u10-review` at the exact reviewed head via `git worktree add --detach`.
- Junctioned `node_modules` from PowerShell (`New-Item -ItemType Junction`) — succeeded, verified `Mode d----l` on the target.
- Node 22 confirmed active: `node --version` → `v22.22.0`, `npm --version` → `11.6.2`.
- `npm_config_dry_run=true` exported in every shell before any npm command. No `npm install`/`ci`/`prune` was run. No build, no Playwright, no commit was made in the worktree.
- All git commands during this review were run with an explicit `-C` or from inside the review worktree; the root checkout was never touched.
- I did use `gh pr view 1849 --json ...` (read-only, no mutation) to independently cross-check the PR body against the diff and receipts; this made no changes and touched no local files.
- Cleanup performed at the end of this review (see final section) per the charter's exact junction/worktree teardown sequence.

## Files on the range

`git diff --stat ec23e8794d..542155517` — 6 files, 710 insertions(+), 11 deletions(-):

- `openspec/planning/2026-09-12-roadmap-completion/evidence/u10-admission-20260918.json` (+157)
- `openspec/planning/2026-09-12-roadmap-completion/evidence/u10-local-20260918.json` (+282)
- `openspec/planning/2026-09-12-roadmap-completion/evidence/u10-red-20260918.json` (+70)
- `src/lib/multiplayer/server/history/__tests__/matchStoreBranchSegmentReader.test.ts` (+165)
- `src/lib/multiplayer/server/history/matchStoreBranchSegmentReader.ts` (+29/-6)
- `src/lib/multiplayer/server/matchAuthorityBaseline.ts` (+7/-5)

This matches exactly what the charter expected (the reader, the module holding the served-id set, the reader test file, and the three U10 receipts). `MatchStreamJournalMirror.ts` does not appear in the diff — confirmed untouched by `git diff --name-only`.

Read `git diff` for both product files directly (not just the receipts' description of them):

- `matchAuthorityBaseline.ts`: the only change is the doc comment on `LIVE_PATH_BRANCH_IDS` (lines ~72-83), updated from "refuses every branch but `root`" to "reads that line under EITHER of these two names ... refuses every other branch id." `LIVE_PATH_BRANCH_IDS` and `isLivePathBranchId` themselves are unchanged text.
- `matchStoreBranchSegmentReader.ts`: adds a header block ("ONE LINE OF HISTORY, TWO NAMES"), imports `MATCH_BASELINE_BRANCH_ID` and `isLivePathBranchId` from `../matchAuthorityBaseline`, changes the guard from `segment.branchId !== ROOT_EVENT_BRANCH_ID` to `!isLivePathBranchId(segment.branchId)`, widens the refusal message to name both live-path ids, and changes the per-event stamp from the literal `ROOT_EVENT_BRANCH_ID` to `segment.branchId` (echoed).

## Findings

1. **[Info] Contract holds — independently probed, not just re-run.** I wrote my own jest file (`laneAProbe.test.ts`, not derived from the implementer's test, deleted before worktree teardown) asserting: (a) a baseline-id segment returns identical `eventId`/`streamRevision`/`eventDigest` arrays as the same segment on root; (b) a truncated baseline read (`segment(0,3,'main')`) equals `full.slice(0,3)` digest-for-digest, proving prefix behavior; (c) a foreign id (`'laneA-foreign-branch'`) still rejects with `code: 'unknown-branch'`; (d) an end-to-end `materializeBranchPath` over a baseline-headed `resolveBranchPath` output succeeds and every returned event carries `branchId === MATCH_BASELINE_BRANCH_ID`. All 4 passed on the reviewed head (`npx jest .../laneAProbe.test.ts` → `Tests: 4 passed, 4 total`). This directly answers the charter's question 1 without relying on the implementer's own assertions.
   - **Resolver requirement, with file:line**: `src/lib/events/journal/EventHistoryBranchResolver.ts:323-327` — `verifySegment` throws an integrity error when `event.branchId !== segment.branchId`. Echoing `segment.branchId` (rather than the canonical `ROOT_EVENT_BRANCH_ID`) is therefore not a style choice but a hard requirement of the caller the reader feeds; stamping root on a baseline-segment read would trade `unknown-branch` for a `verifySegment` integrity failure. Confirmed by reading the resolver source directly, and by my own probe's end-to-end resolver test, which would have thrown had the stamp been wrong.

2. **[Info] No import cycle, and the charter's stated premise about one was wrong on this baseline — reader confirms it (F2 in the local receipt).** `matchAuthorityBaseline.ts`'s only imports are `@/types/gameplay/GameSessionInterfaces` (type-only), `EventJournalCanonicalizer`, `EventJournalContract`, and `hashUtils` — none from `src/lib/multiplayer` (confirmed by `grep -n "^import"` on the file at the reviewed head). Its only mention of `matchStoreBranchSegmentReader` is a doc comment, not code. The reader imports one direction only, from `../matchAuthorityBaseline`. `npx tsc --noEmit` exits 0 with no output, which would surface a cycle-driven type resolution failure if one existed (it would not necessarily catch a runtime-only cycle, but there is no code-level cycle to catch: the dependency graph between these two files is a single directed edge). I consider the charter's cycle premise not applicable to this head; the implementer's own F2 non-claim says the same thing and I independently verified the import lists to reach it rather than trusting that write-up.

3. **[Info] Callers all green, counts match the receipts exactly.** See Gates section — every one of the 9 named suites plus the full `src/lib/multiplayer/server` run matched the local receipt's reported counts exactly, run one at a time as instructed.

4. **[Info] Independent mutant reproduced the fix's necessity.** I chose a mutant not identical to the receipt's M1/M2/M3 in isolation: I fully reverted the guard line to its pre-fix form (`segment.branchId !== ROOT_EVENT_BRANCH_ID`), which is the union of what M1 and M2 each partially exercise (this is effectively "undo the whole behavioral fix," a distinct edit path from the receipt's three surgical mutants). Before mutating: `sha256sum` of the reader file = `2ddbe5e9ba644b643b41c318252e89793d6cd13ac76cf94ad83f4432b474ccd4`, which matches the local receipt's `preMutantSha256` / `readerSha256AfterFinalRestore` exactly — i.e. I mutated the same bytes the implementer measured. After the mutation, running the implementer's suite plus my own probe file together: `Tests: 7 failed, 11 passed, 18 total` — the 4 failures the red receipt names in the implementer's file, plus 3 of my 4 probe assertions (the foreign-id-refusal probe correctly stayed green, since that guard clause is untouched by this mutation). I restored the file and re-verified `sha256sum` == `2ddbe5e9ba644b643b41c318252e89793d6cd13ac76cf94ad83f4432b474ccd4` (identical), then reran both suites green (`Tests: 18 passed, 18 total`). This corroborates the receipts' mutant table: the fix is load-bearing, not vacuous, and the file was returned byte-identical afterward.

5. **[Low, non-blocking] Cap accounting mixes product and receipt line counts without saying so explicitly in units.json.** The unit's cap is `maxNonGeneratedLines: 500`. The local receipt reports "36 product lines" against the cap, excluding the three evidence JSON files (509 lines total) and the 165-line test file from that specific claim. DELIVERY.md/GOAL.md do not explicitly classify hand-written evidence receipts as "generated" or not. This is not a defect — the total diff (6 files, 710 lines) is nowhere near either the 15-file or 500-line ceiling under any reasonable interpretation, and product-code lines alone are 36 — but the local receipt's arithmetic framing ("36 product lines... against a 500-line cap") is worth the parent noting is a category choice, not a universally defined one.

6. **[Low, non-blocking] Refusal message text changed** (F4 in the local receipt, independently confirmed by reading the diff): the thrown message went from naming only `root` to naming both live-path ids. I grepped `src/lib/multiplayer/server` and `src/__tests__/api/matches` for the old exact string and found no matches, consistent with the receipt's claim that no in-repo suite depended on the old wording. I did not grep outside those trees (e.g. e2e/, other packages) since the charter scoped the review to the named files/seams; flagging as an F4-consistent observation, not a new issue.

No blocking findings.

## Gates

All commands run from `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u10-review` with Node 22 and `npm_config_dry_run=true` set, jest suites run one at a time as instructed.

| Command | Last line | Exit |
|---|---|---|
| `npx jest .../matchStoreBranchSegmentReader.test.ts` | `Tests: 14 passed, 14 total` | 0 |
| `npx jest src/lib/multiplayer/server/history` | `Tests: 105 passed, 105 total` (12 suites) | 0 |
| `npx jest .../matchCheckpointEquivalence.test.ts` | `Tests: 5 passed, 5 total` | 0 |
| `npx jest .../matchCreatePathJournalSeed.sqlite.test.ts` | `Tests: 4 passed, 4 total` | 0 |
| `npx jest .../matchRecoveryCheckpointDoor.test.ts` | `Tests: 7 passed, 7 total` | 0 |
| `npx jest .../matchRecoveryJournalArmDoor.sqlite.test.ts` | `Tests: 6 passed, 6 total` | 0 |
| `npx jest .../matchRecoveryJournalHead.sqlite.test.ts` | `Tests: 4 passed, 4 total` | 0 |
| `npx jest .../matchStreamJournalMirror.sqlite.test.ts` | `Tests: 10 passed, 10 total` | 0 |
| `npx jest .../ServerMatchHost.rewindRebuild.test.ts` | `Tests: 7 passed, 7 total` | 0 |
| `npx jest src/__tests__/api/matches/rewindCommitRoute.test.ts` | `Tests: 10 passed, 10 total` | 0 |
| `npx jest src/lib/multiplayer/server` (full package) | `Tests: 1164 passed, 1164 total` (157 suites) | 0 |
| `npx tsc --noEmit` | (no output) | 0 |
| `npx oxfmt --check` (the 3 changed src files) | `All matched files use the correct format.` | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] workflowContracts=8/8 ... errors=0` | 0 |
| `node .../validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

Every count above matches the local receipt (`u10-local-20260918.json`) exactly. I additionally ran my own probe file (`laneAProbe.test.ts`, deleted before teardown) — `Tests: 4 passed, 4 total` — and the mutant-reproduction round documented under Finding 4.

## Cap

- `git diff --numstat` file count: 6, well under the unit's `maxFiles: 15`.
- Product code lines: reader +29/-6, baseline module (comment-only) +7/-5 → 36 added / 11 removed, well under `maxNonGeneratedLines: 500`.
- Total diff including test and receipts: 710 insertions / 11 deletions across 6 files — still far under any reading of the cap.
- Scope check: `git diff --name-only` shows every changed path under `src/lib/multiplayer/server` or `openspec/planning/2026-09-12-roadmap-completion/evidence`; nothing outside those two prefixes.
- `MatchStreamJournalMirror.ts` confirmed absent from the diff (untouched), consistent with the packet's option (a) decision (option (b), mirroring onto root, was rejected).
- No AI attribution: `git log -1 --format=%B` on the reviewed head and the PR body (`gh pr view 1849`, read-only) both grepped clean for `co-authored`, `claude`, `anthropic`, `generated with`, case-insensitive.
- No absolute machine paths: grepped the full diff for `C:\`, `/c/Users`, `/mnt/c`, `E:\Projects`, `wroll` — no matches.
- Red receipt (`u10-red-20260918.json`) confirms, in its own recorded run, that the pre-change reader threw `EventHistoryBranchError: A match store holds only the 'root' branch; 'main' has no events` for a `MATCH_BASELINE_BRANCH_ID` segment (4 failed / 10 passed), i.e. `unknown-branch` was thrown for the baseline id before the change, as required.
- The receipts (admission, red, local) describe the diff's actual contents accurately: I cross-read the local receipt's per-file line-count table, its "three edits" description, and its mutant table against the real `git diff` and my own reruns, and found no discrepancy.

## Verdict rationale

The head does exactly what the packet's chosen option (a) and the unit's behavior sentence require: `matchStoreBranchSegmentReader` now serves `MATCH_BASELINE_BRANCH_ID` alongside `root` with identical events/revisions/digest chain, still refuses every other id with `unknown-branch`, and stamps the segment's own branch id on returned events — which I confirmed is what `EventHistoryBranchResolver.verifySegment` (line 323) actually requires, not a cosmetic choice. All charter-named caller suites and the full `src/lib/multiplayer/server` package pass with counts matching the receipts exactly (verified independently, one suite at a time). `tsc --noEmit`, `oxfmt --check`, `lint:units`, `qc:openspec-ci:validate`, and the roadmap validator all pass. No import cycle exists on this baseline (verified by reading `matchAuthorityBaseline.ts`'s import list directly), which corrects rather than contradicts the charter's stated premise. My own independent jest probe (written fresh, not copied from the implementer's suite) passes all 4 assertions on the reviewed head, and my own independently-chosen mutant (a full guard revert, distinct from the receipt's three mutants) reproduces failure exactly where expected and is byte-identically restorable (sha256 matched before and after). The diff is scoped to exactly the files the charter named, well under both caps, carries no AI attribution and no absolute machine paths. The only findings are non-blocking observations already substantially self-disclosed by the implementer's own non-claims/findings list (F1-F4), which I independently corroborated rather than took on faith. No Lane B ruling is claimed or required for this Lane A verdict — the unit's `reviewClasses` include `replay`, so PK-u10-ruling's owner ruling remains a separate, outstanding gate before merge, exactly as the local receipt and packet already state.

Verdict: **APPROVE**
