# Lane A review: U21b
reviewedHead: d3df6aaef0f49467224e8774c2ad6a2bcfaba396
baseline: bd6bfe779036631bf63b0e84b748a7bfd6e122b6
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` run; `d3df6aaef0f49467224e8774c2ad6a2bcfaba396`, `bd6bfe779036631bf63b0e84b748a7bfd6e122b6` and `fab5328254ffc30c8a853aa301bcfb0a69638439` all resolved locally before use.
- Detached worktree created: `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u21b-review`, `git worktree add --detach ... d3df6aaef0f49467224e8774c2ad6a2bcfaba396` (`HEAD is now at d3df6aaef`).
- `node_modules` junctioned from the root checkout via PowerShell `New-Item -ItemType Junction`.
- `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH` — `node --version` → `v22.22.0`. `export npm_config_dry_run=true` set before every npm/npx call.
- `node scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` → `MACHINE_IDLE` before the full-directory jest runs.
- Read: GOAL.md, DELIVERY.md (step 5) at `origin/main` `fab532825`; the U21b/U21/U22a entries and the three named findings in `units.json` at `fab532825`; the receipts `openspec/planning/2026-09-12-roadmap-completion/evidence/u21b-{admission,red,local}-20260925.json` and `u21-red-20260923.json`, read from the implementer's worktree (`.sisyphus/roadmap-completion-20260912/worktrees/u21b`) — these are untracked/gitignored and are not present in a fresh checkout of the head commit. Read the full `git diff` between baseline and head, and every read-only context file the charter named.
- No npm install/ci/prune, no build, no Playwright, no commit/push. Root checkout and other worktrees untouched (verified: only the review worktree and the scratchpad were written to).
- Implementer: claude-opus (Agent model: opus), per every receipt. Reviewer: claude-sonnet (Agent model: sonnet) — different model, no shared context (this is a fresh session).

## Files on the range

`git diff --stat bd6bfe779036631bf63b0e84b748a7bfd6e122b6..d3df6aaef0f49467224e8774c2ad6a2bcfaba396`: 9 files changed, 335 insertions(+), 29 deletions(-).

Product (4, all under the owned paths):
- `src/lib/multiplayer/server/MatchRecoveryJournalHead.ts` (+6/-4)
- `src/lib/multiplayer/server/history/GmCombatRewindPreview.ts` (+7/-5)
- `src/lib/multiplayer/server/history/ViewerHistoryLineage.ts` (+28/-9)
- `src/pages-modules/api/matchHistoryViewerChain.ts` (+9/-3)

Test (5, all under the owned paths):
- `src/lib/multiplayer/server/__tests__/MatchHostRegistry.closeRoute.test.ts` (new, +174)
- `src/lib/multiplayer/server/__tests__/ServerMatchHost.rewindRebuild.test.ts` (+1/-1, comment only)
- `src/lib/multiplayer/server/history/__tests__/ViewerHistoryLineage.test.ts` (+68/-6)
- `src/pages-modules/api/__tests__/campaignLaunchHeadRoute.test.ts` (+4/-1, comment only)
- `src/pages-modules/api/__tests__/matchHeadRoute.test.ts` (+38/-0)

All 9 paths verified under `src/lib/multiplayer/server` or `src/pages-modules/api` — no path outside the unit's ownership.

## Findings

1. **[Informational] Confirmed divergence: an effective-head row whose branch has no stream-head row.** Probed directly on real SQLite (scratch test, written and deleted in this session): activated a candidate branch but skipped planting its `event_journal_stream_heads` row. `readEffectiveStreamHead(db, branches, STREAM)` answered `{branchId:'candidate-1', revision:0, digest:<genesis>}`; `projectViewerHistoryLineage(...).effectiveHead` answered `{branchId:'candidate-1', revision:0, generation:2}` — a real object, not `null`. Meanwhile `matchHeadRoute.ts:65-73` treats `head.revision === 0` as "no head" and answers `404 {error:'no head'}` for the identical state (confirmed by the existing green row "answers no head when the effective branch has no journal head row", `matchHeadRoute.test.ts:338-350`). So the lineage and `GET /head` genuinely disagree in this one state: lineage answers a non-null revision-0 object, the route answers 404.
   Consumer check: no production consumer branches on the value. `matchHistoryTimelineRoute.ts:44-51` and `matchHistoryExportRoute.ts:39-44` both just pass the `lineage` object through in their JSON body with no conditional on `.effectiveHead.revision`. No e2e reader compares `.revision` against 0 or treats it as a sentinel (see finding 3). This exact edge is also self-reported as F4 in `evidence/u21b-local-20260925.json`, which additionally notes it is reachable only in a state production's own candidate build never leaves (it always plants a stream-head row per `EventHistoryCandidateBuild.ts:196,265-279`). I independently reproduced the state and confirm F4's description; no live-path impact found.

2. **[Confirmed, no code issue] "No effective-head row at all" answers null before any journal read.** `ViewerHistoryLineage.ts:141-142`: `if (storedHead === null) return null;` runs before `stores.readEffectiveStreamHead(stream)` is ever called. Confirmed by the passing row "store answering null does not invent an effective head" (`ViewerHistoryLineage.test.ts`, green on the head).

3. **[Confirmed] Consumers of `lineage.effectiveHead.revision` (grep of src + e2e).** Exactly one call site compares `.revision`: `e2e/gm-two-player-rewind.pack.spec.ts:185-186` (E2E-42, `expect(lineage.effectiveHead?.revision).toBe(heads[0]?.effectiveHead?.revision)`). Every other reader compares only `.branchId`: `e2e/gm-two-player-privacy.pack.spec.ts:325`, `e2e/gm-two-player-rewind.pack.spec.ts:60`, `:184`, `:306-307`. `branchId` identity is unchanged by this unit (it still names the effective branch); only the meaning of `.revision` moved from the branch's `baseRevision` cutoff to the journal tip. So only the E2E-42 row's assertion depends on the new semantics holding across three near-simultaneous reads — see finding 4.

4. **[Recorded correctly; not currently racy] E2E-42 (FN-u21b-e2e-42-parallel-lineage-reads-may-differ) read carefully.** The row (`e2e/gm-two-player-rewind.pack.spec.ts:115-190`) does `committed = await previewThenCommit(...)` (:169-174) then three **parallel** `readLineage` calls via `Promise.all` (:175-179), each hitting `GET /api/matches/:id/timeline` independently. Traced what is "in flight" between commit and the reads:
   - `rewind-commit.ts` (`src/pages/api/matches/[id]/rewind-commit.ts`) `await`s `liveHost.rebuildFromActivatedBranch(...)` **before** responding `200` — so by the time `previewThenCommit` resolves client-side, the live rebuild (and per-socket join replay) has already completed server-side; nothing from the rebuild itself is still in flight.
   - Activation seeds the candidate's journal-head row at its **base** revision via `seedCandidateJournalHead` (`EventHistoryCandidateBuild.ts:196,265-279`) — the rebuild does not append a journal event. The candidate's journal head only advances past its base once a subsequent command is processed (this is exactly the state the new head-route test row and U21b's row1 construct by hand).
   - No code in the test between `committed` and the `Promise.all` reads issues a game command from host, guest, or spectator (read lines 169-186 in full: only the three GET calls run).
   - Conclusion: **as literally written today, this row is not racy** — nothing appends to the journal in the window between commit and the three reads, so all three should read the same base-revision head. The implementer's finding is a real but *prospective* architectural risk: once any other command lands in that window (a real player continuing to play, or a future test addition), the three unsynchronized parallel reads could diverge under tip semantics, where they could not under the old fixed-cutoff semantics. The finding's own text ("recommended successor... if E2E-42 flakes, read the head once and pass it to all three viewers") is the right mitigation *if* it starts flaking, and is correctly deferred rather than fixed here. Also relevant: the entire test is currently a strict expected failure (`test.fail(true, ...)`, :119-122, tag `@until-journal-cutover`) and is not exercised for real today.

5. **[Confirmed by direct test run + independent mutant] Close-route regression row (FN-u22a-close-route-reaches-live-host / FN-u21b-close-route-200-with-no-host).** Ran `MatchHostRegistry.closeRoute.test.ts` on the head: green (host started in one isolated module graph via `getMatchHostRegistry().getOrCreate`, DELETE loaded in a second isolated graph, closes the host, sends `{kind:'Close', reason:'Match closed'}` and calls `socket.close()`). Traced the close path: `ServerMatchHost.closeMatch` (`ServerMatchHost.ts:1052-1076`) sends the Close frame and detaches every socket, then `store.closeMatch`. `MatchHostRegistry.closeMatch` (`MatchHostRegistry.ts:202-206`) is a silent no-op when `this.hosts.get(matchId)` is `undefined`; the pages route (`src/pages/api/multiplayer/matches/[id].ts:119-124`) always answers `200 {ok:true}` after calling it regardless of outcome — **confirmed**: DELETE answers 200 with no host, exactly as FN-u21b-close-route-200-with-no-host states.
   Independently reproduced the registry mutant myself (not reusing the receipt's run): patched `matchHostRegistrySlot()` in `MatchHostRegistry.ts` to return a module-local object instead of reading `globalThis` (pre-mutant sha256 `c2f91cf7cd5ce9fb69ff8eac2afd68e7c93254a193696c214827c2a079085ee7`, matching the receipt's recorded pre-mutant hash exactly). Result: `Test Suites: 1 failed`, `× closes the host the socket graph started and disconnects its sockets`, `Expected: true / Received: false` at line 167 (`host.isClosed()`); the status-code assertion on the line before it still passed (200 returned, nothing closed) — same observation the receipt records. Restored the file; sha256 back to `c2f91cf7...ee7`, `git status` clean.
   Callers of the route: **no production/UI caller** exists (grepped `src`; the only place `getMatchHostRegistry().closeMatch` is invoked is the route itself). However, **e2e callers do exist** and are exercised against genuinely live, connected matches for test cleanup: `e2e/gm-two-player-exactly-once.pack.spec.ts:292`, `e2e/gm-two-player-fault.pack.spec.ts:150`, `e2e/gm-two-player-lifecycle.pack.spec.ts:292,402`, `e2e/gm-two-player-privacy.pack.spec.ts:1243`. This is a nuance worth flagging: FN-u22a-close-route-reaches-live-host's summary ("No UI or server code calls the route today") and the ledger's framing of this as a "newly live... no current caller" path is accurate for *product* code but slightly overstates the path's dormancy — it is already reached by five other packs' e2e cleanup today. This does not affect the correctness of U21b's fix or its regression row; it just means the row is protecting behavior that was already incidentally exercised, not a purely theoretical path. No required edit.

6. **[Confirmed accurate] Every changed/corrected comment states what the code actually does.** Checked all six comment changes against the code beneath them:
   - `MatchRecoveryJournalHead.ts:17-20` (F2): "events are read from the match store (`store.getEvents` below), which holds exactly one line of history under the two live-path ids, `root` and `main`" — verified `store.getEvents(matchId, 0)` at line 106, and `LIVE_PATH_BRANCH_IDS = new Set([MATCH_BASELINE_BRANCH_ID, ROOT_EVENT_BRANCH_ID])` where `MATCH_BASELINE_BRANCH_ID = 'main'` (`matchAuthorityBaseline.ts:59,83-86`) and `ROOT_EVENT_BRANCH_ID = 'root'` (`EventJournalContract.ts:1`). Accurate.
   - `GmCombatRewindPreview.ts:242-245` (F1): "writes nothing while the combat journal authority mode is 'off' (the shipped default)" — verified `DurableMatchStore.ts:1000: if (getCombatJournalAuthorityMode() === 'off') return;` and the default resolves to `'off'` (`combatJournalAuthorityEnabled.ts:58`, `matchJournalAuthority.ts:21`). Accurate.
   - `ServerMatchHost.rewindRebuild.test.ts:346` (F5): "this diff prints only the kind key, not reason/detail" — the assertion is `expect(result).toMatchObject({ kind: 'committed' })`; Jest's `toMatchObject` diff is scoped to the keys named in the expected object, so only `kind` can appear. Accurate (the corrected text; the old comment's claim was wrong).
   - `campaignLaunchHeadRoute.test.ts:143-146` (F6): rewritten to state the fixture just seeds no journal event, dropping the stale "flag-off world" framing. Matches what `seedCampaignWithoutJournal` does.
   - `ViewerHistoryLineage.ts` new/expanded doc comments (the `readEffectiveStreamHead` field doc, and `projectEffectiveHead`'s doc) — verified against the function bodies; accurate (see Finding 1/2 evidence).
   - `matchHistoryViewerChain.ts:149-153`: "readEffectiveStreamHead over the same handle" — verified `getSQLiteService()` is a module singleton (`SQLiteService.ts:242-244`, "Get or create the SQLite service singleton"), so `matchHeadRoute.ts` and `createViewerHistoryLineageStores()` do share the same `Database.Database` instance. Accurate.

## Gates (run myself on the head, in the review worktree)

| Gate | Command | Result | Matches receipt |
|---|---|---|---|
| jest multiplayer/server | `npx jest src/lib/multiplayer/server` | `161 passed, 161 total` suites / `1180 passed, 1180 total` tests, exit 0 | yes (161/1180) |
| jest pages-modules/api | `npx jest src/pages-modules/api` | `8 passed, 8 total` / `63 passed, 63 total`, exit 0 | yes (8/63) |
| jest __tests__/api/matches | `npx jest src/__tests__/api/matches` | `3 passed, 3 total` / `47 passed, 47 total`, exit 0 | yes (3/47) |
| jest events/journal | `npx jest src/lib/events/journal` | `23 passed, 23 total` / `243 passed, 243 total`, exit 0 | yes (23/243) |
| jest lib/multiplayer (broad) | `npx jest src/lib/multiplayer` | `178 passed, 178 total` / `1439 passed, 1439 total`, exit 0 | superset of server; consistent |
| tsc | `npx tsc --noEmit` | no output, exit 0 | yes |
| oxlint | `npx oxlint` | `Found 84 warnings and 0 errors`, exit 0 | yes (84 warnings, 0 errors) |
| oxfmt --check | `npx oxfmt --check <9 changed files>` | `All matched files use the correct format.`, exit 0 | yes |
| lint:units | `npm run lint:units` | `LINT_UNITS_PASS 100/100`, exit 0 | yes |
| qc:openspec-ci:validate | `npm run qc:openspec-ci:validate` | `...errors=0`, exit 0 | yes, identical line |
| roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows`, exit 0 | yes, identical line |

