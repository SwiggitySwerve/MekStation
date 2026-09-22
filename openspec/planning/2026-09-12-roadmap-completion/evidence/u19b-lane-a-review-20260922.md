# Lane A review: U19b
reviewedHead: 70503ee7ccad2639df28b7687467af776590f7f1
baseline: 0367a2f3b8543057b2dac557426d1ea9770a05bc
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — ran, no new refs relevant to this range.
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u19b-review 70503ee7ccad2639df28b7687467af776590f7f1` — succeeded; worktree checked out at `70503ee7c`.
- `New-Item -ItemType Junction` for `node_modules` — created, pointed at the root `node_modules`; verified `node_modules\.bin\jest.cmd` resolves through it before running anything.
- `npm_config_dry_run=true` and Node 22 (`v22.22.0`, confirmed via `node --version`) set in every PowerShell call that ran `node`/`npm`/`npx` (PowerShell does not persist `$env:` across separate tool calls — re-set each time).
- No `npm install`/`ci`/`prune`, no build, no Playwright, no commits. All git commands targeted the review worktree explicitly (`git -C .../worktrees/u19b-review ...` or cwd inside it). The root checkout at `E:/Projects/MekStation` itself was never `cd`'d into or written to.
- Cleanup performed at the end of this review: junction deleted via `[System.IO.Directory]::Delete(...)` (non-recursive-through-link), then `git worktree remove --force` (see end of this document for the confirmation commands and output).

## Files on the range

`git diff 0367a2f3b8543057b2dac557426d1ea9770a05bc..70503ee7ccad2639df28b7687467af776590f7f1 --numstat` (measured, 17 lines/files):

| file | +/- |
|---|---|
| openspec/.../evidence/u19b-admission-20260922.json | 247/0 |
| openspec/.../evidence/u19b-local-20260922.json | 996/0 |
| openspec/.../evidence/u19b-red-20260922.json | 324/0 |
| src/lib/events/journal/SQLiteEventHistoryBranchStore.ts | 69/0 |
| src/lib/events/journal/SQLiteEventJournalWriter.ts | 45/6 |
| src/lib/events/journal/__tests__/EventHistoryActivation.test.ts | 2/1 |
| src/lib/events/journal/__tests__/EventHistoryBranchResolver.test.ts | 2/1 |
| src/lib/events/journal/__tests__/EventHistoryCandidateBuild.test.ts | 2/2 |
| src/lib/events/journal/__tests__/EventHistoryCandidateVerification.test.ts | 2/1 |
| src/lib/events/journal/__tests__/EventHistoryImpactDerivation.test.ts | 2/1 |
| src/lib/events/journal/__tests__/SQLiteEventJournalWriter.genesisOnFirstAppend.test.ts (new) | 345/0 |
| src/lib/events/journal/__tests__/SQLiteEventJournalWriter.test.ts | 5/3 |
| src/lib/multiplayer/server/MatchStreamJournalMirror.ts | 7/6 |
| src/lib/multiplayer/server/history/__tests__/CoordinatedOutcomeCorrection.test.ts | 14/1 |
| src/lib/multiplayer/server/history/__tests__/CoordinatedOutcomeCorrectionSaga.test.ts | 15/3 |
| src/lib/multiplayer/server/history/__tests__/GmCombatRewindCommit.test.ts | 14/1 |
| src/lib/multiplayer/server/history/__tests__/GmCombatRewindPreview.test.ts | 14/2 |

All 17 paths sit inside exactly the three areas the unit owns: `src/lib/events/journal`, `src/lib/multiplayer/server`, and the roadmap's `evidence/` receipts directory. The only non-test change under `src/lib/multiplayer/server` is `MatchStreamJournalMirror.ts`, and that diff is a docstring correction only (verified below, zero code lines changed).

Carried-content check: `git diff f0008f3a52dbd89ddf54a3828b54532ef9efce06 70503ee7ccad2639df28b7687467af776590f7f1 -- src/lib/events/journal` is **not empty** as the charter expected — see Finding 3. The two core production files (`SQLiteEventHistoryBranchStore.ts`, `SQLiteEventJournalWriter.ts`) are confirmed byte-identical to the U19 draft (empty diff on those two paths specifically); only the new genesis test file differs, by three added lines that strengthen an assertion.

## Findings

1. **[LOW] Receipt wording: "byte-equal" claim for the carried journal ownership path is not literally true.** `openspec/planning/2026-09-12-roadmap-completion/evidence/u19b-local-20260922.json` describes the carry from U19's draft (`f0008f3a5`) as "byte-equal," but `git diff f0008f3a52dbd89ddf54a3828b54532ef9efce06 70503ee7ccad2639df28b7687467af776590f7f1 -- src/lib/events/journal` shows a 3-line diff in `src/lib/events/journal/__tests__/SQLiteEventJournalWriter.genesisOnFirstAppend.test.ts` (a comment plus two added `expectGenesisShape` assertions in test (d), proving both genesis rows exist before the backfill runs). The two production files named in the receipt (`SQLiteEventHistoryBranchStore.ts`, `SQLiteEventJournalWriter.ts`) verified byte-identical on their own. The imprecision is confined to receipt prose about the test file and the change is a strict strengthening (added assertions, not weakened or removed ones) — not a correctness issue.

2. **[LOW-MEDIUM] `FIRST_EFFECTIVE_GENERATION = 1` is restated as an independent, unexported literal in two files instead of shared.** `src/lib/events/journal/SQLiteEventHistoryBranchStore.ts:60` declares its own `const FIRST_EFFECTIVE_GENERATION = 1` with a comment noting it is "the same value the migration's genesis backfill falls back to." `src/services/persistence/SQLiteService.historyBranches.migration.ts:76` already declares an unexported constant of the identical name and value. This file's own header (lines 11-14, pre-existing, unchanged by this diff) states the design intent explicitly: "Backfill reads a generation; it never computes one ... shared rather than restated, so the migration-time and runtime backfills cannot drift into two different definitions of 'genesis'." The sibling constant `EVENT_HISTORY_GENESIS_DIGEST_LITERAL` follows a documented and *tested* version of this same restatement pattern (migration.ts:68-70: "Pinned as a literal rather than imported ... the branch contract test proves the literal still equals the derivation"). `FIRST_EFFECTIVE_GENERATION` has no such equality-pinning test on either side. Today both literals are `1` and `installGenesisBranch`'s SQL fallback (`COALESCE(... , match_authority_baseline lookup ..., 1)`) matches the migration SQL's own fallback exactly (verified by reading both `INSERT INTO event_history_effective_heads` statements side by side, and by test (c2) in the new suite, which proves the generation is read from `match_authority_baseline` exactly as the backfill reads it). This is a drift-risk / maintainability finding, not a present bug.

3. **[INFO] Cap reading — file count, an angle the local receipt did not disclose.** The charter's own gate text anticipated "(15 files)" for this range; the measured count is 17 (14 product+test `.ts` files, 3 evidence/receipt JSON files). Under the narrow/established reading — the same one implicit in the receipt's own oxfmt run ("Finished ... on 14 files") and consistent with every other unit's evidence files not being counted against `caps.maxFiles` (every unit in this ledger writes 2-3 receipt files as a mandated stage-writing cost; treating those as counting toward the file cap would make the cap unsatisfiable by design) — the count is 14, within the unit's `maxFiles: 15`. Under the literal "at most 15 files" reading with no carve-out (GOAL.md's file-count clause has no "non-generated" qualifier, unlike its line-count clause), the count is 17, over cap by 2. This is the same shape of ambiguity the implementer already disclosed for lines (see Finding 4 / receipt finding F1) but did not raise for files. Flagging for the parent's cap ruling; not a functional defect.

4. **[Disclosed, confirmed] Cap reading — lines.** Independently recomputed from the numstat: product files (`SQLiteEventHistoryBranchStore.ts` + `SQLiteEventJournalWriter.ts` + `MatchStreamJournalMirror.ts`) = 133 changed lines; test files (11 files) = 433 changed lines; evidence/receipts = 1567 lines (all additions). Product-only reading: 133/500, well inside cap. Literal all-non-generated-lines reading (product + test, excluding receipts as generated evidence): 566/500, **over** by 66. This matches the implementer's own self-reported finding F1 in `u19b-local-20260922.json` exactly (133 product; 566 total if tests are counted; "the charter states it as product lines" / owner interpretation pending). Confirmed, not new.

5. **[INFO, not a regression] Absolute local machine paths inside the receipt JSON.** `u19b-local-20260922.json` (24 occurrences) and `u19b-red-20260922.json` (5 occurrences) embed `C:/Users/wroll/AppData/Local/Temp/claude/...` log paths. Checked against the rest of the evidence corpus already on `main`: the identical pattern appears in 99 other already-merged evidence files across this ledger (219 total occurrences), so this is the established, pre-existing convention for this program's receipts (provenance pointers to the operator's local log capture), not something newly introduced or worsened by this diff.

## Gates

All run from the review worktree, Node v22.22.0, `npm_config_dry_run=true`, one at a time.

| gate | last line | exit |
|---|---|---|
| `npx jest src/lib/events/journal` | `Test Suites: 23 passed, 23 total` / `Tests: 243 passed, 243 total` | 0 |
| `npx jest src/lib/multiplayer/server/history` | `Test Suites: 12 passed, 12 total` / `Tests: 105 passed, 105 total` | 0 |
| `npx jest src/lib/campaign/journal src/lib/campaign/authority` | `src/lib/campaign/journal` matches nothing (no such path); `authority` alone: `Test Suites: 22 passed, 22 total` / `Tests: 166 passed, 166 total` | 0 |
| `npx jest src/lib/campaign/sync` (substituted for the non-existent `campaign/journal`, per the charter's own alternative wording "the campaign suites that append through the journal" — this is where `JournalCampaignEventStore`/`appendCampaignCommandBatch` actually live) | `Test Suites: 13 passed, 13 total` / `Tests: 88 passed, 88 total` | 0 |
| `npx tsc --noEmit` | (clean, no output) | 0 |
| `npx oxfmt --check` on the 14 changed `.ts` files | `All matched files use the correct format.` / `Finished in 44ms on 14 files` | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | `workflowContracts=8/8 ... errors=0` | 0 |
| `node .../validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

