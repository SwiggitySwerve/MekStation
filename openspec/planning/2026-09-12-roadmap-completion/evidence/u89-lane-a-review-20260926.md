# Lane A review: U89
reviewedHead: 0c080f3e9c29894439a256aa41f1bff8e4784f48
baseline: 0dc74d7e702cac668eb44c3ad131cb7e8230d4b2
reviewerModel: claude-sonnet (Agent model: sonnet, lean-worker)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (exit 0, no new refs).
- `git -C E:/Projects/MekStation worktree add --detach E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u89-review d51ac1278b472d770f03e052f2f6c569076332b2` — succeeded; `git log -1 --format='%H %s'` in that worktree printed `d51ac1278b472d770f03e052f2f6c569076332b2 perf(campaign): the host-intent path reads the journal since its last head: ...` (exact reviewed head).
- `New-Item -ItemType Junction -Path ...\u89-review\node_modules -Target ...\MekStation\node_modules` — succeeded.
- `node --version` → `v22.22.0` (PATH set to the Node 22 nvm dir per charter).
- `npm_config_dry_run=true` exported before every npm/npx invocation; no install/ci/prune/build/Playwright/server run at any point.
- No edit made to the root checkout or to the `u89` (implementer) or `u42`/`u42-review` worktrees; only `u89-review` was touched, and it is clean (`git status --short` empty, `git diff --stat` empty) at the end of this review.
- Read: `openspec/planning/2026-09-12-roadmap-completion/GOAL.md`, `DELIVERY.md` (step 5's Lane A/Lane B split), `units.json` U89 entry on `origin/main` (still `state: "planned"`, receipts null — the fold has not landed, matching the charter's note), `evidence/uat-r1-diagnosis-20260925.json` (F-perf-E2E-71-72-73, mode 2 and the O(N) heal/highestSequence root cause it names), and the three implementer receipts (`u89-admission-20260926.json`, `u89-red-20260926.json`, `u89-local-20260926.json`) from the implementer's worktree `.../worktrees/u89/openspec/planning/2026-09-12-roadmap-completion/evidence/` (main has no `evidence/u89-*` files yet — confirmed absent on `origin/main`).
- Read the diff `git diff 0dc74d7e702cac668eb44c3ad131cb7e8230d4b2..d51ac1278b472d770f03e052f2f6c569076332b2` in full, plus the read-only context files the charter named (`bindCampaignSyncConnection.ts`, `CampaignHostRegistry.ts`, `campaignJournalReads.ts`, `JournalCampaignEventStore.ts`, `SQLiteEventJournal.ts`, `CampaignMatchHost.ts`, `CampaignSyncSession.ts`) in the `u89-review` worktree at the exact reviewed head.

## Files on the range

`git diff --stat 0dc74d7e702cac668eb44c3ad131cb7e8230d4b2..d51ac1278b472d770f03e052f2f6c569076332b2`:
```
src/lib/campaign/sync/JournalCampaignEventStore.ts                              |  22 +-
src/lib/campaign/sync/campaignJournalReads.ts                                   |  45 ++-
.../campaignHostIntentServerTime.test-helpers.ts                                | 391 +++++++++++++++++++++
.../__tests__/campaignHostIntentServerTime.test.ts                              | 168 +++++++++
.../healCommittedParticipantRemovals.test.ts                                    | 208 +++++++++++
.../server/bindCampaignSyncConnection.ts                                        |  27 +-
6 files changed, 846 insertions(+), 15 deletions(-)
```
6 files, all under the owned paths (`src/lib/multiplayer/server`, `src/lib/campaign`), one commit (`git log 0dc74..d51ac --oneline` → one line, no AI-attribution text in `%s%n%b`). `git diff --numstat` on the 3 product files gives 19+35+25=79 added, 3+10+2=15 removed → 94 changed lines, matching the receipt's `productTotals.changedLines: 94` exactly.

## Findings

