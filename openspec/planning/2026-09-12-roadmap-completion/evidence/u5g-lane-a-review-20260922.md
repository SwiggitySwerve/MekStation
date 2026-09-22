# Lane A review: U5g
reviewedHead: 21150333790292517f0cec074295abc6c7372d85
baseline: 05794b930927e4e70976b5005747bff6f0e9b4f5
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (no output; already current).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u5g-review 21150333790292517f0cec074295abc6c7372d85` — succeeded, `HEAD is now at 211503337`.
- `node_modules` junctioned from the root checkout via PowerShell `New-Item -ItemType Junction`.
- `npm_config_dry_run=true` exported before any npm/npx call; no install/ci/prune/lifecycle, no build, no Playwright, no commit was run.
- Node: `v22.22.0` via `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH`.
- All jest runs used `--runInBand`, one suite/group at a time.
- Cleanup performed at the end: junction deleted with `[System.IO.Directory]::Delete(...)` (non-recursive; verified the root `E:\Projects\MekStation\node_modules` was untouched afterward), then `git worktree remove --force` on the review worktree only. `git worktree list` afterward shows the review worktree gone and every other worktree (including the implementer's own `u5g` worktree, still on `codex/roadmap-u5g-gm-head-route-20260921` at `211503337`) untouched. The root checkout's working tree/index was never written to.

## Files on the range

`git diff --stat 05794b930..2115033379` — 6 files, 853 insertions, 0 deletions, matching the local receipt's `lineCounts`/`totals` exactly:

| File | Lines | Kind |
|---|---|---|
| `src/pages/api/matches/[id]/head.ts` | 1 | product (re-export) |
| `src/pages-modules/api/matchHeadRoute.ts` | 84 | product |
| `src/pages-modules/api/__tests__/matchHeadRoute.test.ts` | 313 | test |
| `openspec/planning/.../evidence/u5g-admission-20260921.json` | 123 | evidence |
| `openspec/planning/.../evidence/u5g-red-20260921.json` | 32 | evidence |
| `openspec/planning/.../evidence/u5g-local-20260921.json` | 300 | evidence |

I independently recomputed sha256 on the four contentHashes the local receipt claims (excluding the receipt-about-itself), and all four match:

- `head.ts` -> `6829bab1c1bb5a7672c449be852772a250e969eb13e8b711c608a8d8b50d5c9c` (matches)
- `matchHeadRoute.ts` -> `1ba0fd513cd811faa2d88313d2a542956aca9365bc8e8fff43482b3baf7cd1b8` (matches)
- `matchHeadRoute.test.ts` -> `7909240154590c4fafec383331b1f50cfe946a4f345e9a0e97c77c998aa30989` (matches)
- `u5g-admission-20260921.json` -> `2575a64efc00d45af2de2e7c93c250f6343790148656c2c97cf77cd81dad852f` (matches)
- `u5g-red-20260921.json` -> `e1710f618bedde91368caf4065344c089ff98812023244c95734bfcb90d9eaee` (matches)

I read the handler (`matchHeadRoute.ts`), the re-export (`head.ts`), the full test file, and the seam files named in the charter: `SQLiteEventHistoryCorrectionLeaseStore.ts:290-335` (`assertExpectedHeadIsCurrent` / `readJournalHead`), `EventHistoryEffectiveStreamHead.ts` (`readEffectiveStreamHead`), `GmCombatRewindPreview.ts` (`matchStreamRef`), `matchPrivatePreviewRoute.ts` (the GM-gated GET pattern), `rewind-commit.ts:181` (its stream ref), and `matchHistoryViewerChain.ts` (`prepareMatchHistoryGet`, `rejectMatchHistoryFailure`, `MATCH_HISTORY_AUTHORIZATION_REFUSED`). I also read `ViewerHistoryLineage.ts:90-160` to check the `findingsReportedNotFixed` claim about the lineage's cutoff revision.

## Findings

1. **[Info] Authority law holds, verified independently.** Severity: none (confirmatory). `src/pages-modules/api/matchHeadRoute.ts:1-84`. I wrote my own probe suite (`laneAProbe.test.ts`, 8 tests, deleted after the run — not part of the reviewed diff), using a different match id and different digest values than the implementer's fixtures, and it passed 8/8: (a) the host's 200 body has exactly `branchId`/`digest`/`effectiveGeneration`/`revision` and nothing else; (b) a seated non-host and an unrelated stranger both get `403 {error:'Authorization refused'}`, byte-identical bodies; (c) no bearer -> 401; (d) POST -> 405; (e) an unknown match -> `404 {error:'unknown match'}` and an activated-but-headless match -> `404 {error:'no head'}`. This corroborates the implementer's own 11/11 suite rather than merely re-running it.

2. **[Info] Single-transaction, no digest computation — confirmed by reading, not by a dynamic test.** Severity: none. `matchHeadRoute.ts:61-75`. The handler wraps `branches.readEffectiveHead(stream)` and `readEffectiveStreamHead(db, branches, stream)` inside one `db.transaction(() => {...})()` call (better-sqlite3 transactions are synchronous, so no interleaving is possible inside it), and returns `head.digest`/`head.branchId`/`head.revision` verbatim plus `effective.effectiveGeneration` — no hashing call anywhere in the file (`grep -n "createHash|sha256|digest("` found nothing). This is a static-reading verification, not something I could black-box test without instrumenting the module; I did not find a way to prove "one transaction" dynamically without modifying source, so I am relying on the source read here and flag that explicitly.

3. **[Info] Seam fidelity confirmed, plus one case the implementer's test doesn't reach.** Severity: none (informational, answers review question 2). The lease store's `readJournalHead` (`SQLiteEventHistoryCorrectionLeaseStore.ts:301`) calls the exact same exported `readEffectiveStreamHead` the route calls, on the same `stream = matchStreamRef(matchId)` the commit route (`rewind-commit.ts:181`) also uses — so digest/branchId/revision equality with the lease's read is true by construction, not incidental. I drove this through my own fixture and independently confirmed `assertExpectedHeadIsCurrent` accepts the route's exact body without throwing.
   I then went further than the implementer's fixture: I advanced the journal tip (`event_journal_stream_heads.stream_revision`) past the installed candidate branch's `baseRevision` (simulating further match events after activation), and re-read both the route and `readMatchHistoryLineage`. Result: `readEffectiveStreamHead` (and therefore the route) tracked the new tip revision (5); `ViewerHistoryLineage`'s `projectEffectiveHead` (`ViewerHistoryLineage.ts:133`, `current?.baseRevision`) stayed pinned at the branch's cutoff (2) — confirming the `findingsReportedNotFixed` entry the implementer already recorded in the local receipt. I then asked the lease store which one it accepts: it accepted the route's revision-5 claim and **threw `STALE_REVISION` on the lineage's revision-2 claim**. So the route's `readEffectiveStreamHead`-derived revision is the one that is right for the lease; the lineage's `baseRevision` is not, and the implementer's own non-claim note is accurate and not overclaiming. Nothing to fix here — this is exactly the seam the unit was scoped to touch, and the lineage discrepancy is pre-existing, out of this unit's ownership paths (`ViewerHistoryLineage.ts` is under `src/lib`, not `src/pages/api/matches` or `src/pages-modules/api`), and already named as a non-claim rather than silently glossed over.

4. **[Info] `effectiveGeneration` and `branchId`/`digest` come from two separate reads inside the same transaction, not one.** Severity: low / stylistic, not a defect. `matchHeadRoute.ts:64-67` calls `branches.readEffectiveHead(stream)` directly for `effective.effectiveGeneration`, then calls `readEffectiveStreamHead(db, branches, stream)` which internally calls `branches.readEffectiveHead(stream)` a second time (`EventHistoryEffectiveStreamHead.ts:47`) to get the branch id it then re-queries the head row for. Because both calls sit inside one `db.transaction()` and neither the SQLite service nor this route does interleaved writes, the two reads cannot observe different `effective` values here — but it is two logical reads of the same fact rather than one, and a future refactor that threads a write through the same transaction (there is none today) would need to re-verify this invariant. Not blocking; noting it because the code comment ("Keep generation and the lease's journal head in one read snapshot") slightly overstates that it is a single physical read when it is a single transaction around two reads of the same value.

## Gates

All run from the review worktree with `npm_config_dry_run=true` and Node 22.22.0, one suite/group at a time:

| Gate | Command | Last line | Exit |
|---|---|---|---|
| Head route suite | `npx jest src/pages-modules/api/__tests__/matchHeadRoute.test.ts --runInBand` | `Tests: 11 passed, 11 total` | 0 |
| Private-preview suite | `npx jest src/pages-modules/api/__tests__/matchPrivatePreviewRoute.test.ts --runInBand` | `Tests: 10 passed, 10 total` | 0 |
| API group | `npx jest src/pages-modules/api src/__tests__/api/matches --runInBand` | `Test Suites: 11 passed, 11 total` / `Tests: 107 passed, 107 total` | 0 |
| My independent probe (deleted after run, not in the diff) | `npx jest src/pages-modules/api/__tests__/laneAProbe.test.ts --runInBand` | `Tests: 8 passed, 8 total` | 0 |
| typecheck | `npx tsc --noEmit` | (silent) | 0 |
| format | `npx oxfmt --check --ignore-path .gitignore <the 6 changed files>` | `All matched files use the correct format. Finished in 122ms on 6 files using 16 threads.` | 0 |
| lint:units | `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| openspec-ci | `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=19/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9 errors=0` | 0 |
| roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

