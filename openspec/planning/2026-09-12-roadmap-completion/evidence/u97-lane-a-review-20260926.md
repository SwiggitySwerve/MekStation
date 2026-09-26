# Lane A review: U97
reviewedHead: 94a790757cad44e0ffdf3405af55f30b5abc2640
baseline: 998f026e9eecdb0289d2bca7cc4721d0d495f44b
reviewerModel: claude-sonnet (Agent model: sonnet, lean-worker)
Verdict: APPROVE

## Setup

- Charter copied to `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/u97-lane-a-charter-20260926.md`.
- `git -C E:/Projects/MekStation fetch origin` (no new refs beyond what root main already had).
- Root main was at `924e160a1` (U97 already folded, `docs(roadmap): U97 receipts folded, unit local-verified (#2029)`); receipts read from `openspec/planning/2026-09-12-roadmap-completion/evidence/u97-{admission,red,local}-20260926.json` on main (not the implementer's worktree — the fold had already landed).
- Detached review worktree created: `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u97-review 94a790757cad44e0ffdf3405af55f30b5abc2640` (exit 0, `HEAD is now at 94a790757`).
- `node_modules` junctioned via PowerShell `New-Item -ItemType Junction` (succeeded).
- Shell preamble: `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH` (`node --version` → `v22.22.0`), `export npm_config_dry_run=true`. No install/build/Playwright/server run by this lane.
- `node scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` → `MACHINE_IDLE` before the full-directory jest run.
- All product-file mutations (red repro + 2 independent mutants) were restored; final `git status --short` in the review worktree is clean.
- Cleanup performed at the end per charter: junction deleted, worktree removed (see command output at the bottom of this run).

## Files on the range

`git diff --stat 998f026e9..94a790757 -- src openspec`: 12 files changed, 893 insertions(+), 28 deletions(-):
- `openspec/changes/design-campaign-authority-and-sync/specs/gm-campaign-intervention-boundaries/spec.md` (new, +35)
- `src/__tests__/api/campaigns/coopGmInterventionHistory.test.ts` (new, +343)
- `src/__tests__/pages/gameplay/campaigns/gm-ledger.coop.test.tsx` (+7/-1, U92 solo-id amendment)
- `src/__tests__/pages/gameplay/campaigns/gm-ledger.inflight.test.tsx` (new, +205)
- `src/components/campaign/gm/GmCampaignInterventionControlPlane.tsx` (+53/-... net +46/-7 per receipt)
- `src/components/campaign/gm/__tests__/GmCampaignInterventionControlPlane.approval.test.tsx` (new, +129)
- `src/lib/campaign/authority/campaignRecordJournalState.ts` (+97/-... net +86/-11 per receipt)
- `src/lib/campaign/sync/ICampaignEventStore.ts` (+5)
- `src/lib/campaign/sync/JournalCampaignEventStore.ts` (+19/-4)
- `src/lib/multiplayer/server/campaignHostBatchCommit.ts` (+4)
- `src/lib/multiplayer/server/campaignIntentIdentity.ts` (+12/-1)
- `src/pages/gameplay/campaigns/[id]/gm-ledger.tsx` (+11/-4)

All 8 product/spec files and all 4 test files fall inside U97's ownership paths (`src/lib/multiplayer/server`, `src/lib/campaign`, the two named files, the change's spec-delta path, and the node's/unit's test homes). No file outside those paths was touched.

## Findings

