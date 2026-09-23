# Lane A review: U35f
reviewedHead: 09d34d687b96e40391b6ffc39f4b9c6b74fc5f1f
baseline: f32ea5400f3a1282733180059e32d9169fb74204
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- Fetched `origin`, created a detached worktree at
  `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u35f-review`
  at `09d34d687b96e40391b6ffc39f4b9c6b74fc5f1f` (never touched the
  attached `worktrees/u35f` or `worktrees/u22a`).
- Junctioned `node_modules` from the root checkout via PowerShell
  `New-Item -ItemType Junction`.
- Node 22 (`v22.22.0` via the nvm PATH prefix), `npm_config_dry_run=true`
  exported before any npm/npx call. No install/ci/prune, no build, no
  Playwright, no commit, no push.
- Read `GOAL.md`, `DELIVERY.md` step 5, the U35f/U35e/U35d entries in
  `units.json`, `OD-u35d-server-and-host-fix` in `roadmap.json`, findings
  FN-u35f-persistence-load-does-not-wait-for-save,
  FN-u35f-take-server-record-leaves-cache-key-stale,
  FN-u35f-coop-host-fold-edges, the three u35f evidence receipts on the
  head (including the superseded first local receipt in the shared
  scratchpad, where F1/F2 were open), `campaignRecordJournalState.ts`,
  the component and store diffs, and the PR body (`gh pr view 1930`,
  `headRefOid` confirmed `09d34d687...`).
- All product/test file restorations below were verified byte-identical
  to their recorded sha256 before I moved on; the worktree's final
  `git diff 09d34d687... --stat` against every file I touched is empty.

## Files on the range

`git diff --stat` `f32ea5400..09d34d687`: exactly 7 files - the 3 u35f
evidence receipts, `CampaignCoopRouteSurfaceConnected.tsx` (+36/-0),
its new test file (+906, new), `useCampaignPersistenceStore.ts`
(+72/-33), and its test file (+66/-0). No file outside the amended
ownership paths (`src/components/campaign/coop`,
`src/stores/campaign/useCampaignPersistenceStore.ts`,
`src/stores/campaign/__tests__/useCampaignPersistenceStore.test.ts`,
the three receipts).

## Findings