All numbers are byte-identical to what the local receipt (`evidence/u5g-local-20260921.json`) claims for the same commands. I did not run `npm run typecheck`/`npm run lint`/`npm run build`/Playwright — the charter forbids build and Playwright, and the listed gate set above is what the charter specified.

### Mutant reproduction (review question 3)

I chose a mutant not in the receipts' M1-M3 table: removed the `if (head.revision === 0) return null;` guard in `matchHeadRoute.ts` (so an effective branch with a deleted/missing journal head row would fall through to fabricating a genesis-digest 200 instead of answering 404).

- Pre-mutant sha256: `1ba0fd513cd811faa2d88313d2a542956aca9365bc8e8fff43482b3baf7cd1b8` (matches the receipt's `savedHandlerCopy.sha256` and `contentHashes` entry).
- `npx jest src/pages-modules/api/__tests__/matchHeadRoute.test.ts --runInBand` on the mutant: **1 failed, 10 passed, 11 total** — failing test: `answers no head when the effective branch has no journal head row`, `expect(received).toBe(expected) // Object.is equality; Expected: 404; Received: 200`.
- Restored the file from a pre-mutation copy; sha256 after restore: `1ba0fd513cd811faa2d88313d2a542956aca9365bc8e8fff43482b3baf7cd1b8` — equal to the pre-mutant hash.
- This is consistent with the receipts' mutant table in spirit (the implementer's M1-M3 also each caught exactly the guard they targeted, 1-2 failures out of 11) even though it targets a different line (the `revision === 0` guard rather than the host/GM restriction or the digest/stream selection). The implementer's table does not include this guard specifically, so this is new coverage evidence, not a re-run of their mutant, and it caught the mutation.