**1. (MEDIUM, test-coverage gap on a claimed concurrency property) `JournalCampaignEventStore.heads` per-campaign isolation is unverified anywhere in the test suite.** `src/lib/campaign/sync/JournalCampaignEventStore.ts:387` keys the memoized head by `campaignId` and the admission/local receipts explicitly claim "the journal store keeps the last head it read **per campaign**." I built a mutant not in the implementer's M1-M4 set — `JournalCampaignEventStore.ts:533,536`, changing `this.heads.get(campaignId)` / `.set(campaignId, head)` to a single shared key (`'__M5_SHARED__'`) — and ran `npx jest src/lib/multiplayer/server src/lib/campaign` against it: **`Test Suites: 369 passed, 369 total; Tests: 4188 passed, 4188 total` (exit 0) — the mutant survived the entire suite undetected.** By trace this is not a live bug today: every call site constructs a fresh `JournalCampaignEventStore` per campaign/call (`CampaignHostRegistry.ts:287` inside `register()`, `resolveCampaignAuthorityFromStores.ts:70`, `campaignAuthorityCutoverOps.ts:149` all do `new JournalCampaignEventStore(...)`), so no store instance currently serves two campaigns. But if a future change ever reused one store instance across campaigns, this defect would silently return another campaign's (possibly much higher) head to `highestSequence()`, and `CampaignSyncSession.evaluateScenarioLaunch`'s `requiredRevision` (CampaignSyncSession.ts:753-776) would then compare guest acknowledgements against a borrowed, inflated revision — a permanent progression lock for the second campaign, not merely a benign collision — with zero test signal. I grepped every `*.test.ts` under `src/` for two distinct campaign-id literals passed to `.highestSequence(...)` on one store instance and found none. Recommend: a regression test asserting `store.highestSequence(campaignA)` and `store.highestSequence(campaignB)` on one `JournalCampaignEventStore` instance stay independent, added before merge (test-only; does not touch the 500-line product cap).
Restored: `git diff --stat -- src/lib/campaign/sync/JournalCampaignEventStore.ts` showed the 2-line mutation; `git checkout --` restored it; `sha256sum` afterward = `1e44b7f336dd52f39d9f381431016c9f3df7ec80ddafa64ceda2431128ca745e`, matching the head blob and the receipt.

**2. (LOW, disclosed) The revision-2 red-row floor can still flake on a loaded CI worker.** The rule is `(median1000 > 2×median50 AND median1000 > 5ms) OR median1000 > 50ms` (`campaignHostIntentServerTime.test.ts:155-163`). My 3 independent runs on the head measured `healRead`/`gateHighestSequence`/`commitHighestSequence`/`adoptHighestSequence` medians all in the 0.10-0.42 ms range at both sizes — sub-millisecond values with almost no headroom under the 5 ms floor. A GC pause or scheduler stall of a few milliseconds on a busy shard could push one of these over both the 2x and 5 ms clauses. This is already disclosed by the implementer (`local` receipt `risksForTheParent[1]`, and the pre-existing `FN-u86-machine-idle-blind-to-jest` finding that `machine-idle.mjs` cannot see a concurrent jest shard), so it is not a hidden risk, and it runs in the default `src/lib/multiplayer/server` jest scope (part of the 4188-test gate), not a new isolated flake surface. Not blocking; noting for the record per the charter's question 3.

**3. (Informational, correctly scoped) Three growing steps outside the fix shape are recorded, not fixed, and I confirm that scoping is correct.** `FN-u89-grant-wake-projects-whole-stream`, `FN-u89-record-rewrite-folds-whole-stream`, `FN-u89-put-route-grows` are all whole-stream *projections* (grant-wake fan-out, the record-rewrite fold, the item-route PUT), not head/since-sequence reads; the unit's behavior sentence authorizes only "reading the stream head or an indexed maximum instead of scanning," not a projection redesign. Confirmed by reading `campaignRecordJournalState.ts` and the grant-wake call chain: neither was touched by the diff (diff stat above), consistent with the findings' claim.

