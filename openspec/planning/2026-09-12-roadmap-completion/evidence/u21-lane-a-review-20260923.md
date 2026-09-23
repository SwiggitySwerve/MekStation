# Lane A review: U21

reviewedHead: 55473c67080d0619e24fb3500e57a306b96399a8
baseline: b0e17e343d3ff1020058e5f6a19d128f0a4ea029
reviewerModel: claude-sonnet (Agent model: sonnet)
implementerModel: claude-opus (Agent model: opus)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin`, then `git worktree add --detach .../worktrees/u21-review 55473c67080d0619e24fb3500e57a306b96399a8`. Confirmed `HEAD is now at 55473c670`.
- Junctioned `node_modules` from PowerShell (`New-Item -ItemType Junction`), Node 22 via the pinned nvm path, `npm_config_dry_run=true` set before every npm call. No `npm install/ci/prune`, no build, no Playwright, nothing committed or pushed, no other worktree touched (worktrees/u21, worktrees/u35d left alone).
- Read GOAL.md, DELIVERY.md step 5, the U21/U22 units.json entries (U21b does not exist as a ledger id yet on this head or on origin/main f06dcb442 — it is only a `clauseCMovedTo20260923` pointer inside U21's own entry on main; units.json is untouched by this diff, confirmed via `git diff --stat ... -- .../units.json` producing no output), the three named findings (all three exist on origin/main f06dcb442, not on the PR head itself — FN-u21-preview-integrity-refusal-is-500 and FN-u21-match-store-segment-reader-without-production-caller are the implementer's own self-reported F3/F4), OD-mvp-hard-cutover and OD-launch-head-gate in roadmap.json, and the three u21-*-20260923.json receipts in full.
- On origin/main f06dcb442 (post-review docs state), U21's `ownershipPaths` already includes `src/__tests__/api/matches` (a same-day `pathsAmendedBeforeAdmission20260923` amendment) and `state: "local-verified"`; `review`/`merge`/`mainProof`/`tick` receipts are still null there, consistent with this being a pre-merge Lane A review.
- Working tree at end of review: `git status --short` and `git diff --stat HEAD` both empty — the review worktree is byte-identical to the reviewed head.

## Files on the range

`git diff --stat b0e17e343..55473c670`: 16 files changed, 2954 insertions(+), 375 deletions(-) — 13 product+test files plus the 3 u21 evidence receipts (u21-admission/red/local-20260923.json). No other paths touched. Matches the local receipt's own count exactly.

## Findings

1. **[Info, not a defect] U21b does not yet exist as a units.json entry.** The charter's "U21, U21b and U22 entries" turned up only U21 and U22 on this head; U21b is a `clauseCMovedTo20260923` pointer recorded inside U21's own entry on origin/main f06dcb442, not a separate ledger row. `openspec/planning/2026-09-12-roadmap-completion/units.json` is not in this PR's ownership paths and is unmodified by the diff, so this is expected, not a scope gap in this PR.
2. **[Info, pre-existing, self-reported, correctly out of scope] FN-u21-preview-integrity-refusal-is-500 (F3).** A branch-integrity/count refusal escaping `materializeBranchPath` inside `previewGmCombatRewind` is never caught by that function, so the route's generic `try/catch` → `sendCaughtApiError` turns it into a bare 500, while the commit path maps the same class of refusal to a typed 409. This is a property of `previewGmCombatRewind`'s own error handling (it does not special-case `EventHistoryBranchError` at all), not of which reader is wired in — `matchStoreBranchSegmentReader` throws the same `EventHistoryBranchError` type (`unknown-branch`) for its own refusals, and would 500 the same way if `materializeBranchPath`'s count check ever fired against it. Correctly recorded as "not a regression of U21" and parked for the next unit that edits `rewind-preview.ts`. No action needed in this PR.
3. **[Info, pre-existing, self-reported] FN-u21-match-store-segment-reader-without-production-caller (F4).** Verified independently below (question 2); correctly recorded and parked, not fixed here (deleting it is outside the behavior sentence).

No findings of my own beyond confirming the three the implementer already self-reported. All comments I checked against code (see question 5 and the scope section) are accurate.

## Question-by-question record

**Q1 — the reader, measured.**
`npx jest src/lib/multiplayer/server/history/__tests__/matchJournalBranchSegmentReader.sqlite.test.ts` on the head: `Test Suites: 1 passed, 1 total; Tests: 5 passed, 5 total`.

Red repro: restored the baseline blobs for the 4 touched product files (`rewindCommitDeps.ts`, `rewind-preview.ts`, `ServerMatchHostRewindRebuild.ts`, `campaignLaunchHeadRoute.ts`) via `git checkout b0e17e343 --` and deleted the new reader file, keeping the head's test file. Re-ran the same suite: `Test Suites: 1 failed, 1 total; Tests: 5 failed, 5 total` — three rows fail with `candidate-verification-failed`, `"Branch '<id>' is anchored to a base its parent does not hold at revision 4"` (matches the red receipt and the original FN-u2b message), and the two prefix-law rows fail with `Cannot find module '../matchJournalBranchSegmentReader'`. Also ran `npx jest src/__tests__/api/matches/rewindCommitRoute.test.ts` in this same baseline-product/head-test combination: `1 failed, 9 passed, 10 total`, the one failing row getting 409 instead of 200 — reproduces FN-u2b through the route layer too. Restored all 4 files via `git checkout 55473c670 --` and confirmed sha256 back to the head's recorded values (`ad426ca...`, `1c3cf57...`, `f355ae6...`, `6fa8d22...`, `9b90d3b...` for the reader + the 4 baseline-reverted files — all matched).

From the code: `matchJournalBranchSegmentReader` calls `journal.readStream({ ..., branchId: segment.branchId, ... })` — each segment's own branch id is passed straight through, never forced to `root` and never routed through `journalBranchSegmentReader` (which is imported nowhere in the new file). `toProjectableMatchEvent` sets `payload: matchEvent` where `matchEvent = stored.payload?.matchEvent`, throwing `branch-integrity` when `isGameEvent(matchEvent)` is false. `previousStreamEventDigest: stored.previousStreamEventDigest` is passed through unchanged from what the journal stored at append time — never recomputed from the window's start — so a mid-stream window chains from the real predecessor digest. This is independently confirmed by the M3 mutant in the local receipt (rechaining from the window start breaks the "lands the next command..." and prefix-law rows) and by `EventHistoryCandidateBuild.requireBaseEvent`, which reads `event_id`/`event_digest` from the identical `event_journal_events` table columns the reader reads.

**Q2 — consumers.**
`grep -rln "matchStoreBranchSegmentReader" src --include="*.ts" | grep -v __tests__` returns 8 files, but `grep -rn "matchStoreBranchSegmentReader(" src --include="*.ts" | grep -v __tests__` (the actual function call) returns only the function's own definition — no production caller invokes it. The 8 files import unrelated helper exports from the same module (`nextMatchSequenceAfter`, `revisionForMatchSequence`, `journalHeadRevisionForNextMatchSequence`) or mention it only in a comment (`matchAuthorityBaseline.ts`, `MatchRecoveryJournalHead.ts`). `grep -rln "matchJournalBranchSegmentReader" src --include="*.ts" | grep -v __tests__` returns exactly `ServerMatchHostRewindRebuild.ts`, `rewind-preview.ts`, `rewindCommitDeps.ts` (plus its own definition file) — the three files/four call sites (rewind commit deps, rewind preview route, live rebuild, boot fold) the behavior sentence names. FN-u21-match-store-segment-reader-without-production-caller holds: confirmed, the old reader's function is called nowhere in production.

**Q3 — mode off, probed.**
Wrote a scratch test (`src/__tests__/api/matches/u21LaneAModeOffProbe.scratch.test.ts`, deleted before finishing) that explicitly sets combat journal mode to `'off'` (the production constant), creates an ordinary match with real committed events in `DurableMatchStore` (no journal mirror activity because `DurableMatchStore.mirrorCommittedBatch` returns early at `DurableMatchStore.ts:1000` while the mode is off), then calls the real `rewind-commit` and `rewind-preview` route handlers via `node-mocks-http` and `tryFoldActivatedRewindBranch(store, matchId)` directly.

Ran on the head: all 4 rows pass — `journalHead()` is `{branchId:'root', revision:0}` (no journal head at all), commit answers `404 {reason:'no-authoritative-history'}`, preview answers `404 {reason:'no-authoritative-history'}`, boot fold returns `null`.

Then reverted the 5 product files to baseline (same `git checkout b0e17e343 --` + delete-reader-file sequence as Q1) and re-ran the identical, unmodified test file: **identical results** — same 404/404/null across all 4 rows, byte-identical JSON bodies. Restored the head's files afterward; sha256 matched (`ad426ca...`, `1c3cf57...`, `f355ae6...`, `6fa8d22...`, `9b90d3b...`).

From the code: both `GmCombatRewindCommit.ts:101-105` and `GmCombatRewindPreview.ts:250-254` check `deps.branches.readEffectiveHead(stream) === null` and refuse `no-authoritative-history` **before** either deps' `reader` is ever invoked; `tryFoldActivatedRewindBranch` checks `head === null || isLivePathBranchId(head.branchId)` and returns `null` before calling `readActivatedBranchGameEvents` at all. Since the mirror never writes a branch/head row while mode is off, all three guards fire identically regardless of which reader is wired in. The admission/local receipts' claim — "the routes refuse no-authoritative-history exactly as before; no fallback to the match store exists or is added" — **holds**, confirmed by direct measurement, not just by code reading.

**Q4 — re-seeded tests honesty.**
Independently diffed all five suites (`git diff b0e17e343..55473c670 -- <file>` for each) and counted `it(`/`it.each(` declarations head vs. baseline:

| suite | baseline rows | head rows |
|---|---|---|
| rewindCommitRoute.test.ts | 10 | 10 |
| rewindCommitRoute.reason.test.ts | 9 | 9 |
| rewindPreviewRoute.test.ts | 16 | 16 |
| ServerMatchHost.rewindRebuild.test.ts | 7 | 7 |
| matchRecoveryCheckpointDoor.test.ts | 7 | 7 |

No row added or removed in any of the five. `grep "^[+-].*\bit(" <diff>` on all five patches returns **zero** matches — no `it(...)` declaration line was touched in any of the five files; every diff hunk lands inside shared setup/helper functions (`seedMatch`, `seedAuthoritativeHistory`→`expectMirroredHead`, `body()`, module header comments).

Row-by-row content changes found by reading the diffs directly (not just trusting the receipt):
- `rewindCommitRoute.test.ts`: no `it()` body touched at all; only the seed mechanism (hand-inserted journal rows → real `store.appendCommandBatch` through the mirror) and `body()`'s branch/digest defaults changed.
- `rewindCommitRoute.reason.test.ts`: same seed swap; one row's assertion literal changed `fromBranchId: 'root'` → `fromBranchId: MATCH_BASELINE_BRANCH_ID` — the same specific branch is still pinned, just named as the mirror actually writes it. Equal, not weaker.
- `rewindPreviewRoute.test.ts`: same seed swap; two comment-only edits and one assertion literal change (`'root'` → `MATCH_BASELINE_BRANCH_ID`, same reasoning as above). Equal.
- `ServerMatchHost.rewindRebuild.test.ts`: `seedAuthoritativeHistory` (which hand-built journal rows matching match-store digests) replaced by `expectMirroredHead` (which now *asserts* `liveHead()` matches the expected branch/revision after a real mirrored append) inside a shared helper used by two rows. The removed manual-journal-construction code is gone; a new assertion on the mirrored head's shape is added. Equal or stronger, matching the receipt's characterization.
- `matchRecoveryCheckpointDoor.test.ts`: the row `'boot after a committed rewind yields the rewound session'` swaps hand-inserted journal construction (`payload_json: '{}'`, match-store-copied digests) plus `expect(backfillGenesisBranches()).toBe(1)` for `store.seedJournalFromInitialEvents(...)` plus `expect(streamHead).toMatchObject({branchId: MATCH_BASELINE_BRANCH_ID, revision: HEAD_REVISION})`. The old assertion was an indirect proxy (how many branches got backfilled); the new one directly pins the branch id and revision the seed produced. I judge this **stronger**: it names the concrete state that matters to the row rather than a side-effect count of the fixture's own setup call, which is no longer invoked manually since `seedJournalFromInitialEvents` performs the equivalent installation as part of a real append. Every later assertion in the row (`committed`, the recovered host, the rewound phase) is byte-identical to baseline.

No assertion removed or weakened without an equal-or-stronger replacement, in all five suites — confirmed independently, not just from the receipt's own claim.

**Q5 — clauses (d), (e), (f).**
Quoted comments checked against code:
- `campaignLaunchHeadRoute.ts` doc comment (clause d): "`500 {error}` - a journaled campaign with no effective head: the resolver throws `no-effective-branch` rather than answering `no-authoritative-stream`..." — the handler's body is exactly `try { ...; res.status(200).json(result); } catch (error) { sendCaughtApiError(res, error, ...); }`; `sendCaughtApiError` (`routeHelpers.ts:96-101`) is `res.status(500).json({error: apiErrorMessage(error, fallback)})`; `SQLiteEventHistoryBranchStore.requireEffectiveHead` (`:237-243`) throws with code `'no-effective-branch'`. Matches.
- `campaignLaunchHeadRoute.test.ts` clause (e): the no-journal row's comment now reads "the campaign exists and the journal holds no event for it, so there is no head to name (OD-launch-head-gate)" — matches `resolveCampaignLaunchHead`'s documented rule; the `backfillGenesisBranches()` call at the old line 138 is removed from `seedCampaignWithJournal`, consistent with U19b installing the genesis branch on first append (read-only context, not part of this diff).
- `campaignLaunchAuthorityRoute.ts` (clause f target, unmodified by this diff — only its test gained a row): catch block is `catch (error) { sendCaughtApiError(res, error, 'failed to resolve launch authority'); }` — same 500 shape.

Ran both suites: `npx jest src/pages-modules/api/__tests__/campaignLaunchHeadRoute.test.ts src/pages-modules/api/__tests__/campaignLaunchAuthorityRoute.test.ts` → `Test Suites: 2 passed, 2 total; Tests: 26 passed, 26 total` (8 + 18). Row counts independently confirmed via `grep -c "^\s*it("`: campaignLaunchHeadRoute.test.ts 7→8, campaignLaunchAuthorityRoute.test.ts 13→14 (exactly +1 each). The two new rows assert: a journaled campaign whose `event_history_effective_heads` row is deleted gets `500 {error: "Stream campaign/<id> has no effective branch"}` from both routes, never `200 no-authoritative-stream`; the authority route's new row additionally asserts `materializeOwnedPlayerForces` is never called (`jest.mocked(...).not.toHaveBeenCalled()`).

**Q6 — replay.**
Read `EventHistoryCandidateBuild.ts:304-316` (`requireBaseEvent`): reads `event_id`, `event_digest` directly from `event_journal_events` by `(stream_type, stream_id, branch_id, stream_revision)`. `matchJournalBranchSegmentReader`'s `toProjectableMatchEvent` returns `eventId: stored.eventId, eventDigest: stored.eventDigest` from the exact same table/columns via `journal.readStream`. All three of the candidate anchor, `materializeBranchPath`'s verification (used identically by the commit path via `rewindCommitDeps.ts` and the rebuild/boot-fold via `ServerMatchHostRewindRebuild.ts`), and the preview (`rewind-preview.ts`) now construct their reader the same way, over the same `event_journal_events` table, with no recomputation. `digestBranchPath` (`EventHistoryCandidateVerification.ts:123-133`) hashes only the stored `previousStreamEventDigest`/`eventDigest` fields carried through unchanged by the reader — never a `matchEventChainDigest` (the match-store's own hash function). `matchEventChainDigest` remains used only inside `matchStoreBranchSegmentReader.ts`'s own body (no production caller, per Q2) and in the unrelated `MatchCheckpointHistory.ts` (a different, checkpoint-only digest space consumed by `MatchRecovery.ts`, outside the rewind-commit/preview/rebuild path this unit touches). No code on the reviewed range compares a journal digest with a match-store digest. Confirmed: candidate anchor, verification and preview all read the same stored form.

**Q7 — independent mutant (not M1-M6).**
Edited `matchJournalBranchSegmentReader.ts`'s `toProjectableMatchEvent` to remove the `isGameEvent` branch-integrity check entirely (cast the raw payload through instead of throwing on a missing match event) — a mutant none of M1-M6 target (those cover the reader wiring, the wrap-refusal, digest rechaining, the two launch-route mutants, and the rebuild/boot-fold file revert; none touch the branch-integrity guard on a malformed stored event). Ran `npx jest src/lib/multiplayer/server/history/__tests__/matchJournalBranchSegmentReader.sqlite.test.ts`: `Test Suites: 1 failed, 1 total; Tests: 1 failed, 4 passed, 5 total` — the row `'refuses a stored match event whose envelope carries no game event'` failed with `Received promise resolved instead of rejected`, catching the mutant. Restored the file via `git checkout 55473c670 -- <path>`; sha256 back to `ad426caaa589fe4c93dde1394819263abb0efe448a7a8457f0a2d87aee0a47a0`, matching the head exactly.

**Q8 — gates on the head.**
All run from the review worktree, Node 22 pinned, `npm_config_dry_run=true`:
- `npx jest src/lib/multiplayer/server` → `Test Suites: 158 passed, 158 total; Tests: 1169 passed, 1169 total`.
- `npx jest src/pages-modules/api` → `Test Suites: 8 passed, 8 total; Tests: 62 passed, 62 total`.
- `npx jest src/__tests__/api` → `Test Suites: 54 passed, 54 total; Tests: 751 passed, 751 total` (re-run after deleting the Q3 scratch probe file, which had transiently added 1 suite/4 tests to this count).
- `npx jest src/lib/events/journal` → `Test Suites: 23 passed, 23 total; Tests: 243 passed, 243 total`.
- `npx tsc --noEmit` → no output, exit 0.
- `npx oxlint` → `Found 84 warnings and 0 errors` (matches the recorded warning baseline exactly, 0 delta).
- `npx oxfmt --check` on the 13 changed files → `All matched files use the correct format. Finished ... on 13 files`.
- `npm run lint:units` → `LINT_UNITS_PASS 100/100`.
- `npm run qc:openspec-ci:validate` → `errors=0` (`workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=19/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9`).
- `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` → `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows`.

All counts match the local receipt's recorded values exactly.

**Q9 — scope and cap.**
`git diff --stat` on the range: 16 files total (13 product+test files + 3 receipts). Excluding receipts: **13 files**, cap 15 — under. Independently summed `--numstat` for the 5 non-test (product) files: added 117+13+19+23+30=202, deleted 0+7+2+8+23=40, total changed **242** non-generated product lines, cap 500 — well under (matches the local receipt's `productAdded:202, productDeleted:40` exactly). 8 test files carry +644/-335 lines, reported separately per OD-line-cap-product-lines and not counted against the cap. Every one of the 13 files sits under an allowed path (`src/lib/multiplayer/server`, `src/pages-modules/api`, `src/pages/api/matches`, `src/__tests__/api/matches`); the 3 receipts sit under `openspec/planning/2026-09-12-roadmap-completion/evidence/`, the explicitly-allowed exception.

`grep -inE "claude|anthropic|generated with|co-authored-by|ai-generated|opus|gpt"` and `grep -inE "C:\\\\Users|E:\\\\Projects|E:/Projects|/c/Users|/e/Projects"` over all 13 product+test files: **zero matches** for both — no AI attribution, no absolute machine paths.

Function comments on every added/changed function (checked against the code, not just present):
- `matchJournalBranchSegmentReader.ts`: `toProjectableMatchEvent` and `matchJournalBranchSegmentReader` both carry comments that match their bodies exactly (verified in Q1/Q7).
- `ServerMatchHostRewindRebuild.ts`: `readActivatedBranchGameEvents`'s and `tryFoldActivatedRewindBranch`'s doc comments were rewritten to describe the journal read; `rebuildHostFromActivatedBranch` gained a new comment — "read the path through `effectiveRevision` from the journal, move the store tail past it aside, fold and replace the session, claim the branch, then reseed the dice and reset the intent window, broadcast cursor, replay ceiling and viewer deliveries" — read the body line by line and every clause maps to a real call (`readActivatedBranchGameEvents`, `supersedeActivatedTail`, `foldMatchSession`+`replaceSession`, `setServedBranchId`, `reseedDice`, `resetIntentWindow`, `resetBroadcastCursor`+`setRewindReplayCeiling`, `discardViewerDeliveries`+`markViewersForResync`) in the order stated. Accurate.
- `rewindCommitDeps.ts`: `buildGmCombatRewindCommitDeps`'s new comment says "The match store is read only for the combat outcome id" — verified `input.store` appears exactly once in the function body, inside `readOutcomeId`'s `hasCombatOutcomeOutbox(input.store)`/`getCombatOutcomeOutbox`. Accurate.
- `rewind-preview.ts`: the handler's new comment ("authorize the host as GM, preview the rewind over the journal's history, store the GM's private preview record, and answer the result verbatim") matches the handler's call sequence (`previewGmCombatRewind` → `GmPrivatePreviewRecordWriter` → `res.status(...).json(...)`).
- `campaignLaunchHeadRoute.ts`'s module doc comment: checked against the handler in Q5, accurate.

No comment claims a guarantee the code does not implement.

## Gates

See Q8 above for full command/output pairs; all exit 0 except `npx tsc --noEmit` (exit 0, silent) and `npx oxlint` (exit 0, 84 warnings/0 errors, matching the pinned warning count with zero delta).

## Cap

13 files (excluding the 3 receipts), 242 non-generated product lines — both well inside the unit's 15-file / 500-line caps. No files outside the allowed ownership paths. No AI attribution, no absolute machine paths.

## Verdict rationale

Every claim in the behavior sentence and the three receipts that I could independently measure, I measured, and every measurement matched: the red repro reproduces FN-u2b's exact refusal message on the baseline product code with the head's test; the reader passes each segment's own branch id and never rechains predecessor digests (confirmed by an independent mutant of my own, not the receipt's M1-M6); the old reader has zero production callers; the new reader has exactly the three/four call sites the sentence names; mode-off behavior is measured byte-identical between baseline and head via a scratch probe run against both, not just inferred from code reading; all five re-seeded suites keep every row's assertion equal or stronger, independently diffed and counted, not just trusted from the receipt; clauses (d)/(e)/(f)'s rewritten comments match the code exactly and the two new 500 rows pass; the candidate anchor, verification and preview are confirmed (at the SQL-column level) to read the same stored table; every gate reproduces the recorded counts exactly; the diff stays well inside caps with no AI attribution, no absolute paths, and accurate function comments throughout.

The three findings I encountered (U21b not yet a ledger row, the preview's pre-existing 500-vs-409 mismatch, the old reader's dead production surface) are all correctly self-reported by the implementer, correctly classified as out of this unit's narrow scope, and correctly parked for follow-on units rather than silently absorbed or hidden.

This PR still requires the Lane B owner ruling DELIVERY.md mandates for its `replay` and `authority` review classes before it can merge — that is unaffected by this Lane A verdict and is not something a cross-model review can substitute for.

APPROVE.