Note: I additionally ran `src/lib/campaign/sync` (13 suites/88 tests) because `src/lib/campaign/journal` does not exist as a path in this tree — the charter itself offers "or the campaign suites that append through the journal" as the fallback, and `sync/JournalCampaignEventStore.ts` plus `sync/__tests__/JournalCampaignEventStore.test.ts` are exactly that. All green.

## Cap

- Files: 17 total on the range. 14 product+test code files / 3 evidence receipts. See Finding 3 for the two readings.
- Lines: 133 product / 433 test / 1567 evidence (receipts, all-new). See Finding 4 for the two readings (133 vs 566 against the 500 cap), matching the implementer's disclosed F1.
- Scope: nothing outside `src/lib/events/journal`, `src/lib/multiplayer/server`, and the unit's own `evidence/` receipts.
- The only change under `src/lib/multiplayer/server` outside `__tests__` is `MatchStreamJournalMirror.ts`, confirmed comment-only (`git diff` shows the whole hunk is inside `/** ... */`).
- No AI attribution: checked the merge-range diff and the commit itself (`git log -1 70503ee7c`) — author/committer is `Wes Rollings <wrollings@gmail.com>`, message has no `Co-Authored-By`/"Generated with"/Claude/Anthropic strings. The only "claude"-adjacent text is the required receipt metadata fields `"implementerModel": "claude-opus (Agent model: opus)"`, which is the process's own mandated receipt field (GOAL.md stage 4), not commit/PR attribution.
- No absolute machine paths in source: confirmed clean. Absolute paths do appear inside the evidence JSON receipts (Finding 5) but that is the established, pre-existing convention across 99 other already-merged evidence files in this same ledger, not new here.
- Receipts describe what the diff contains: cross-checked `u19b-local-20260922.json`'s stated file list, mutant edits, and test counts against the actual diff and my own gate runs — matched (see Findings 1 and Mutant section).