No other defects found. Every comment I checked against the code beneath it was accurate (see Cap section).

## Question 1 — heal correctness (bindCampaignSyncConnection.ts:877-896)

(a) Every committed removal is re-applied every pass: `healed.removals` (module-level `WeakMap<ICampaignHostRegistryEntry, {nextSequence, removals}>`, :194-198) is never cleared and is passed whole to `applyCommittedParticipantRemovals` on every call (:895), so a removal whose revoke failed on an earlier pass is retried on every later pass. I ran the (before) row independently: `npx jest .../healCommittedParticipantRemovals.test.ts` → `PASS ... (before) heals a removal read by an earlier pass whose revoke failed, from a read that starts after it (62 ms)`.
(b) A removal committed after the remembered sequence is read next pass because the read is `getCampaignEvents(healed.nextSequence)` (:887-889) and `readCampaignJournalEvents` returns "every campaign event with sequence >= fromSeq" (`campaignJournalReads.ts:25`, `afterRevision = fromSeq` and revision N+1 stores sequence N). I ran the (after) row independently: `PASS ... (after) heals a removal committed after the remembered sequence with no revoke at all (15 ms)`.
(c) The remembered sequence advances only from rows this call actually fetched (`healed.nextSequence = event.sequence + 1` inside the `for (const event of events)` loop, :890-893), never from a head read before the await; the guard `if (event.sequence < healed.nextSequence) continue` (:892) compares against the live (possibly-advanced-by-an-overlapping-pass) value, so two passes racing across the `await getCampaignEvents(...)` either both see the same rows (no skip, redundant no-op re-check) or the later-resuming pass skips only rows the other pass already folded into the same shared `removals` array — no row is ever skipped without being read by someone.
(d) A rebuilt/replaced/adopted entry starts from a full read because `healedLogs` is a `WeakMap` keyed by the `ICampaignHostRegistryEntry` object, and `CampaignHostRegistry.register()` always does `const entry = new CampaignHostRegistryEntry(...)` (`CampaignHostRegistry.ts:322`) on every call, including the `rebuilt: true` path from `getOrCreate` (:386-393) — a new object is never present in the WeakMap, so `healedLogs.get(entry) ?? {nextSequence: 0, removals: []}` (:886) defaults to sequence 0.

## Question 2 — highestSequence with a remembered head

`readCampaignJournalHead` (`campaignJournalReads.ts:56-77`) only ever sets `head` from a row it actually read off `journal.readStream(...)` (`last.streamRevision`/`envelopeOf(last).sequence`), never invented or advanced speculatively, so a remembered head can never report a value above the true committed max; the next call passes it back as `afterRevision` and `SQLiteEventJournal.readStream` uses `stream_revision > ?` (`SQLiteEventJournal.ts:19`, the `UNIQUE(stream_type, stream_id, branch_id, stream_revision)` index), so any row a concurrent writer appended past that head is found. `grep -rniE "rewind|truncat" src/lib/campaign src/lib/events` shows "rewind" is a higher-level candidate-branch workflow (`CampaignBranchAnchor.ts`, `EventHistoryImpactDerivation.ts`) layered over a physically append-only journal (`event_journal_events_no_update`/`_no_delete` triggers, confirmed independently in `SQLiteService.eventJournal.migration.ts:133-136`) and `EventHistoryBranchResolver.ts:268` states "the journal stores only the 'root' branch" — no code path deletes or updates root-branch rows, so a cached head is never invalidated by a rewind. Per-campaign: `this.heads` is a `Map<string, ICampaignJournalHead>` keyed by `campaignId` (`JournalCampaignEventStore.ts:387,533,536`) — but see Finding 1: this per-campaign property has no regression test.

## Question 3 — timing row

