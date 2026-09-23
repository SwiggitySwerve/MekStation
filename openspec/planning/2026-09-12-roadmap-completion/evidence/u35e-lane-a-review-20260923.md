# Lane A review: U35e
reviewedHead: 5eb2aba77157a6c8dfd4ba428b02fa7770bfd4b4
baseline: ae80d8ba41ead66e5dff5fde3f716a0bccd8d6cc
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

Detached worktree created at the exact reviewed head with `git worktree add --detach .../worktrees/u35e-review 5eb2aba77157a6c8dfd4ba428b02fa7770bfd4b4` (confirmed `git rev-parse` on the branch tip resolves to this SHA before creating the worktree). `node_modules` junctioned from the root via PowerShell `New-Item -ItemType Junction`. `npm_config_dry_run=true` exported for the whole session; no `npm install/ci/prune` run. Node confirmed `v22.22.0` via the pinned PATH. No build, no Playwright, no commits/pushes. The root checkout and all sibling worktrees were left untouched (I never `cd`'d into them; only `git -C E:/Projects/MekStation` for the read-only fetch/rev-parse/worktree-add/worktree-remove calls). Worktree `git status --short` was empty at every checkpoint where I claim "clean" below.

## Files on the range

`git diff ae80d8ba41..5eb2aba77 --numstat`: 13 files total, 3012 insertions / 31 deletions.

- Product (7): `campaignCommandPipeline.ts` (+16/-7), `campaignRecordJournalSave.ts` (+10/-3), `campaignRecordJournalState.ts` (new, +125), `campaignSourceGenesis.ts` (+27/-6), `JournalCampaignEventStore.ts` (+52/-12), `journalCapabilityPorts.ts` (+16/-2), `CampaignMigrationMarkerStore.ts` (+6/-1). Product added+removed = 252+31 = 283 lines — matches the local receipt's `productLines: 283` exactly, under the 500 cap.
- Test (3, new): `campaignJournalEffectsFixture.ts` (340), `campaignJournalEffectsSurviveSave.test.ts` (347), `campaignRecordCommandRewrite.test.ts` (237).
- Evidence (3): the three u35e receipts.
- Total 10 non-evidence files, 13 with evidence — under the 15-file cap. All files fall under the unit's declared ownership paths (`src/lib/campaign/authority`, `src/lib/campaign/sync`, `src/services/campaignPersistence`, `src/__tests__/api/campaigns`).
- Single commit `5eb2aba77` in the range; no other commits.

## Findings

**F1 (informational, not blocking).** `src/lib/campaign/authority/campaignRecordJournalSave.ts:103-108`: the genesis-or-checkpoint save now always computes `journalState: readCampaignJournalState(db, campaignId)` and passes it into `campaignSnapshotCommand`, even when `purpose === 'genesis'`. Since a genesis can only commit on an empty stream (the writer's revision guard), this read returns an empty `{pilots:{}, contracts:{}, salvagePool:0}` state at that point and has no observable effect on the resulting event — but it is an extra synchronous SQL read on every genesis committed through this seam (the temporary-flip / future-cutover create path). Not a correctness defect, not in the unit's behavior sentence, not blocking.

**F2 (disclosed by the implementer, confirmed, not blocking).** `src/lib/campaign/authority/campaignSourceGenesis.ts:161-169` (`dayBetween`) and `campaignRecordJournalState.ts:110-115` (`recordAtJournalState`): a stored record with no `campaignStartDate` always projects day 0 (`startTime = currentTime` when `start === undefined`), so the rewrite's date-patch condition (`start !== undefined && ...`) short-circuits and keeps the stored date unchanged. An `AdvanceDay` effect on such a record cannot be represented by the currentDate patch. This is the implementer's self-reported F3 (local receipt `findingsReportedNotFixed`) and matches the charter's `FN-u35e-campaign-without-start-date-projects-day-zero` reference; it is outside the sentence's named fields (balance, currentDate) only in the sense that it's a known edge case, not a hidden defect — the code does not corrupt the date, it leaves it as stored.

**F3 (disclosed, not blocking).** Until U35f lands, a journal-native co-op host's next autosave after a co-op command gets refused (409) and rolled back with a toast (`useCampaignPersistenceStore.ts:825-845`, read below). Confirmed by code that this is reachable ONLY when `isCampaignJournalAuthorityEnabled()` is true, which today requires `NEXT_PUBLIC_E2E_MODE==='true'` AND `MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY==='1'` (`campaignJournalAuthorityEnabled.ts:20-27`) since `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` is hardcoded `false` in production (`JournalCampaignEventStore.ts`). Not a production regression today.

**F4 (disclosed, out of the unit's sentence, not blocking).** Combat-outcome consequences append through the store's separate `appendCombatOutcomeBatch` (not `appendCommandBatch`) and do not rewrite the row; `SalvageAllocated.recoveredUnit`/`RosterUnitChanged` roster effects are represented in the envelope (`rosterProjection`) but neither carried by the checkpoint nor patched by the rewrite. Matches the implementer's F1/F2. Correctly outside the sentence, which names pilots/contracts/salvagePool and balance/currentDate only.

No finding rises to REQUIRED-EDITS or REJECT level: every gap above is either a no-op inefficiency, a pre-existing/disclosed edge case that leaves data unchanged (never corrupted), or explicitly out of the unit's letter.

### Q1 — chokepoint (independently traced)

`grep` for every non-test call site of `appendCampaignCommandBatch` found exactly 6, plus the store's own `appendCommandBatch`:

| Caller | File:line | Passes hook? |
|---|---|---|
| Command route (`executeCampaignCommand`) | `campaignCommandPipeline.ts:553` | **Yes** — 3rd arg `rewriteCampaignRecordAfterCommand` |
| Store's `appendCommandBatch` (co-op door reaches this) | `JournalCampaignEventStore.ts:432` | **Yes** — passes `this.rewriteRecordAfterCommand` |
| Baseline import | `campaignAuthorityMigration.ts:199` | No — 2-arg call, no hook |
| Genesis (`appendCampaignGenesis`, the flag-false/legacy seam) | `campaignSourceGenesis.ts:288` | No — 2-arg call, no hook |
| Replacement replay | `CampaignReplacementReplay.ts:136` | No — 2-arg call, no hook |
| Outcome correction | `CoordinatedOutcomeCorrectionTarget.steps.ts:253` | No — 2-arg call, no hook |
| Single-event facade (`appendEvent`) | `JournalCampaignEventStore.ts:490` | No — 2-arg call, no hood |

Read each call site directly (not just grepped) and confirmed none of the "No" rows pass a 3rd argument. AcceptContract does not go through this function at all — it has its own transaction in `campaignAcceptContractCommand.ts` (confirmed unchanged: not in the diff).

Co-op door binding: `src/lib/multiplayer/server/getCampaignEventStore.ts:119-123` — `selectCampaignEventStore()` constructs `new JournalCampaignEventStore(campaignJournal(), undefined, { capabilityPorts: bindJournalCapabilityPorts })` whenever `getSQLiteService().isInitialized()`, **unconditionally**, independent of the journal-authority flag. `bindJournalCapabilityPorts` (`journalCapabilityPorts.ts:220-235`) does `Object.assign(store, { rewriteRecordAfterCommand: rewriteCampaignRecordAfterCommand })` as its first line, before the branch-ports conditional — so every SQLite-backed store this selector returns (dev or prod) gets the rewrite capability. Confirmed by reading the full function body, not inferred.

No command caller that should rewrite is missing the hook; every caller that must NOT rewrite (genesis/import/replay/outcome-correction/single-event facade) correctly does not.

### Q2 — one transaction, measured

Ran the three specified `npx jest` gates myself (`src/lib/campaign`, `src/services/campaignPersistence`, `src/__tests__/api`, `src/__tests__/unit/api`, `src/lib/multiplayer/server`, `src/lib/events/journal`) — see Gates section; all match the local receipt's counts exactly.

**Red reproduction (independently performed):** recorded sha256 of the 7 head product files (all matched the local receipt's recorded values exactly), then `git checkout ae80d8ba41 -- <the 6 existing product files>` and `rm campaignRecordJournalState.ts` (the baseline had no such file), leaving the head's 3 new test files in place. Ran:
- `npx jest campaignJournalEffectsSurviveSave.test.ts` → **6 failed, 6 total** (r1, r2, r3, c1, c2, s all red) — matches the red receipt exactly, including the specific failure values (e.g. row (s): expected 367655, received 380500; row c1: expected `['pilot-c1']`, received `[]`).
- `npx jest campaignRecordCommandRewrite.test.ts` → **2 failed, 3 passed, 5 total** (g/n/a pass as pre-existing baseline behavior; t/i fail) — matches the red receipt exactly.

Restored the head's 7 product files with `git checkout 5eb2aba77 -- <the 7 files>` and verified sha256 identical to the pre-mutation values for all 7 (see command output above); `git status --short` empty afterward.

**What a throw inside the hook rolls back (from the code + an existing test I re-ran):** `appendWithExtension` (`SQLiteEventJournalWriter.ts:65-80`) wraps `extend(this.db, () => this.appendInTransaction(...))` inside `this.db.transaction(() => ...).immediate()`. The hook call sits inside that same `extend` callback (`JournalCampaignEventStore.ts:306-321`), so a throw inside it propagates out of the whole `db.transaction()` wrapper, which better-sqlite3 rolls back atomically — **the event append itself is undone, not just the row rewrite.** Confirmed empirically by re-running row (t) (`campaignRecordCommandRewrite.test.ts:151-186`), which mocks `campaignRecordRow.write` to throw and asserts both `eventTypes(id)` and `storedRow(id)` are unchanged after the failed hire — this passed in my full-suite run.

### Q3 — idempotency, probed

Read the actual test body for row (i) (`campaignRecordCommandRewrite.test.ts:190-230`): two separate `JournalCampaignEventStore` instances from `selectCampaignEventStore()` (sharing the same underlying SQLite connection) send `Promise.all([first.appendCommandBatch(id, input), second.appendCommandBatch(id, input)])` with the **identical** commandId. Traced the mechanism: the store's own `prior = await this.getCommandReceipt(...)` pre-check (`JournalCampaignEventStore.ts:415-424`) can race across the two concurrent calls, but the actual `.transaction().immediate()` calls on a single better-sqlite3 connection execute fully synchronously and serially — so by the time the second transaction runs, the writer's own `existing = this.findReceipt(commandId)` check inside `appendInTransaction` (`SQLiteEventJournalWriter.ts:176-182`) finds the first's committed batch and returns the cached result via `hydrateBatch`, without a new write. The wrapper's own `recorded` pre-check (`JournalCampaignEventStore.ts:308-316`, querying the same `event_journal_batches` table `findReceipt` uses) reflects this correctly and gates the hook: `!recorded && appended.kind === 'committed'`. I re-ran this suite (via my full `src/__tests__/api` run and standalone during mutant testing) and row (i) passed both times, asserting the row stays at `version: 1` (created once) after both concurrent appends.

This test covers both parts of Q3: the retried-command-doesn't-double-advance-version case, and the writer's-recorded-command-path-skips-the-hook case, in one assertion (the second append's `committed` result comes from the cached-batch path, and it does not rewrite).

### Q4 — concurrency, probed

(a) Stale-PUT-after-command → 409 with rewritten record, no further append: confirmed by re-running rows r1/r2/r3/c1/c2/s (all pass on head — see Gates and Q2); the 409 body carries `current` = the post-command row (`campaignRecordJournalState.ts:88-95` write-back plus `[id].ts:236-243` returning `result.current`), and `campaignRecordJournalSave.ts:94`'s early return on a refused plan means nothing is appended for a refused whole-envelope save (traced in code; the PUT path for a stale envelope goes through `CampaignPersistenceService.ts`'s CAS, not through `appendCampaignCommandBatch`, so there is no append to roll back in the first place).

(b) Snapshot-authority campaign untouched by a co-op command: confirmed by re-running row (a) (`campaignRecordCommandRewrite.test.ts`), which passed, and by the authority gate's code (`campaignRecordJournalState.ts:79`: `if (marker.kind !== 'ok' || marker.marker.state !== 'journal') return;`). `CampaignAuthorityMigrationState` has exactly 4 values (`legacy | shadowing | journal | blocked`, `campaignAuthorityMigration.ts:44-48`); only `'journal'` gates the rewrite in, which is correct given `createJournalNativeMarker` writes `'journal'` directly (no `'shadowing'` phase is used by the code paths this unit touches).

(c) Read `useCampaignPersistenceStore.ts:825-845` directly: on a `conflict` result for a co-op campaign, it calls `rollbackCoopCampaign(set, get, attempt.conflictServerRecord)` and `notifyUnresolvedCoopSave('Co-op campaign save was refused: the campaign changed elsewhere. Your local change was rolled back.')` — confirms the rollback-with-toast behavior on the FIRST refusal (not a second retry). Confirmed the PR's "only journal-native co-op campaigns (today only e2e-armed runs) see it" claim by tracing `isCampaignJournalAuthorityEnabled()` (`campaignJournalAuthorityEnabled.ts:29-32`: `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED || e2eJournalAuthorityArmed()`) and `e2eJournalAuthorityArmed()` (lines 20-27, requiring both `NEXT_PUBLIC_E2E_MODE==='true'` and `MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY==='1'`), and by reading `[id].ts:198-205` where a fresh campaign's `purpose` is `'genesis'` only when `isCampaignJournalAuthorityEnabled()` is true, otherwise it falls to the plain `saveCampaign` (snapshot-authority, no marker) path. Production has `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` hardcoded `false`, so this claim holds today.

### Q5 — checkpoint carry-forward

Traced the full path: `campaignRecordJournalSave.ts:103-108` reads `journalState` and passes it to `campaignSnapshotCommand` (`campaignSourceGenesis.ts:203-260`), which overrides `pilots`/`contracts`/`salvagePool` on the projected state (lines 213-221) and puts the resulting `state` directly into the `CampaignSnapshotPublished` event's `payload.state` (line 236). `applyCampaignEvent.ts:75` (`CampaignSnapshotPublished: (_state, event) => event.payload.state`, unchanged by this diff) then adopts that payload wholesale on replay — closing the loop. Confirmed nothing else the journal owns is still rebuilt empty for these three fields; roster/faction-standing are correctly out of the sentence (F4 above).

Independently re-ran rows r3 (HirePilot via the route, pilot survives a stale PUT), c1 (HirePilot via co-op door, pilot survives the host fold PUT) and c2 (AcceptContract + salvage via co-op door, contract and pool survive) — all passed on head, all failed on baseline in my own red reproduction (Q2).

`readCampaignJournalState`'s SQL (`campaignRecordJournalState.ts:44-64`) filters `WHERE stream_type = ? AND stream_id = ? AND branch_id = ?` with `stream_id = campaignId` and `branch_id = ROOT_EVENT_BRANCH_ID` — confirmed scoped to this campaign's own stream and the root branch only, by direct read of the query (not run against a two-campaign fixture myself; the suite's own row (g) — "a genesis carries no journal state, even beside a campaign whose journal holds a pilot" — exercises cross-campaign isolation and passed in my run).

Genesis byte-identity: **verified by code trace, not by an executed byte-diff.** `appendCampaignGenesis`'s call to `campaignSnapshotCommand` (`campaignSourceGenesis.ts:279-283`) never sets `journalState`, so `input.journalState === undefined` and `state = projected` — the exact same computation the baseline made (the only change to `campaignSnapshotCommand` is the added branch, which is a no-op when `journalState` is absent). I did not additionally construct and hash-compare two genesis event payloads across the two commits; this is INFERENCE from the unchanged code path, not a measured byte comparison. Note F1 above: the *other* genesis path (`saveCampaignRecordThroughJournal`'s `purpose: 'genesis'`) now does pass a `journalState`, but it is provably empty for a genesis (empty stream), so it does not change genesis bytes either — also code-traced, not byte-diffed.

### Q6 — the envelope patch

`recordAtJournalState` (`campaignRecordJournalState.ts:105-125`) patches exactly two fields: `body.finances.balance <- state.balance` (always) and `body.currentDate` (only when `start !== undefined && dayBetween(start, body.currentDate) !== state.day`, via `addCampaignDays(new Date(start), state.day)`). A record with no `campaignStartDate` keeps its stored date unconditionally (F2 above; `dayBetween` returns 0 without a start, so the projected day can never diverge in a way the guard would catch — the guard's `start !== undefined` check alone is what keeps the date untouched). Everything else is spread verbatim from `stored` (`{...stored, version, body: {...body, currentDate, finances}}`) — confirmed no other field is touched by reading the full function body.

### Q7 — the recorded-command check

`appendCampaignCommandBatch`'s wrapper (`JournalCampaignEventStore.ts:303-321`) runs its `recorded` query and the `afterCommit` call inside the same `extend` callback that `appendWithExtension` invokes inside `this.db.transaction(() => extend(...)).immediate()` (`SQLiteEventJournalWriter.ts:65-80`) — so yes, the read is inside the same immediate transaction as the append, for every writer outcome: a fresh commit (`recorded=false`, `appended.kind==='committed'` → hook runs), a recorded-command replay (`recorded=true` → hook skipped regardless of `appended.kind`), and a conflict (`appended.kind !== 'committed'` → hook skipped by the `&&` condition). The query itself (`SELECT 1 AS ok FROM event_journal_batches WHERE command_id = ?`) reads the identical table and column `findReceipt` (the writer's own dedup check) uses, so both checks agree by construction.

### Q8 — independent mutant (not M1-M6)

Mutated `recordAtJournalState`'s balance patch: changed `finances: { ...body.finances, balance: state.balance }` to `finances: { ...body.finances }` (drops the balance overwrite entirely, leaving the row's stale balance on every rewrite, while the hook still fires, the transaction still wraps it, and the authority gate is untouched — orthogonal to all of M1 (pilots-carry), M2 (hook not passed), M3 (outside transaction), M4 (cross-campaign genesis leak), M5 (replay guard removed) and M6 (authority gate removed)).

Ran both new suites against the mutant: **4 failed, 7 passed, 11 total.** Failures: (r1) SpendFunds — expected `stalePutCurrent.balance: 367655`, got `380000`; (r3) HirePilot; (c1) HirePilot via co-op door — expected `{balance: 368000, version: 2}`, got `{balance: 380000, version: 2}`; (s) stale PUT after SpendFunds — expected `balance: 367655`, got `380000`. Passed: (r2) AdvanceDay (doesn't touch balance), (c2) AcceptContract/salvage (doesn't touch balance), and all 5 guard rows (g/n/a/t/i — none assert balance). Mutant caught.

Restored via `git checkout 5eb2aba77 -- campaignRecordJournalState.ts` (a first attempt using the Edit tool was silently reformatted to double quotes by an environment hook before I could verify it — re-did the restore via `git checkout` instead, which is exact). Confirmed `sha256sum` = `2ecb1c536f91d0ea2cbec667b1a7ba69199d0f5a7a7131cc2dbd35a8456ca548`, identical to the pre-mutation value and to the local receipt's recorded sha256 for this file. `git status --short` empty afterward.

### Q9 — gates on the head (all independently run, all match the local receipt)

| Gate | Result | Matches receipt |
|---|---|---|
| `npx jest src/lib/campaign` | 203 suites / 2973 tests passed | Yes |
| `npx jest src/services/campaignPersistence` | 4 suites / 23 tests passed | Yes |
| `npx jest src/__tests__/api` | 57 suites / 772 tests passed | Yes |
| `npx jest src/__tests__/unit/api` | 6 suites / 35 tests passed | Yes |
| `npx jest src/lib/multiplayer/server` | 157 suites / 1164 tests passed | Yes |
| `npx jest src/lib/events/journal` | 23 suites / 243 tests passed | Yes |
| `npx tsc --noEmit` | exit 0, no output | Yes |
| `npx oxlint` | 84 warnings, 0 errors, exit 0 | Yes (matches `versusBaselineWarnings: 84`) |
| `npx oxfmt --check` (10 changed files) | "All matched files use the correct format", exit 0 | Yes |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | Yes |
| `npm run qc:openspec-ci:validate` | `errors=0`, same counts | Yes |
| roadmap validator | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | Yes |

### Q10 — scope and cap

Files: 10 non-evidence (7 product, 3 test) + 3 evidence = 13 total, all under the declared ownership paths — within the 15-file cap. Product lines 283 (added 252 + removed 31) — within the 500-line cap. No AI attribution found in any of the 10 changed files or in the single commit message/body (`grep` for claude/anthropic/co-authored/generated-with came back empty). No absolute machine paths (`C:\Users`, `E:\Projects`, `/c/Users/wroll`) found in the 10 product/test files (the machine paths in the evidence JSON receipts are expected — those are receipts, not code).

Runtime imports: `git diff` of the value-import lines (excluding `import type`) for `JournalCampaignEventStore.ts` — baseline and head are byte-identical line-for-line; the only new import is `import type Database from 'better-sqlite3'`, which is type-only and erased at compile time. This module is the one the admission flagged as browser-reachable (`createDefaultCampaignEventStore`), and it gains no new runtime import. `journalCapabilityPorts.ts` and the new `campaignRecordJournalState.ts` do gain new runtime imports, but both are already server-only: `journalCapabilityPorts.ts` was already excluded from the client bundle before this change (its own baseline imports include `getSQLiteService`, `AuthorizedViewerResolver` from `multiplayer/server`, and the `JournalCampaignEventStore.ts` comment states "Client-reachable sites omit it so webpack never follows journalCapabilityPorts into node:crypto"), and I confirmed `campaignCommandPipeline.ts` (the other importer of the new module) is reached only from `pages/api/campaigns/[id]/commands.ts` (a Next.js API route) and `campaignAcceptContractCommand.ts` — no client component or store imports it.

Comment accuracy: read every added/changed function's doc comment against its code. All checked claims verified true:
- `readCampaignJournalState`: "does not re-verify each event's digest" — confirmed, the raw SQL read has no digest check.
- `rewriteCampaignRecordAfterCommand`: "inside its transaction, so a throw here rolls the append back" — confirmed (Q2); "Writes nothing when the campaign has no saved record, or when its cutover marker is not in journal state" — confirmed by the two early returns.
- `recordAtJournalState`: "Every other field ... is kept as stored" — confirmed by the spread.
- `appendCampaignCommandBatch`'s updated doc: "afterCommit runs on its handle in the same transaction when the batch committed and its command id had no recorded batch before" — confirmed (Q7).
- `bindJournalCapabilityPorts`: "The saved-record rewrite (U35e) is attached here too" — confirmed, unconditional `Object.assign` at the top of the function.
- `readCampaignMigrationMarker`: "db (default: the service handle; a journal writer's transaction passes its own)" — confirmed by the default parameter.
- `campaignCommandPipeline.ts`'s updated doc: "AcceptContract rewrites it in its own [transaction]" — confirmed AcceptContract's file is untouched by this diff and has its own row-write path.

No comment claims a guarantee, bound, or invariant the code beneath it does not implement.

## Gates

See the Q9 table above for exact commands, last lines/counts and exit codes — all captured directly from my own terminal runs in the review worktree, all matching the local receipt.

## Cap

Within caps: 10 non-evidence files (≤15), 283 product lines (≤500). No forbidden content found (AI attribution, absolute machine paths, `file:` deps — none of the latter apply here).

## Verdict rationale

Every one of the ten review questions was answered from code I read directly and/or from suites I ran myself in an isolated, detached worktree, with results matching the implementer's receipts exactly wherever a receipt made a checkable claim (test counts, gate outputs, sha256 restores). I additionally red-reproduced the baseline failure myself (not just trusted the red receipt), and independently authored and reproduced a mutant outside the implementer's M1-M6 set, which was caught by the existing suite. The chokepoint, transaction boundary, idempotency mechanism, authority gate, and envelope-patch logic all trace cleanly through the code with no gaps between what the comments/receipts claim and what the code does. The four findings above are disclosed, non-corrupting residuals or a trivial inefficiency, not defects — none require an edit before merge. This unit's authority/idempotency/concurrency/migration review classes still require the separate Lane B owner ruling per DELIVERY.md step 5; that is out of Lane A's scope and does not change this verdict.

**Verdict: APPROVE**