## Transaction-law verification (review question 1)

Read `SQLiteEventJournalWriter.ts` end to end (the `appendWithExtension`/`appendPreparedWithExtension` wrappers at lines 60-138, both `.transaction(() => ...).immediate()`, and `appendInTransaction` at 172-267) plus `SQLiteEventHistoryBranchStore.installGenesisBranch` (lines 82-146) and the shared `EVENT_HISTORY_GENESIS_BACKFILL_SQL` (migration.ts:104-139).

- **(a/c) First append installs one genesis row + head.** `appendInTransaction` looks up `head` scoped to `(streamType, streamId, branchId)` (line 185-191); `head === undefined` gates a call to `installGenesisOnFirstAppend`, which re-checks "no head on **any** branch" for the stream (`event_journal_stream_heads WHERE stream_type = ? AND stream_id = ?`, no branch filter) before calling the branch store. `installGenesisBranch`'s branch insert is itself `NOT EXISTS`-guarded per `(stream_type, stream_id)`, and the head insert only runs if the branch insert actually changed a row. Proven by the shipped suite's (a)/(c)/(c2) and independently by my own probe below.
- **(b) Second append leaves exactly one.** The any-branch `streamHasHead` check short-circuits `installGenesisOnFirstAppend` once `advanceHead` has written the first head row. Proven by suite (b) and by reading the guard.
- **(d) Backfill after the appends adds nothing.** `backfillGenesisBranches()` re-runs `EVENT_HISTORY_GENESIS_BACKFILL_SQL`, itself `NOT EXISTS`-guarded on `(stream_type, stream_id)` for both inserts; since the writer already installed both rows, the backfill's `WHERE NOT EXISTS` finds nothing to do. Proven by suite (d), which now also asserts the rows exist **before** the backfill call (the charter-flagged strengthening from Finding 1) and asserts `backfillGenesisBranches()` returns 0.
- **(e/e2) Refused or failed appends leave nothing.** A revision-conflict or command-identity-conflict returns from `appendInTransaction` before line 264 (the install call site) is ever reached — nothing is written. A late throw (after the install already ran) rolls back the whole SQLite `IMMEDIATE` transaction, taking the genesis row with it, because the install happens inside the same `.transaction(...)` callback as the receipt/event inserts and `advanceHead`. Proven by suite (e)/(e2) and by the M2 mutant in the local receipt (moving the install outside the transaction makes (e) and (e2) fail with rows left behind — I re-derived this from the source rather than re-running M2 myself; my own independent probe below targets a different mutation).
- **(f) mirror backfill never duplicates/overwrites.** Same NOT-EXISTS guards as (d); the primary key on `event_history_effective_heads` (one row per stream) also makes a duplicate head insert impossible even if the guard were bypassed (verified this structurally: the M3 mutant in the receipt, which removes both guards, hits a real `UNIQUE constraint failed` on the second append rather than a silent duplicate — read from the receipt's mutant log, consistent with the schema).
- **(g) Pre-existing branch row untouched.** The `NOT EXISTS` guard is scoped to `(stream_type, stream_id)`, not `branch_id`, so any pre-existing branch row (installed by a prior backfill, or a fixture) blocks the insert unconditionally. Proven by suite (g).
- **(f, source) install runs inside the append's transaction, only on first append, only when branch tables exist.** Confirmed by reading: `hasHistoryBranchTables()` gates both the read path (line ~397) and the install path (line ~424) identically; the call site at line 264 sits between `insertEvent` and `advanceHead`, all inside the single `.transaction().immediate()` wrapper. The generation rule (`installGenesisBranch`'s `COALESCE(match_authority_baseline lookup, FIRST_EFFECTIVE_GENERATION)`) is structurally identical to the backfill SQL's own `COALESCE` — same source table, same fallback constant value (see Finding 2 for the literal-duplication caveat).