3 independent runs on the head (machine-idle checked before each; the first attempt was invalidated by a concurrent `next build --webpack` reported `MACHINE_BUSY 1` and was discarded before any jest ran):
- Run 1: `Tests: 3 passed, 3 total`; healRead 0.306→0.235ms, gateHighestSequence 0.165→0.130ms, commitHighestSequence 0.126→0.111ms, adoptHighestSequence 0.178→0.175ms, deliverToGuest 2.268→3.895ms — redRow all `grows:false`.
- Run 2: `Tests: 3 passed, 3 total`; healRead 0.419→0.316ms, gateHighestSequence 0.253→0.150ms, commitHighestSequence 0.189→0.105ms, adoptHighestSequence 0.220→0.137ms, deliverToGuest 3.084→3.567ms — redRow all `grows:false`.
- Run 3: `Tests: 3 passed, 3 total`; healRead 0.270→0.247ms, gateHighestSequence 0.203→0.142ms, commitHighestSequence 0.117→0.105ms, adoptHighestSequence 0.160→0.217ms, deliverToGuest 2.151→3.877ms — redRow all `grows:false`.
Median-of-3 at 1000 events: healRead 0.247ms, gateHighestSequence 0.142ms, commitHighestSequence 0.105ms, adoptHighestSequence 0.175ms — all under 0.35 ms, matching the charter's claim; deliverToGuest median 3.877ms, matching the charter's "3.7 ms" claim. Grow rule and its CI-flake exposure: see Finding 2. Harness leaves no product instrumentation: `git diff ... -- <3 product files> | grep -iE "perf_hooks|performance\.now|U89_|__test"` returned nothing; the harness (`campaignHostIntentServerTime.test-helpers.ts`) times exclusively via `jest.spyOn` on class prototypes plus `node:perf_hooks performance.now()`, test-file-local.

## Question 4 — reproduce red

Restored `git show 0dc74d7e702cac668eb44c3ad131cb7e8230d4b2:<path>` into all 3 product files (sha256 before restore matched the head blobs exactly). `U35E_ROWS_DIR=... U89_LOG_SIZES=50,1000 npx jest campaignHostIntentServerTime.test.ts` → `Tests: 1 failed, 2 passed, 3 total`, red row failed with all four steps `grows:true` (healRead 7.54→105.27ms, gateHighestSequence 7.22→110.99ms, commitHighestSequence 6.60→103.43ms, adoptHighestSequence 7.18→105.36ms) — same conclusion as the receipts' 60-73ms figures, this run ran somewhat hotter but the fail mode and ~15x growth are identical. `npx jest healCommittedParticipantRemovals.test.ts` on the same restored baseline → `Tests: 2 failed, 2 total`, both (before) and (after) fail (`expect(healRead).toBeGreaterThan(removal.sequence)` got `0` not `>1`; `expect(reads[0]).toBe(remembered)` got `0` not `1`) — both heal rows fail because the baseline always reads from sequence 0. Restored the head versions via `git checkout --` and re-verified sha256 for all three files matches the head blobs exactly (`110551352be3...`, `1e44b7f336dd...`, `d316df99881e...`); `git status --short` clean.

## Question 5 — independent mutant

See Finding 1 (M5-head-shared-across-campaigns): not one of M1-M4, killed nothing in `npx jest src/lib/multiplayer/server src/lib/campaign` (4188/4188 passed) — a genuine test-coverage gap, not a live defect. Restored and sha256-verified.

## Gates (all run independently in the `u89-review` worktree at the reviewed head)