## Cap

- `git diff --numstat 05794b930..2115033379`: 6 files, 853 lines total (0 deletions). Product lines: 85 (`head.ts` 1 + `matchHeadRoute.ts` 84). Test lines: 313. Product+test: 398, under the unit's 500-line cap; 6 files, under the 15-file cap.
- Scope: `git diff --name-only` shows only `src/pages/api/matches/[id]/head.ts`, `src/pages-modules/api/matchHeadRoute.ts`, `src/pages-modules/api/__tests__/matchHeadRoute.test.ts`, and the three `openspec/planning/2026-09-12-roadmap-completion/evidence/u5g-*.json` receipts — nothing under `src/lib`, nothing outside the unit's declared `ownershipPaths` (`src/pages/api/matches`, `src/pages-modules/api`).
- No AI attribution: `git log --format='%B' <range>` grepped for `claude|anthropic|co-authored|generated by|ai-generated` — none found.
- No absolute machine paths: grepped the diff content for `E:\Projects`, `C:\Users`, `/c/Users`, `/e/Projects` — none found in the changed source/test files (the evidence JSON receipts do carry worktree path strings like `E:/Projects/MekStation/.sisyphus/.../worktrees/u5g`, which is the program's own documented `.sisyphus/` working-path convention recorded as evidence metadata, not a leaked personal machine path, and the charter's own admission/local receipt schema records `worktree` this way by design).
- The red receipt (`evidence/u5g-red-20260921.json`) shows 11/11 failing on the missing route before the change (`Could not locate module @/pages/api/matches/[id]/head`), matching "the route absent before the change."
- The receipts' described diff contents (line counts, hashes, gate outputs, mutant table) all matched what I independently measured in this review — no discrepancy found between what the receipts claim and what is actually in the diff.

## Verdict rationale

The route is a small, focused, read-only addition that reuses existing seams end-to-end rather than inventing new authorization or digest logic: the same `matchStreamRef`, the same `readEffectiveStreamHead` the correction lease itself reads, the same `HostAsGmMembershipSource`/`prepareMatchHistoryGet`/`rejectMatchHistoryFailure` chain the sibling `matchPrivatePreviewRoute` already uses, and the same constant 403 body other history routes use (no oracle). I reproduced the authority law, the seam-fidelity claim, and one mutant independently, all in a detached, read-only worktree, and every gate the charter asked for passed with output byte-identical to the receipts. The one pre-existing wrinkle (`ViewerHistoryLineage`'s cutoff-vs-tip divergence) is outside this unit's ownership paths, already disclosed as a non-claim in the local receipt, and I independently confirmed the route (not the lineage) is the value the lease actually needs. I found no correctness, scope, cap, or attribution problems. This unit's `reviewClasses` include `authority`, so a separate Lane B owner ruling on this exact head is still required per `PK-u5g-ruling` before merge — Lane A approval here does not substitute for that.

**Verdict: APPROVE**