## Red reproduction (Q5)

Restored the baseline blobs of all four product files (`git show bd6bfe779...:<path>` for `MatchRecoveryJournalHead.ts`, `GmCombatRewindPreview.ts`, `ViewerHistoryLineage.ts`, `matchHistoryViewerChain.ts`) into the working tree, then ran the changed + new suites:

- `ViewerHistoryLineage.test.ts`: **2 failed / 4 passed** — `× root-only stream answers effectiveHead and zero transitions`, `× answers the journal head GET /head answers, not the branch cutoff (clause c)`.
- `matchHeadRoute.test.ts`: **1 failed / 11 passed** — `× the lineage names the head GET /head names once the branch runs past its base`.
- `campaignLaunchHeadRoute.test.ts`: all pass (comment-only diff).
- `MatchHostRegistry.closeRoute.test.ts`: passes on baseline product code (expected — U22a already ships the shared registry; this row's own red is the registry mutant, independently reproduced in Finding 5).
- `ServerMatchHost.rewindRebuild.test.ts`: all pass (comment-only diff).

Total: 3 failed / 31 passed across the five suites — exactly the three rows the red receipt names, for exactly the reasons it names (`revision 2` received where `3`/`4` expected). Restored all four files to the head (`git checkout --`); sha256 of each verified equal to the head's git blob **and** to `finalFileHashes` in `evidence/u21b-local-20260925.json`:
- `MatchRecoveryJournalHead.ts` → `174317447770973770374b677a54e472bed9df51c8f201be652b0acc3c72ebbc`
- `GmCombatRewindPreview.ts` → `2863c1753547a38e1823fecdf61e75e6d1e85881e5c0d07093bc3d7efab44e19`
- `ViewerHistoryLineage.ts` → `efda56f46cdfd673923fa017c69388e52b56ae005ff5673b8494bc4b79045b52`
- `matchHistoryViewerChain.ts` → `98e2e2a9d25d96a0fbc6df6dbded25e5e6e853a60a563f120fcbf757a0e6209b`

## Independent mutant (Q6, not M1/M2a/M2b/M3)

Mutated `ViewerHistoryLineage.ts:155` from `generation: storedHead.effectiveGeneration,` to `generation: journalHead.revision,` (swaps the generation field to read the journal-tip revision instead of the stored effective generation — none of the receipt's four named mutants touch this field). Pre-mutant sha256 `efda56f46...52` (matches head). Ran `ViewerHistoryLineage.test.ts` + `matchHeadRoute.test.ts`: **3 failed** (`root-only stream answers effectiveHead and zero transitions`, `answers the journal head GET /head answers, not the branch cutoff (clause c)`, `the lineage names the head GET /head names once the branch runs past its base`) — all three rows that assert an exact `generation` value caught it. Restored; sha256 back to `efda56f46...52`, `git status` clean.

## Cap

- Files: 9 changed (cap 15). Within cap.
- Product lines: `+50/-21` = 71 non-generated changed lines across the 4 product files (cap 500, and the receipt's own count of 71 matches `git diff --numstat` exactly: `MatchRecoveryJournalHead.ts` 6+4, `GmCombatRewindPreview.ts` 7+5, `ViewerHistoryLineage.ts` 28+9, `matchHistoryViewerChain.ts` 9+3). Well within cap.
- No AI attribution: grepped the full diff and the commit message for `claude|anthropic|co-authored|generated with|opus|sonnet|gpt|openai|copilot` — no matches.
- No absolute machine paths: grepped the diff for `C:\Users`, `/c/Users`, `E:/Projects`, `E:\Projects`, `/mnt/`, `/home/` — no matches.
- Comment accuracy: see Finding 6 — all six comment changes verified against the code beneath them.

## Verdict rationale

All eleven gates reproduce exactly on the exact head, independently, in a fresh detached worktree with no shared context with the implementer. Red reproduces exactly (3 failing rows, same reasons) against the restored baseline product files, and files were restored to the head with sha256 parity confirmed against both the git blob and the receipt's recorded hashes. Two independent mutants (one of my own choosing on a field none of the four named mutants touch, plus an independent re-run of the registry mutant) were both caught by the row(s) they should be caught by, and both files were restored with sha256 parity confirmed. The two edge-case semantics the charter asked me to probe (no effective-head row → null before any journal read; effective-head row with no stream-head row → lineage answers a real revision-0 object while GET /head 404s) were independently reproduced on real SQLite via a scratch test, deleted before finishing, and match the implementer's own self-disclosed F4 finding — with no production or e2e consumer found that treats revision 0 as a sentinel, so the divergence is inert today. E2E-42's race risk was traced in the actual test code and is not racy as currently written (no command is in flight between commit and the parallel reads, and the whole test is presently a strict expected failure pending journal cutover) — the finding is correctly recorded as a forward risk rather than fixed now. All six comment corrections were checked against the code beneath them and are accurate. Scope, file count, and line cap are all within limits, with no AI attribution and no absolute machine paths in the diff. The one nuance I found beyond the implementer's own findings — that e2e cleanup in five other packs already calls the close route against live hosts, so it is not quite as dormant as FN-u22a's "no current caller" framing suggests — does not affect correctness of this unit's diff and needs no edit before merge.

**Verdict: APPROVE.**