| Gate | Command | Exit | Last line / result |
|---|---|---|---|
| Focused jest | `npx jest src/lib/multiplayer/server src/lib/campaign` | 0 | `Test Suites: 369 passed, 369 total; Tests: 4188 passed, 4188 total` |
| tsc | `npx tsc --noEmit` | 0 | (no output) |
| oxlint | `npx oxlint` | 0 | `Found 84 warnings and 0 errors.` |
| oxfmt --check | `npx oxfmt --check` on the 6 changed files | 0 | `All matched files use the correct format.` |
| lint:units | `npm run --silent lint:units` | 0 | `LINT_UNITS_PASS 17899/17899 (src-tests files=3210 findings=17783 ceiling=17783 PASS)` |
| openspec validate | `npm run --silent qc:openspec-ci:validate` | 0 | `[qc:openspec-ci] workflowContracts=8/8 ... errors=0` |
| roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | 0 | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` |

Every gate's exit code and last line matches the implementer's `local` receipt exactly.

## Cap

- Product files: 3, all under `src/lib/multiplayer/server` and `src/lib/campaign` (the unit's owned paths). Product lines: 94 (79 added, 15 removed via `git diff --numstat`), under the 500-line cap.
- Total files: 6, under the 15-file cap.
- No AI attribution: `git log 0dc74..d51ac --format='%H %s%n%b' | grep -iE "claude|generat|co-authored|ai-assist|anthropic"` → no match.
- No absolute machine paths: `git diff 0dc74..d51ac | grep -iE "E:[\\/]|C:[\\/]Users|wroll"` → no match.
- Comments checked against code: the heal function's guarantee comment (`bindCampaignSyncConnection.ts:867-879`) and the store's head comments (`JournalCampaignEventStore.ts:524-528`, `campaignJournalReads.ts:52-59`) all state exactly what the code does and no more; I independently verified the "journal never updates or deletes an event row" claim against the `_no_update`/`_no_delete` triggers in `SQLiteService.eventJournal.migration.ts:133-136`.

## Verdict rationale

The fix is correct, minimal (94 product lines across exactly the two reads the unit's behavior sentence named), and every measurement in the receipts reproduces independently to within run-to-run noise: red fails on the restored baseline (~60-110ms at 1000 events on the four steps), the fix brings all four under 0.35ms median, `deliverToGuest` falls from ~179ms to ~3.7-3.9ms, both heal-correctness rows pass on the head and fail on the baseline, all 7 gates match the receipts exactly, and the cap/attribution/path checks are clean. The two out-of-shape findings (grant wake, record rewrite) are correctly scoped out per the unit's own sentence. The one thing that stops this at a clean APPROVE is Finding 1: the concurrency review class's central new invariant for `JournalCampaignEventStore` — "the remembered head is per campaign, never shared across campaigns" — is asserted in the design rationale and implemented correctly, but has zero test coverage; a mutant that breaks it (sharing the head cache across campaign ids) passes all 4188 existing tests silently, and if that isolation were ever lost by a future change, my trace shows the failure mode is a silent, permanent progression lock for the second campaign rather than a loud collision. That is squarely what a concurrency-class Lane A review exists to catch, it is a test-only addition (does not touch the product cap), and it should be added before this merges.

## Delta review (head 0c080f3e9c29894439a256aa41f1bff8e4784f48)

reviewedHeadDelta: 0c080f3e9c29894439a256aa41f1bff8e4784f48

### Setup

- `git -C E:/Projects/MekStation fetch origin` (exit 0).
- `git -C E:/Projects/MekStation worktree add --detach .../worktrees/u89-review2 0c080f3e9c29894439a256aa41f1bff8e4784f48` — succeeded; `git log -1 --format='%H %s'` in that worktree printed `0c080f3e9c29894439a256aa41f1bff8e4784f48 test(campaign): the journal event store keeps an independent remembered head per campaign (Lane A required edit)` (exact reviewed head).
- `New-Item -ItemType Junction -Path ...\u89-review2\node_modules -Target ...\MekStation\node_modules` — succeeded. Node `v22.22.0` (nvm PATH per charter). `npm_config_dry_run=true` exported before every npm/npx call; no install/ci/prune/build/Playwright/server run.
- No edit made to the root checkout, to `u89` (implementer), or `u59`/`u59-review`; only `u89-review2` was touched, and it is clean (`git status --short` empty, `git diff --stat` empty) at the end of this review.

### Q1 — diff must touch only test files

`git diff --stat d51ac1278b472d770f03e052f2f6c569076332b2..0c080f3e9c29894439a256aa41f1bff8e4784f48`:
```
 .../JournalCampaignEventStore.heads.test.ts        | 62 ++++++++++++++++++++++
 1 file changed, 62 insertions(+)