1. **[INFO] Atomicity confirmed by code, not just by comment.** `rewriteCampaignRecordAfterCommand` (campaignRecordJournalState.ts:88-113) is invoked as the `afterCommit` hook from `JournalCampaignEventStore.ts:325-336` (`appendCampaignCommandBatch`'s `journal.appendWithExtension(batch, (db, append) => {...})`), and `SQLiteEventJournalWriter.ts:75-81` wraps that whole extension in `this.db.transaction(() => extend(...)).immediate()`. The event append and the record rewrite (including the history append via `withGmInterventionEntries`, campaignRecordJournalState.ts:118-171) run in one SQLite transaction; a throw in the rewrite rolls the whole append back. The doc comment's atomicity claim (campaignRecordJournalState.ts:10-16, "inside the append's transaction, so a throw here rolls the append back") is accurate against the code beneath it.

2. **[INFO] First-commit-only dedupe is a pre-append table check, not a post-append one.** `JournalCampaignEventStore.ts:326-330`: `recorded` is read from `event_journal_batches` for `batch.commandId` *before* `append()` runs; the hook fires only when `!recorded && appended.kind === 'committed'` (:333-335). Verified this is not the sole line of defense for an ordinary resend: `CampaignMatchHost.doors.ts:124-128,160-164` calls `replayCommittedIntent` first and returns its cached answer without ever reaching `commitEvents`/`appendCampaignCommandBatch` for a same-`intentId` resend, so the journal-level `recorded` check is defense-in-depth for a path that would reach the event store directly (see mutant #1 below).

3. **[INFO] A single `ApplyGmIntervention` cannot emit two `FundsChanged` events.** `CampaignMatchHostIntent.ts:238-256`, the `ApplyGmIntervention` validate arm, returns exactly one `events: [mk('FundsChanged', ...)]` array literal (no loop, no conditional second push) — so "two `FundsChanged` in one command sharing an intervention id" cannot occur by construction; `withGmInterventionEntries` (campaignRecordJournalState.ts:118-171) would in principle append one entry per `FundsChanged` in the batch, but this validate arm never produces more than one.

4. **[INFO] Privacy confirmed structurally.** `IFundsChangedPayload` (`CampaignSync.ts:208-214`, unchanged by this diff) has only `{delta, reason, balance}` — no room for an intervention id. `interventionId` appears only in the host-only `ApplyGmIntervention` intent type (`CampaignSync.ts:539`) and its wire schema (`Protocol.ts:519`), never in an event payload a guest receives. The guest fold (`applyCampaignEvent.ts:80-83,138-143`) and `applyAuthoritativeStateToGuestCampaign` (`campaignMirrorProjection.ts:17-34`) only ever write `balance`/`currentDate`/`finances`/`factionStandings`/`updatedAt` — never `gmInterventionEvents`. `withGmInterventionEntries`'s `IGmCampaignFundsTransactionEffect` has no GM-private field defined on the type at all (confirmed by reading `src/types/interventions` shape cited in the admission receipt), so "no GM-private metadata" is a type-level guarantee, not just an omission.

5. **[INFO, per spec scope] The player-safe clause covers the mirror/GM-ledger route render, not the raw record GET.** `openspec/specs/gm-campaign-intervention-boundaries/spec.md:139-156` ("Player-Safe Campaign Ledger Route") scopes its guarantee to a viewer opening "the GM ledger route directly" against "a campaign mirror" — it does not constrain `GET /api/campaigns/:id`. The new delta's own scenario ("The guest mirror never receives the history") matches that scope exactly. The admission/local receipts correctly disclose this as a non-claim ("GET /api/campaigns/:id is not narrowed: whoever reads the host record reads its history") rather than asserting a guarantee the code doesn't provide — this is pre-existing (the solo and PUT paths already stored history in the same record) and not widened by this unit.

6. **[MEDIUM, pre-existing, out of scope] FN-u97-refused-approval-stays-in-local-action-ledger.** `GmCascadePreviewPipeline.ts:220-236` (`approveGmCascadePreview`) unconditionally calls `input.actionLedger?.appendGmInterventionRecord(appendedRecord)` (:234-236) *before* the control plane's `handleApprove` (`GmCampaignInterventionControlPlane.tsx`) awaits `applyApproved`/`onApplyCampaignUpdate`. On a co-op refusal, `handleApprove` returns early (`if (!(await applyApproved(result.state))) return;`) without setting `approvedApplied`, but the action-ledger row was already appended, so the component-local ledger shows the refused approval as if it had applied at the next row refresh. This file is outside U97's ownership paths (`src/lib/interventions`, not `src/lib/campaign`/`src/lib/multiplayer/server`/the two named component files), was not introduced by this diff (confirmed: not in the 12-file diff stat), and only became visibly reachable once U92 introduced co-op refusals (the solo path never refuses). Correctly disclosed as an "adjacent defect (code-read)" in the local receipt, not fixed here, and not covered by any U97 test assertion (the new approval test only checks the visible status text and row keys, not action-ledger contents). Not blocking for this unit's sentence (the host record's `gmInterventionEvents` — the thing this unit's spec delta governs — is correctly unaffected by a refusal, per R1's `afterRefusalEntries` staying at 1); worth a follow-on.

7. **[INFO] Comments read as accurate against the code beneath them.** Checked every added/changed doc comment against its function body: `rewriteCampaignRecordAfterCommand`'s and `withGmInterventionEntries`'s comments (campaignRecordJournalState.ts:10-16, 77-84, 100-112) match the atomicity, field-sourcing, and "no GM-private metadata" claims exactly; `CampaignCommandCommitHook`'s and `appendCampaignCommandBatch`'s comments (JournalCampaignEventStore.ts:265-274, 283-292) match the dedupe-by-recorded-batch behavior; `GmCampaignInterventionControlPlane.tsx`'s `applyApproved`/`handleApprove` comments (:264-266, 283-288) match their bodies. None over-claim.

## Independent mutant reproductions (not M1-M5)

**Mutant A — killed, but exposed a layer boundary (kept as INFO, finding #2 above).** `JournalCampaignEventStore.ts:326`: forced `const recorded = false;` (the query result the resend-dedupe reads). Ran `npx jest src/__tests__/api/campaigns/coopGmInterventionHistory.test.ts`: **both tests still PASSED** (exit 0). Root cause: on a same-`intentId` resend, `CampaignMatchHost.doors.ts`'s `replayCommittedIntent` intercepts before `commitEvents` is ever called, so this line is never exercised by R1's resend step in production or in the test. This is a real, reportable equivalent-mutant result, not a coverage gap in R1's assertion — R1's resend guarantee is enforced (and tested through real code) one layer higher than the line I mutated. File restored; `sha256sum` after restore = `9c2d15c3a947ebed1a532e5c0e642cbc5c8de4423af8cc81b1e11c81b4392db9`, matching the recorded head hash.

**Mutant B — killed.** `campaignIntentIdentity.ts:91`: changed `gmInterventionId: intent.payload.interventionId` to `gmInterventionId: intent.payload.summary` (wrong field feeding the history entry's id). Ran the same test file: **1 failed, 1 passed** — `(R1)` failed on `expect(afterCommit.gmInterventionEvents).toEqual([...])`, diff showing `"interventionId": "Merchant charge corrected by +2,500.00 C-bills."` instead of the real intervention id (exact jest diff captured). File restored; `sha256sum` after restore = `4812c334e246e6b6f483d82605b350182a2eedff2010f6c2617c78697476fd1a`, matching the recorded head hash.

## Red reproduction (baseline product source, head tests)

Restored the baseline (`998f026e9`) copies of the 7 baseline-existing product files and deleted the new spec-delta file (which does not exist at baseline), keeping the 3 new HEAD test files in place:
```
git checkout 998f026e9... -- <7 files>
rm openspec/changes/.../gm-campaign-intervention-boundaries/spec.md
```
`npx jest src/__tests__/api/campaigns/coopGmInterventionHistory.test.ts src/__tests__/pages/gameplay/campaigns/gm-ledger.inflight.test.tsx src/components/campaign/gm/__tests__/GmCampaignInterventionControlPlane.approval.test.tsx`:
- exit 1; `Test Suites: 3 failed, 3 total`; `Tests: 4 failed, 1 passed, 5 total`.
- Failures: `(R1)` — `Received: null` for `afterCommit.gmInterventionEvents` (the baseline rewrite never writes history). `(R3)` — `expect(disabledInFlight).toBe(true)` received `false` (no in-flight gate). `(R4 text)` — expected not to contain "Approved and applied", received "Approved and applied to campaign state." (refusal not reported). `(R4 key)` — expected `/^gm-ledger-merchant-reversal-/`, received the bare canned id, plus two React "duplicate key" console warnings.
- Pass: `(R2)` — the guest-privacy control row, unaffected by the product baseline swap (as expected: privacy holds even before this unit).

This exactly matches the shape (rows, failure messages) recorded in `evidence/u97-red-20260926.json`.

Restored all 8 files to HEAD (`git checkout 94a790757... -- <8 files>`); `git status --short` empty. `sha256sum` of all 8 restored files matches the `productFileHashes`/`specDelta.file.sha256` recorded in `evidence/u97-local-20260926.json` exactly (spot-checked all 8; e.g. `GmCampaignInterventionControlPlane.tsx` → `36e731a3...`, `campaignRecordJournalState.ts` → `3c2ea50c...`, spec.md → `ef345ed1...`).

## Gates (reproduced independently on the review worktree)

| Gate | Command | Result |
|---|---|---|
| tsc | `npx tsc --noEmit` | exit 0, no output |
| jest (broad) | `npx jest src/lib/multiplayer/server src/lib/campaign src/components/campaign src/pages src/__tests__/api src/__tests__/pages` | exit 0; `Test Suites: 759 passed, 759 total`; `Tests: 6403 passed, 6403 total` — matches receipt exactly |
| oxlint | `npx oxlint` | exit 0 (well, no explicit exit captured but summary line shown); `Found 84 warnings and 0 errors.` — matches receipt (84 warnings baseline, 0 errors; the one changed-file warning is the pre-existing `max-lines` on `GmCampaignInterventionControlPlane.tsx`) |
| oxfmt | `npx oxfmt --check` on the 11 changed non-md files | `All matched files use the correct format.`; `Finished ... on 11 files` |
| lint:units | `npm run lint:units` | exit 0; `LINT_UNITS_PATH src-tests files=3214 findings=17783 ceiling=17783 PASS`; `LINT_UNITS_PASS 17899/17899` — matches receipt exactly |
| openspec strict | `npx openspec validate --all --strict` | `Totals: 229 passed, 0 failed (229 items)` |
| qc:openspec-ci | `npm run qc:openspec-ci:validate` | `workflowContracts=8/8 ... activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9 errors=0` |
| roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 381 tasks, 40 triage rows` |

All eight gates reproduced independently, all green, all matching the counts/lines recorded in `evidence/u97-local-20260926.json` where comparable. (Live/build/Playwright measurements were not re-run per charter — those are the implementer's receipts, `evidence/u97-{red,local}-20260926.json`, read and cited above, not re-executed by this read-only lane.)

## Cap

- Files: 12 (product 7 + spec delta 1 + tests 4) ≤ cap of 15.
- Product added lines: 209 (per receipt's `git diff --numstat`) ≤ cap of 500.
- No `file:` dependency, no dependency added.
- No AI attribution and no absolute machine path found in the diff (`git diff | grep -i` both clean).
- Scope: every touched file is inside `src/lib/multiplayer/server`, `src/lib/campaign`, the two named files, the change's spec-delta path, or a test home named in the unit's ownership paths — no out-of-scope file touched.

## Verdict rationale

All four review-question classes (authority/atomicity, privacy, idempotency, spec-delta correctness) check out against the code, not just the receipts: the history write is provably inside the same SQLite transaction as the event append (traced through `appendWithExtension` → `this.db.transaction(...).immediate()`); the ApplyGmIntervention validate arm can only ever emit one `FundsChanged`, so the "two entries, one intervention id" concern is foreclosed by construction rather than by convention; the guest wire type and fold/mirror functions structurally cannot carry the intervention id or history; the spec delta is a correctly-scoped ADDED requirement (a new capability file, not a MODIFIED existing one) with four scenarios matching the admission's design text verbatim; `openspec validate --all --strict` passes at 229/229. Both independently-chosen mutants were informative: one exposed that the journal-level resend dedupe is defense-in-depth behind a host-door-level dedupe (equivalent mutant, not a gap), the other was cleanly killed by R1's exact-value assertion. Red reproduced exactly as receipted (R1/R3/R4 fail, R2 control passes) on the restored baseline product source, and every gate reproduces green with matching counts. The one real, disclosed gap (finding #6, the local-action-ledger row surviving a co-op refusal) is a pre-existing defect outside this unit's ownership paths, was not introduced or worsened by this diff, does not affect the host record's `gmInterventionEvents` (the actual subject of this unit's spec delta and reviewClasses), and is already correctly filed as a non-blocking finding rather than smuggled past review. No blocking defect found.

**Verdict: APPROVE.**