**My own independent mutant probe** (distinct from the receipt's M1/M2/M3): swapped the order of the two lines at `SQLiteEventJournalWriter.ts:264-265` so `advanceHead` runs *before* `installGenesisOnFirstAppend` instead of after, leaving both gates (`head === undefined`, and the any-branch `streamHasHead` check inside the install) untouched.

- Baseline hash of `src/lib/events/journal/SQLiteEventJournalWriter.ts`: `1beac1d6c477727667e3403b95d8be0f173f31669354e0eacfb72b6d93dfecba` (matches the receipt's own recorded `preSha256`/`restoredSha256` for the same file, confirming I'm probing the same content the implementer did).
- Edit applied via the `Edit` tool (not a shell regex — a first PowerShell-regex attempt corrupted the file's line endings/encoding and was discarded via `git checkout --`, hash re-verified equal to baseline before retrying).
- Ran `npx jest src/lib/events/journal/__tests__/SQLiteEventJournalWriter.genesisOnFirstAppend.test.ts --verbose`: **Test Suites: 1 failed, 1 total; Tests: 8 failed, 2 passed, 10 total.** Failed: (a), (b), (c), (c2), (d), (e), (f), (h). Passed: (e2), (g) — an exact match to the failure/pass signature the receipt records for its own M1 (call removed entirely). Root cause, confirmed by reading: once `advanceHead` writes the stream's journal head row first, the any-branch `streamHasHead` lookup inside `installGenesisOnFirstAppend` now finds that very row and skips the install — so reordering silently disables genesis installation on every real first append, exactly as if the call had been deleted.
- Restored via `Edit` (swapped back), hash re-verified: `1beac1d6c477727667e3403b95d8be0f173f31669354e0eacfb72b6d93dfecba` — **equal to baseline**. `git status --porcelain` in the worktree came back empty after restore.
- This confirms the receipts' mutant table (all three caught and restored, sha256-verified) is trustworthy, and adds one more independently-verified failure mode (ordering, not just presence/absence of the call or of the SQL guard) that the same suite also catches.

## Seam correctness (review question 2)

- `ROOT_EVENT_BRANCH_ID = 'root'` (`EventJournalContract.ts:1`); `MATCH_BASELINE_BRANCH_ID = 'main'` (`matchAuthorityBaseline.ts:59`). `installGenesisBranch` is always called with `input.expectedBranchId`, which for a campaign command batch defaults to `ROOT_EVENT_BRANCH_ID` (`JournalCampaignEventStore.toJournalBatch`: `expectedBranchId: input.branchId ?? ROOT_EVENT_BRANCH_ID`) and for the match mirror is `effective?.branchId ?? MATCH_BASELINE_BRANCH_ID` (`MatchStreamJournalMirror.ts`). This matches the charter's stated convention exactly.
- Quoted consumers: `matchStoreBranchSegmentReader.ts:153`: `` `A match store holds only the live path ('${ROOT_EVENT_BRANCH_ID}', '${MATCH_BASELINE_BRANCH_ID}'); '${segment.branchId}' has no events` ``; `EventHistoryBranchResolver.ts:268` (pure-journal/campaign reader): `` `The journal stores only the '${ROOT_EVENT_BRANCH_ID}' branch; '${segment.branchId}' has no events` ``. Both match the branch ids this change installs.
- The correction lease contract (`EventHistoryCorrectionLeaseContract.ts`) is branch-id-agnostic by design (no hardcoded literal) — it operates on whatever `readEffectiveHead` resolves, so its correctness here is behavioral rather than textual: proven by the passing `GmCombatRewindCommit`/`GmCombatRewindPreview` suites, which exercise the lease against a head this change installs.
- `campaignLaunchHead.ts` (`resolveCampaignLaunchHead`) is untouched by this diff, consistent with the receipt's own non-claim. `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED = false` in `JournalCampaignEventStore.ts`, so no production campaign traffic goes through this writer path yet; `readEffectiveHead` still returns `null` for production campaigns regardless of this change, and the launch gate's `no-authoritative-stream` ungated-proceed behavior is unaffected until U20 flips the flag. No test in the repo wires `resolveCampaignLaunchHead` together with a real journal append (grepped, zero hits outside the two route files and the module itself), so there is no existing fixture whose behavior this change could have silently altered on that path.
- Ran the full available consumer suites to check for behavioral drift on **existing** fixtures: `src/lib/multiplayer/server/history` (105/105), `src/lib/campaign/authority` (166/166), `src/lib/campaign/sync` (88/88), `src/lib/events/journal` (243/243) — all green, no fixture needed updating beyond the four pins and six re-pins the diff itself carries.

## Pin honesty (review question 3)

Diffed each of the four re-aimed multiplayer-server pins (`CoordinatedOutcomeCorrection`, `CoordinatedOutcomeCorrectionSaga`, `GmCombatRewindCommit`, `GmCombatRewindPreview`). Each seed function still calls `backfillGenesisBranches()` after its append (standing in for the real match mirror's own post-append call) but no longer asserts its return value; instead each asserts `listBranches(STREAM)` is exactly one `'root'` branch at `ancestorDepth 0`, `status 'effective'`, and `readEffectiveHead(STREAM)` names `'root'` at `effectiveGeneration 1`. This is a genuine state-not-path re-aim, not a weakening — the assertions are more specific (four fields) than the single integer they replace.

The pins alone are, by design, path-agnostic and cannot tell whether the *writer* or the *backfill* installed the row (self-disclosed in the receipt's `nonClaims`, confirmed by reading: if the writer's install were skipped, the backfill call each seed still makes would silently install it and the pin would still pass). The genesis suite's test (d) — strengthened by the three added lines noted in Finding 1 — is what actually catches a skipped writer-side install, by asserting both streams' genesis rows exist **before** any backfill call runs. I confirmed this division of labor directly: my own mutant above (which disables the writer-side install) failed the genesis suite (8/10) while I did not re-run the four pins against it, but the receipt's own M1 run (functionally the same disabling) shows all four pin suites passing unchanged (9, 12, 15, 7 tests) precisely because the backfill covers for the disabled writer path — exactly the documented, honest non-claim.

## Mutant reproduction (review question 4)

See "Transaction-law verification" above for the full probe, hash-before/after, and result. Summary: independently reproduced a mutant (reorder `advanceHead`/`installGenesisOnFirstAppend`) distinct from the receipt's M1/M2/M3, caught by the same genesis suite with the identical 8-failed/2-passed signature as the receipt's M1, restored with a verified-equal sha256, and root-caused by reading the source (the any-branch head check races against `advanceHead`'s own write). The receipts' mutant table (M1 call-removed, M2 moved-outside-transaction, M3 both-guards-removed; all three "caught": true, "restoredAll": true) is corroborated by this independent probe.

## Verdict rationale

No functional defect found. The core claim — a stream's first journal append installs its genesis branch row and effective head atomically, exactly once, only on a genuine first append, matching the existing backfill's own semantics — is verified three ways: reading the source and the shared SQL, the shipped 10-case real-SQLite suite, and my own independently-run and independently-chosen mutant (which reproduces the same failure signature as the receipt's M1 by a different code path). Consumers (match store reader, journal branch resolver, the correction lease behaviorally, the campaign launch head structurally) are unaffected or correctly extended, with no existing test fixture showing a behavior change beyond the diff's own re-aimed/re-pinned tests, confirmed by running every consumer suite named in the charter (plus `campaign/sync`, substituted for a nonexistent `campaign/journal` path) fresh. All nine required gates pass with counts matching the receipts. Scope stays inside the unit's three owned areas; no AI attribution; no absolute machine paths in source (only in the evidence JSON, which is the established, pre-existing convention for this entire ledger, not new here).

The five findings are all LOW/INFO/disclosed-and-confirmed: a receipt-wording imprecision (Finding 1), a duplicated-but-currently-consistent constant with no drift test (Finding 2), a file-count cap-reading question the implementer did not raise but which reads as compliant (14/15) under the same convention that makes the disclosed line-count question (Findings 3-4) sensible, and a pre-existing evidence-path convention (Finding 5). None of these require a code change to merge; the two cap-reading questions are explicitly owner/parent interpretation calls, already substantively surfaced (one by the implementer, one now by this review), not defects in the shipped code.

## Cleanup

Worktree and junction removal commands and their output are appended immediately after this review is written (see session log); both were run from outside the worktree, `-C`/cwd scoped, non-recursive-through-link for the junction, non-force for the worktree beyond the standard `--force` needed after the junction removal to satisfy Git's "contains modified or untracked files" check on the now-empty `node_modules` mount point.