```
One file, `src/lib/campaign/sync/__tests__/JournalCampaignEventStore.heads.test.ts`, 62 insertions, 0 deletions, no product file touched — exactly the required regression row and nothing else.

### Q2 — new row vs the finding-1 mutant

Confirmed the mutant's target lines are unchanged from the reviewed head (`sha256sum src/lib/campaign/sync/JournalCampaignEventStore.ts` → `1e44b7f336dd52f39d9f381431016c9f3df7ec80ddafa64ceda2431128ca745e`, identical to the prior review's recorded hash for this file). Re-applied the exact finding-1 mutant at `JournalCampaignEventStore.ts:533,536` (`this.heads.get(campaignId)` → `this.heads.get('__M5_SHARED__')`, `this.heads.set(campaignId, head)` → `this.heads.set('__M5_SHARED__', head)`), then ran only the new row:

`npx jest src/lib/campaign/sync/__tests__/JournalCampaignEventStore.heads.test.ts`:
```
FAIL unit src/lib/campaign/sync/__tests__/JournalCampaignEventStore.heads.test.ts
  JournalCampaignEventStore remembered heads
    × keeps an independent head per campaign read through one store instance (10 ms)
    expect(received).toBe(expected) // Object.is equality
    Expected: 1
    Received: 2
      at Object.toBe (src/lib/campaign/sync/__tests__/JournalCampaignEventStore.heads.test.ts:56:55)
Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
```
The row fails against the mutant — `campaign-b`'s `highestSequence` reads back `2` (campaign-a's shared head) instead of its own `1`, exactly the borrowed-revision defect Finding 1 described. Restored: `git checkout -- src/lib/campaign/sync/JournalCampaignEventStore.ts`; `sha256sum` afterward = `1e44b7f336dd52f39d9f381431016c9f3df7ec80ddafa64ceda2431128ca745e`, matching the head blob exactly; `git status --short` clean.

### Q3 — gates on the head

| Gate | Command | Exit | Result |
|---|---|---|---|
| Unit's 3 test suites | `npx jest src/lib/multiplayer/server/__tests__/campaignHostIntentServerTime.test.ts src/lib/multiplayer/server/__tests__/healCommittedParticipantRemovals.test.ts src/lib/campaign/sync/__tests__/JournalCampaignEventStore.heads.test.ts` | 0 | `Test Suites: 3 passed, 3 total; Tests: 6 passed, 6 total` (the unit's 4th file, `campaignHostIntentServerTime.test-helpers.ts`, is a helper module, not a jest suite — `--listTests` on the pattern set enumerates exactly these 3 `.test.ts` files) |
| tsc | `npx tsc --noEmit` | 0 | no output |
| oxlint | `npx oxlint` | 0 | `Found 84 warnings and 0 errors.` — same 84-warning count as the reviewed head |
| oxfmt --check | `npx oxfmt --check src/lib/campaign/sync/__tests__/JournalCampaignEventStore.heads.test.ts` | 0 | `All matched files use the correct format.` |
| lint:units | `npm run --silent lint:units` | 0 | `LINT_UNITS_PATH src-tests files=3211 findings=17783 ceiling=17783 PASS` ... `LINT_UNITS_PASS 17899/17899` |

### Verdict (delta): APPROVE

The required edit from Finding 1 is satisfied exactly as specified: the new row is test-only (Q1), exercises one `JournalCampaignEventStore` instance across two campaign ids on one store instance, passes on the real head, and fails against the identical finding-1 mutant with the predicted symptom — campaign-b reading campaign-a's borrowed sequence (Q2). All gates are green with no regression against the previously reviewed head (Q3). No new findings on this delta.