All findings below are MEASURED unless marked INFERENCE (carried from
the unit's own receipts, which I did not re-derive).

**1. [None / informational] Production defaults (question 1) - no data loss on the head, and the 1,000,000-loss window only ever existed in a partial (component-only) deploy, never on the shipped head or on the pre-U35f baseline.**
Severity: informational (confirms the crux; no defect).
File: `src/components/campaign/coop/CampaignCoopRouteSurfaceConnected.tsx:224-231`, `src/stores/campaign/useCampaignPersistenceStore.ts:1359-1406`.
Probe: ran the shipped suite `CampaignCoopRouteSurfaceConnected.hostRecordRefresh.test.tsx` on the head, independently (own `npx jest` invocation, not trusting the receipt). On a snapshot-authority co-op campaign (`CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` false, every production co-op campaign today):
- (a) no host save queued or in flight -> row `s`: host holds 950,000, next save stores 950,000. PASS.
- (b) a host save in flight -> row `p2`: host holds 950,000 throughout, next save stores 950,000. PASS.
- (c) after a co-op 409 rollback -> row `p1`: cache key re-stamped to the rollback's own revision, host holds 950,000, next save stores 950,000. PASS.
All 9/9 rows green (`Tests: 9 passed, 9 total`), matching the local receipt exactly.
Baseline comparison (question 1, "compare with f32ea5400"): I `git checkout f32ea5400 --` **both** product files (component and store) and re-ran the same suite. Result: 5 failed (h1, h2, s, p1, p3), 4 passed (g, o, b, p2) - see Finding 3 below for the full row-by-row diff. Crucially, in every baseline case the balance stored is still **950,000**, never 1,000,000: on snapshot authority (`s`, `p1`) the pre-existing fold projection (`projectHostFoldToCampaign`, unmodified by this diff) already writes the folded balance onto the live campaign, so a save with no refresh at all still carries it; on journal-native (`h1`, `h2`, `p3`) the baseline's failure mode is the pre-existing 409-refuse-rollback-toast (the problem OD-u35d-server-and-host-fix exists to remove), not data loss, because the row itself (modelled as already rewritten by U35e) holds the correct value regardless of what the refused PUT would have written. **The 1,000,000-loss scenario the unit's own red/local receipts recorded (probes p1/p2 storing 1,000,000) only reproduces on the intermediate state - the component's refresh call present, the store fix absent** (I did not need to re-verify this state; it is already recorded in `evidence/u35f-red-20260923.json` addendum, and it is consistent with the mechanism: an unstamped cache key after rollback, or a read racing ahead of a save-in-flight, only matters once something re-reads the row, which only the component half of U35f introduces). Conclusion: the shipped head closes a regression window that a partial deploy of this same unit would have opened; it does not reproduce on the true pre-U35f baseline.

**2. [None / informational] Journal-native probes (question 2) match the design: accepted, carries the effect, no toast.**
Severity: informational.
Probe: same independent run, rows h1 (approved co-op spend), h2 (host's own day advance), p3 (spend committed while a rename is in flight) - all 3/3 green, each with `toasts: []` and `saveState: 'saved'`/`committed: true` in the assertion. Confirms the server-rewrite-modelled scenario is accepted at the rewritten version with no user-visible refusal.

**3. [None / informational] Independent red re-run (question 3) reproduces a red state, though a different one from the receipt's addendum (which reverted only the store, not the component).**
Severity: informational (procedural difference, not a defect).
Probe: `git checkout f32ea5400 -- src/components/campaign/coop/CampaignCoopRouteSurfaceConnected.tsx src/stores/campaign/useCampaignPersistenceStore.ts` (both files, sha256 verified equal to the admission receipt's `baselineFileHashes` before running), then ran the coop suite and the store suite.
- Coop suite: 5 failed / 4 passed of 9. Failed: h1 (received `readsAfterCommit:0, baseVersionAfterFold:4, committed:false, puts:[{baseVersion:4,status:409}], saveState:'conflict', toasts:[refusal]` vs expected version 5/committed/200/saved/no-toast), h2 (analogous, version 5 vs 6, 409 vs 200), s (`readsAfterCommit:0` vs expected 1 - the only difference; balance still correct), p1 (`readsAfterCommit:0`, `cachedKeyAfterRollback.revision:4` vs expected 5 - the stale-cache-key defect is visible here even with no refresh consuming it yet), p3 (`baseVersionAfterRelease:5`, second PUT 409/conflict/toast vs expected 6/200/saved/no-toast). Passed: g, o, b (guards, unaffected by product code), and **p2** (passes on true baseline because nothing re-reads the row at all, so the pre-existing fold projection's optimistic balance is what gets saved - see Finding 1's baseline discussion).
- Store suite: 1 failed (`a save answer that lands after a load adopted a newer record leaves the adopted version`, received `baseVersionAfterLateAnswer:8` vs expected 9) / 21 passed - identical to the receipt's addendum store run.
This differs from the receipt's own addendum red run (component present, store reverted only), which showed p1/p2/p3 failing and h1/h2/s/g/o/b passing - because that run kept the component's refresh call active while mine reverted both files to the pure baseline. Both are legitimate red states; mine is the literal instruction ("put the baseline's two product files back"). Restored both files to head afterward; sha256 verified equal to `c332fd25...` and `e50e9013...` respectively, and `git diff 09d34d687... --stat` is empty.

**4. [None / informational] No deadlock or starvation observed on a two-committed-frames-in-a-row probe (question 4).**
Severity: informational.
Probe: wrote a scratch test (`(laneAProbe)`, appended temporarily to the shipped test file, deleted before finishing) modelling a HirePilot-style batch: two `commitCoopCommand` rewrites plus two `CampaignEvent` frames (`fundsChangedFrame`, `dayAdvancedFrame`) delivered inside one `act()` without settling between them, followed by an explicit host save. Result: `readsAfterCommit: 2` (one GET per committed event, confirming FN-u35f-coop-host-fold-edges F5 directly), `baseVersionAfterBothFolds: 6` (both rewrites reflected), and the trailing `hostSaves()` resolved (`committed: true, saveState: 'saved', storedBalance: 950000, toasts: []`) in 41ms wall time for the whole test - itself the deadlock probe, since a wedged `saveChain` would have hung the `await` until Jest's test timeout rather than resolving. No starvation: the save queued behind both refreshes and still completed. I also attempted a stronger probe holding the first GET response to prove genuine chain-ordering (rather than favorable microtask FIFO scheduling) distinguishes a real serialization bug; that second probe's own design was invalid for this purpose (both `commitCoopCommand` calls pre-applied to the fake row before either frame was emitted, so any GET already returns the fully-advanced row regardless of read order) and I discarded it rather than report an inconclusive result as evidence. File restored and sha256-verified afterward.

**5. [Minor, test-coverage gap - not a shipped defect] The chain-ordering claim in `refreshAfterCommittedCommandAction` ("becomes the chain's tail") is not independently proven by the test suite for the case of two refreshes (or a refresh and a queued save) in quick succession; a mutant removing it is uncaught.**
Severity: minor (mutation-testing gap, review class concurrency). This is a test-coverage observation, not evidence the shipped line is wrong - I confirmed by reading the code that the line is present and does what its comment says.
File: `src/stores/campaign/useCampaignPersistenceStore.ts:1404` (`saveChain = refresh.catch(() => undefined);`).
Probe (question 6, an independent mutant, not M1-M7): removed this one line (kept `return refresh;`), verified the mutant's sha256 differed from the pre-mutant sha256 (`e50e9013...` -> `4ed02853...`), then ran the **shipped, unmodified** coop suite (9 tests) and store suite (22 tests) together: `Tests: 31 passed, 31 total` - the mutant is **not caught** by any row in either file. My own two-frames probe (Finding 4) also passed unchanged under this mutant. Restored the file; sha256 verified equal to `e50e9013...` again, and the whole-tree diff against head is empty.
Why this plausibly survives: in every row that exercises two model events, only one server-authoritative "final" row state exists by the time any GET fires (the fake row is mutated synchronously before frames are emitted), so a first-fires-first-completes microtask ordering coincidentally produces the same values whether or not the promise chain is real. A decisive test would need to hold the first refresh's GET response open and show a second, un-chained refresh reading past it - I attempted this and found my own attempt's fake-row setup made it non-discriminating too (see Finding 4). I did not spend further budget hardening it; flagging as a genuine, if narrow, gap for a future unit that touches this line.
Recommendation: not a blocker for this unit (the shipped code has the line; only my deliberate mutant lacks it), but worth a note for whoever next edits `refreshAfterCommittedCommandAction` or `performSave`'s chain plumbing that the existing suite would not catch a regression here.

**6. [Informational] Findings F3-F7 (host fold edges, load-path race, take-server-record cache-key) are correctly left open and recorded, not silently absorbed.**
Severity: informational.
Verified: FN-u35f-persistence-load-does-not-wait-for-save, FN-u35f-take-server-record-leaves-cache-key-stale and FN-u35f-coop-host-fold-edges in `units.json.findings` match the head local receipt's `findingsReportedNotFixed` F3-F7 verbatim in substance, each marked `status: recorded` with a named successor path. None of these are in this unit's amended ownership paths (`campaignAuthoritativeFold.ts`, `campaignMirrorProjection.ts`, `resolveConflictTakeServer`, `loadCampaign`/`runLoad`'s own in-flight coordination are all outside `src/components/campaign/coop` and the one named store file/functions this unit touches), so leaving them open rather than expanding scope is correct per the "unit is never widened" rule.

## Gates

All run independently on the head worktree (`09d34d687...`), one suite at a time, before any of the red/mutant probes above disturbed the tree:

| Gate | Command | Last line / counts | Exit |
|---|---|---|---|
| new co-op suite | `npx jest .../CampaignCoopRouteSurfaceConnected.hostRecordRefresh.test.tsx` | `Tests: 9 passed, 9 total` | 0 |
| store suite | `npx jest .../useCampaignPersistenceStore.test.ts` | `Tests: 22 passed, 22 total` | 0 |
| `src/components/campaign/coop` | `npx jest src/components/campaign/coop` | `Test Suites: 15 passed, 15 total`, `Tests: 153 passed, 153 total` | 0 |
| `src/stores/campaign` | `npx jest src/stores/campaign` | `Test Suites: 27 passed, 27 total`, `Tests: 342 passed, 342 total` | 0 |
| `src/lib/campaign/coop` | `npx jest src/lib/campaign/coop` | `Test Suites: 8 passed, 8 total`, `Tests: 48 passed, 48 total` | 0 |
| `src/__tests__/pages/gameplay/campaigns` | `npx jest src/__tests__/pages/gameplay/campaigns` | `Test Suites: 6 passed, 6 total`, `Tests: 38 passed, 38 total` | 0 |
| `npx tsc --noEmit` | - | (no output) | 0 |
| `npx oxlint` | - | `Found 84 warnings and 0 errors.` | 0 |
| `npx oxfmt --check` (4 changed files) | - | `All matched files use the correct format.` | 0 |
| `npm run lint:units` | - | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | - | `...errors=0` | 0 |
| roadmap validator | `node .../validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

Every count and last line above matches the local receipt (`evidence/u35f-local-20260923.json`) exactly - I did not find any discrepancy between my independent execution and the recorded receipt.

## Cap

- Files: 7 total in the diff range (2 product, 2 test, 3 receipts) - all within the amended ownership paths. No file outside scope.
- Product lines: component +36/-0, store +72/-33 = 141 total, under the 500-line cap (test lines, 972, do not count per OD-line-cap-product-lines and were not counted here either).
- No AI attribution: `git log -1 --format=%B` on the head commit and the PR body (`gh pr view 1930`, confirmed `headRefOid` = the reviewed head) both grep-clean for claude/anthropic/co-authored/generated-with/opus/sonnet.
- No absolute machine paths in the product or test diff: grepped the diff for `C:\`, `E:\`, `/c/Users`, `/e/Projects` and found none (the three evidence-receipt JSON files do carry scratchpad paths in their own `runners`/log fields, consistent with the pattern used by every other unit's receipts in this program, and receipts are not "product" code).
- Every added/changed function has a comment describing what it does: verified against the diff for `refreshSavedRecordAfterCommit` (new, component), the component's own doc comment (rewritten), `rollbackCoopCampaign` (new doc comment), `performSave` (new doc comment), `runSave` (new doc comment), and `refreshAfterCommittedCommandAction`'s extended doc comment (store). Read each against the code beneath it; none over-claims relative to what I traced (e.g. "queues its read on the save chain... becomes its tail" is accurate to the code, even though Finding 5 shows that specific claim is not independently mutation-tested).

## Verdict rationale

Question 1, the crux, is answered directly and favorably by independent execution, not just by trusting the receipt: on a snapshot-authority co-op campaign (every production co-op campaign today), all three cases in the question - no save queued, a save in flight, after a 409 rollback - hold and save 950,000, never 1,000,000. I additionally established (Finding 1) that the 1,000,000-loss scenario the unit's own findings record was a risk of a *partial* deploy of this unit (component without the store fix), not a risk on the true pre-U35f baseline or on the shipped head - a fact worth carrying forward for the owner's ruling. Journal-native behavior (question 2) is confirmed accepted-no-toast. The red re-run (question 3) reproduces a red state (a different, but equally legitimate, one from the receipt's own addendum, since I reverted both files rather than one). No deadlock or starvation on a two-frames-in-a-row probe (question 4), independently measured. Scope is host-only, per-campaign, CampaignEvent-only, and the one-read-per-event cost is real but small and does not compound into starvation (question 5). An independently chosen mutant (question 6) is uncaught by the shipped suite, which I report as a minor, non-blocking test-coverage gap (Finding 5) rather than a shipped defect, since I verified by reading the code that the mutated line is present and correct on the head. Gates (question 7) all pass and match the receipt exactly under my own independent execution. Scope and cap (question 8) are clean: files, line count, no AI attribution, no absolute paths, and comment accuracy all check out.

Nothing measured here rises above "minor, non-blocking" - the shipped change does what its receipts claim, closes the regression its own earlier iteration introduced, and leaves the remaining edges (F3-F7) correctly recorded rather than silently absorbed or silently ignored. Authority and concurrency are this unit's declared review classes and both still require the head-bound Lane B owner ruling before merge, which is unaffected by this review's approval.
