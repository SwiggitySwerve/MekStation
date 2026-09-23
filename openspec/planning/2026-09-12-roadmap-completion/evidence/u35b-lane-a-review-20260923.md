# Lane A review: U35b

reviewedHead: 8d04011c365736c29e7b03a7041f37aa5ab9a70d
baseline: f50e76fe48d87a04da7fb03cdb86388a05ea9f40
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (clean); `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u35b-review 8d04011c365736c29e7b03a7041f37aa5ab9a70d` — worktree created at that exact head, HEAD detached, no changes to the root checkout or the implementer's own worktree (`.sisyphus/roadmap-completion-20260912/worktrees/u35b`, left untouched throughout).
- `node_modules` junctioned via PowerShell `New-Item -ItemType Junction`.
- Node 22 via PATH prepend (`node --version` -> `v22.22.0`); `npm_config_dry_run=true` exported in every shell; no `npm install`/`ci`/`prune`, no build, no Playwright run, no commit/push.
- All git commands run with `-C`/cwd pinned inside the review worktree.
- Two scratch probe test files were written under the review worktree for questions 3(a) and 4, run, and deleted before finishing; every mutated/checked-out product file was restored via `git checkout <sha> -- <path>` and its blob hash (`git hash-object`) reconciled against the recorded head hash after each excursion. Final `git status --short` in the review worktree is clean.
- Cleanup performed as directed: node_modules junction removed via `[System.IO.Directory]::Delete(...)` (non-recursive), then `git worktree remove --force` on the review worktree (see end of this report for the actual commands/output).

## Files on the range

`git diff --stat f50e76fe48d87a04da7fb03cdb86388a05ea9f40..8d04011c365736c29e7b03a7041f37aa5ab9a70d` — 11 files changed, 1713 insertions(+), 157 deletions(-):

- 3 receipts: `evidence/u35b-admission-20260923.json`, `evidence/u35b-local-20260923.json`, `evidence/u35b-red-20260923.json`
- 6 product files: `src/lib/campaign/authority/campaignRecordJournalSave.ts` (new, +139), `src/lib/campaign/authority/campaignSourceGenesis.ts` (+75/-55), `src/pages/api/campaigns/[id].ts` (+37/-28), `src/pages/api/campaigns/[id]/adopt.ts` (+14/-11, header-only), `src/services/campaignPersistence/CampaignMigrationMarkerStore.ts` (+4/-2), `src/services/campaignPersistence/CampaignPersistenceService.ts` (+38/-7)
- 2 test files: `src/__tests__/api/campaigns/campaignRecordJournalTransaction.test.ts` (new, +507), `src/lib/campaign/authority/__tests__/campaignSourceGenesis.test.ts` (+2/-54)

All 11 files sit under the unit's owned paths (`src/services/campaignPersistence`, `src/pages/api/campaigns`, `src/__tests__/api/campaigns`, `src/lib/campaign/authority`, plus the 3 named receipts). No file outside those paths.

## Findings

### 1. One transaction, measured (Q1) — no defect

`SQLiteEventJournalWriter.appendPreparedWithExtension` (src/lib/events/journal/SQLiteEventJournalWriter.ts:99-131) runs `prepare`, the caller's row write (`campaignRecordRow.write`), `append()` (which inserts the journal event rows via `appendInTransaction` on the same handle), and — inside `extend` — the marker write, all inside one call: `this.db.transaction(() => { ... }).immediate()`. `campaignRecordJournalSave.ts:96-138` (`saveCampaignRecordThroughJournal`) supplies `prepare` (reads only, builds the plan + snapshot) and `extend` (writes the row via `campaignRecordRow.write`, then calls `append()`, then conditionally writes the marker). A throw inside `extend` (e.g. the fallback `throw new Error('Campaign ${purpose} append did not commit: ${appended.kind}')` at campaignRecordJournalSave.ts:134-136) propagates out of the `db.transaction()` callback body, which better-sqlite3 turns into a `ROLLBACK` of the whole immediate transaction — undoing both the row write and the journal event insert made earlier in the same call, since both happened synchronously before the throw.

Probe: `npx jest src/__tests__/api/campaigns/campaignRecordJournalTransaction.test.ts` on the head — **10/10 passed**.

Red reproduction: restored the baseline's product files into the review worktree (`git checkout f50e76fe48d87a04da7fb03cdb86388a05ea9f40 -- src/lib/campaign/authority/campaignSourceGenesis.ts "src/pages/api/campaigns/[id].ts" "src/pages/api/campaigns/[id]/adopt.ts" src/services/campaignPersistence/CampaignMigrationMarkerStore.ts src/services/campaignPersistence/CampaignPersistenceService.ts`, and removed `campaignRecordJournalSave.ts`, which does not exist on the baseline), kept the head's test file, re-ran the same command: **5 of 10 failed** — `(g3)` (journal left behind the record: 380000 vs 392345), `(f3)` (row exists, `readCampaign` returned `"ok"` not `"not_found"`), both `(atomic)` rows (row/journal advanced past the injected-failure point), and `(pin) a journal-native PUT whose envelope the projection refuses...` (row saved at version 2 instead of staying at 1). Restored the head's six product files (`git checkout 8d04011c365736c29e7b03a7041f37aa5ab9a70d -- ...`) and confirmed every one's `git hash-object` matches the blob hash recorded before the excursion (e.g. `campaignRecordJournalSave.ts` = `11a167865fbaa776f3b2bed47b31b0965e55c06d`, `CampaignPersistenceService.ts` = `4862394551c44db19e2ce756d5cdd4abff9a5b29`); `git status --short` clean afterward.

### 2. Non-journal path unchanged (Q2) — no defect

`saveCampaign` (CampaignPersistenceService.ts:111-130) is now a thin wrapper: `db.transaction(() => { const plan = campaignRecordRow.plan(...); if (plan.kind==='ok') campaignRecordRow.write(db, plan.record); return plan; })()`. Line-by-line, `campaignRecordRow.plan` (lines 140-199) is the exact body the old inline `saveCampaign` transaction used — same `SELECT version, payload`, same `prepareCampaignWrite` call, same `sourceReplayFence` guard, same `baseVersion !== currentVersion` CAS, same `stored` object construction — just extracted into a named function; `campaignRecordRow.write` (lines 201-217) is the same `INSERT OR REPLACE` statement, unmodified. It is still wrapped in one `db.transaction()`. In `[id].ts`'s PUT handler, when `authority.kind !== 'journal'` and the request is not a create-under-flag (`body.baseVersion === 0 && isCampaignJournalAuthorityEnabled()`), `purpose` is `null` and the code calls `saveCampaign(body.envelope, body.baseVersion)` — the exact same call site and arguments as the pre-U35b code, and no `SQLiteEventJournal` object is even constructed (the ternary's other branch, which builds one, is unreached). This is a mechanical extraction, not a behavior change.

Gates: `npx jest src/services/campaignPersistence` — 4 suites / 23 tests, all passed. `npx jest src/__tests__/api` — 55 suites / 761 tests, all passed.

### 3. Idempotency, probed (Q3) — no defect; one design point recorded (not a defect)

**(a)** Wrote and ran a standalone probe (`_probe_u35b_q3a.test.ts`, deleted after): create at baseVersion 0 under journal authority, then retry the identical envelope at baseVersion 0. On the **head**: first call -> 200, version 1, marker `ok`/journal, 1 journal event; retry -> **409** (`kind: "conflict"`, `reason: "base-state-unavailable"`), event count still 1, row still version 1 — nothing appended. Re-ran the identical probe against the **baseline**'s six product files (same swap-and-restore procedure as finding 1): **identical outcome** — 200/v1/1 event, then 409/1 event/v1 on retry. The route reaches this refusal because the second call's `authority` resolves to `kind: 'journal'` (the marker is now journal-native), which sends it down `saveCampaignRecordThroughJournal` with `purpose: 'checkpoint'`, and `campaignRecordRow.plan`'s CAS (`baseVersion(0) !== currentVersion(1)`) refuses it before `append()` runs — so nothing is appended on either side of the change. No behavior change for this scenario.

**(b)** Covered by the shipped suite's `(pin) a stale whole-envelope PUT on a journal-native campaign answers 409 and appends nothing`, which passed both on the head (10/10 run) and, per finding 1's red reproduction, also passed unmodified against the baseline product files — this scenario's CAS refusal is pre-existing `campaignRecordRow.plan`/`saveCampaign` behavior, not new in U35b.

**(c)** Not run as a real race (charter permits stating it from the code). `better-sqlite3` transactions are synchronous on a single connection; `appendPreparedWithExtension`'s `prepare`+`extend` and `saveCampaign`'s own transaction both run to completion with no `await` inside the transaction body. Whichever of two same-baseVersion PUT handlers reaches its `db.transaction(...).immediate()` (or `saveCampaign`'s `db.transaction()`) call first commits, advancing the `campaigns.version` column. The second handler's `campaignRecordRow.plan` re-reads the row inside its own transaction, sees `baseVersion !== currentVersion` (now advanced), and returns `conflictFromStoredRow(...)` — the route answers **409 with the current record** to the loser, and nothing of the loser's write lands. This is symmetric regardless of which path (journal-native or not) either request takes, because both route through the same `campaignRecordRow.plan` CAS on the same SQLite connection.

**Genesis command id / principal, compared to baseline:** `campaignSnapshotCommand`'s genesis branch (campaignSourceGenesis.ts:230-234) computes `commandId: 'campaign-genesis:${campaignId}'` and `principal: {actorKind:'system', actorId:'campaign-source-genesis', authorityType:'campaign-source', authorityId: campaignId}` — byte-identical to the baseline's inline `appendCampaignGenesis` (`commandId: 'campaign-genesis:${campaignId}'`, same principal object). Unchanged. The new checkpoint branch mints a distinct `commandId: 'campaign-checkpoint:${campaignId}:${sequence}'` / `actorId: 'campaign-record-checkpoint'`, which is new but does not touch the genesis identity.

### 4. Authority consequence, probed (Q4) — confirms FN-u35b-checkpoint-replaces-journal-state is accurate

Wrote and ran a standalone probe (`_probe_u35b_q4.test.ts`, deleted after): created a journal-native campaign (balance 380000), appended a journal-only `SpendFunds` effect of 12,345 directly through `executeCampaignCommand` (no HTTP route, no `campaigns`-row write — confirmed the row stayed at version 1 / balance 380000 after the command, while the journal replay showed 367655), then PUT a whole envelope at the row's unchanged current version with balance 380000 (i.e. not carrying the SpendFunds effect). Measured result:

```
{"balanceBeforeSpend":380000,"balanceAfterSpendJournal":367655,"balanceAfterPutRow":380000,
 "balanceAfterPutJournalReplay":380000,"spendEffectGoneFromReplay":true}
```

The PUT succeeded (200), the row shows 380000, and replaying the journal **after** the PUT also shows 380000 — the SpendFunds effect is gone from the replayed projection. This is exactly what `applyCampaignEvent.ts`'s reducer does: `CampaignSnapshotPublished: (_state, event) => event.payload.state` (src/lib/campaign/sync/applyCampaignEvent.ts, in the `CAMPAIGN_EVENT_REDUCERS` map) discards the prior `_state` entirely and returns the checkpoint's own `payload.state`. **FN-u35b-checkpoint-replaces-journal-state's text is accurate**: a whole-envelope PUT's checkpoint does replace the journal's projected state wholesale, and a journal-only command effect since the last row write is lost from replay. The unit's own local receipt records this as "authority consequence of the decided design (not a defect of the diff)" and routes the follow-up to the owner's ruling — consistent with what I measured; I did not find this undisclosed or misdescribed anywhere in the diff or receipts.

### 5. Behaviour change confirmed (Q5) — intentional, tested, disclosed

Shipped suite row `(pin) a journal-native PUT whose envelope the projection refuses answers 500 with nothing written`: on the **head**, PUT with `refusedEnvelopeFor(id)` (two forces double-claim units, which the projection rejects) at the current baseVersion answers **500** (`error` matches `/^campaign checkpoint failed: /`), row stays at the created version, event count unchanged. Reproducing the same test against the **baseline**'s product files (finding 1's swap) shows the identical scenario returning row **version 2** (i.e. it *was* saved) — the failing assertion was `expect(storedRecord(id).version).toBe(created.version)`, "Expected: 1, Received: 2". Confirmed: before U35b, a PUT on a journal-native campaign had no projection gate at all (only creation went through the genesis projection check); after U35b, every journal-native PUT is projected before it's allowed to commit, and a projection refusal now rolls back the whole write instead of silently saving a record whose journal checkpoint can't be built.

### 6. Tests honesty (Q6) — one row strengthened, one narrow coverage gap (low severity, not a weakened assertion)

Two tests were removed from `campaignSourceGenesis.test.ts`, both exercising the now-deleted `maybeAppendCampaignGenesisOnCreate` (its logic is inlined into `[id].ts`'s `purpose` ternary: `authority.kind === 'journal' ? 'checkpoint' : (baseVersion === 0 && isCampaignJournalAuthorityEnabled()) ? 'genesis' : null`).

- `'appends the genesis when enabled and created'` (direct unit call) is **replaced by a stronger row**: the shipped suite's `(pin) a create under journal authority appends the genesis and writes the journal-native marker` exercises the same fact end-to-end through the real HTTP route and additionally asserts the row version, the exact event count/type, the effective branch-row count, and the marker state — a superset of what the removed test checked.
- `'is inert when disabled or when the save was not a create'` asserted three combinations — `(enabled=false, created=true)`, `(enabled=false, created=false)`, `(enabled=true, created=false)` — plus that the journal factory is never constructed when disabled. The new suite's `(pin) a campaign with no marker saves exactly as before, with no journal write` runs a create-then-update with the flag off and asserts zero journal events and no marker at the end, covering the first two combinations together. **The third combination — flag ON, but the call is an update (not a create) on a non-journal-marked campaign — has no dedicated row in the new suite**, nor does the "journal handle never even constructed when disabled" laziness property have an explicit assertion (e.g. a constructor spy) in the new tests. Reading the code, both properties are still structurally guaranteed: `purpose` is `null` whenever `baseVersion !== 0`, independent of the flag, and `[id].ts`'s ternary only evaluates `new SQLiteEventJournal(...)` in the non-null branch — so I did not find a live defect, only a coverage gap versus the deleted unit test. No assertion was weakened (nothing in the new suite asserts less than the old one did for a case it still covers); this is a removed case with no direct replacement, not a converted-to-skip or loosened check.

### 7. Independent mutant (Q7) — caught

Chose a mutant outside the receipts' M1/M2a/M2b/M3/M4/M5/M6 set (those all target transactional atomicity/dispatch in `campaignRecordJournalSave.ts` and `[id].ts`): weakened the optimistic-concurrency guard in `CampaignPersistenceService.ts:186`, `if (baseVersion !== currentVersion)` → `if (baseVersion > currentVersion)` (a stale write, `baseVersion < currentVersion`, would no longer be refused). Pre-mutant blob hash `4862394551c44db19e2ce756d5cdd4abff9a5b29`; mutated hash `98a690e93af04d24839d2b6c921e750d4fe55f8f`. Ran `npx jest src/__tests__/api/campaigns/campaignRecordJournalTransaction.test.ts`: **1 of 10 failed** — `(pin) a stale whole-envelope PUT on a journal-native campaign answers 409 and appends nothing` (expected 409, received 200), all 9 others still passed. Restored via `git checkout 8d04011c365736c29e7b03a7041f37aa5ab9a70d -- src/services/campaignPersistence/CampaignPersistenceService.ts`; `git hash-object` confirmed `4862394551c44db19e2ce756d5cdd4abff9a5b29`, matching the pre-mutant/head hash. This mutant is orthogonal to the receipts' table (it targets the shared CAS comparison rather than transaction structure) and the suite still caught it, which is a data point in the suite's favor beyond what the 7 named mutants already show.

### 8. Scope and cap (Q9) — within cap, no violations found

- Files: 11 total (3 receipts, 6 product, 2 test) against the 15-file cap; all under the four owned source paths plus the three named receipts.
- Product lines (non-test, added+removed): `campaignRecordJournalSave.ts` 139, `campaignSourceGenesis.ts` 130, `[id].ts` 65, `adopt.ts` 25, `CampaignMigrationMarkerStore.ts` 6, `CampaignPersistenceService.ts` 45 = **410**, under the 500 cap (matches the local receipt's own count).
- `git diff ... -- src/` searched for `claude|anthropic|co-authored|generated with|openai|gpt|copilot` (case-insensitive): no hits. No AI attribution found.
- Same diff searched for `C:\Users|E:[\\/]Projects|/c/Users|/e/Projects|wroll`: no hits. No absolute machine paths in product/test files (the receipts, which are evidence files rather than product/test files, do carry scratchpad log paths — outside this check's scope per the charter's wording).
- Comment audit: every added or changed function in the 6 product files and 2 test files carries a preceding comment. Spot-checked each against its code (Q1-Q6 above cite most of them directly): `campaignRootRevision`'s comment ("the campaign stream's root head revision... 0 when there is no stream... also the next sequence") matches its `SELECT stream_revision` query and its one caller in `prepare()`, called before `append()` runs. `saveCampaignRecordThroughJournal`'s comment describes exactly the commit/rollback/marker/refusal behavior verified in finding 1. `campaignRecordRow.plan`/`.write`'s comments ("plan reads the row only and decides the save; write stores a planned record with no check of its own") match the code split verified in finding 2. `writeCampaignMigrationMarker`'s updated comment ("Upsert the marker on `db` (default: the service handle)") matches its new optional-parameter default. `adopt.ts`'s corrected header explicitly discloses the still-open two-transaction gap (F2: genesis and record commit separately) rather than overclaiming atomicity — it does not claim more than the code does. No comment was found asserting a guarantee the code beneath it does not implement.

## Gates

All run inside the review worktree with Node 22 on PATH and `npm_config_dry_run=true`.

| Gate | Last line / result | Exit |
|---|---|---|
| `npx jest src/lib/campaign` | `Test Suites: 203 passed, 203 total` / `Tests: 2973 passed, 2973 total` | 0 |
| `npx jest src/lib/events/journal` | `Test Suites: 23 passed, 23 total` / `Tests: 243 passed, 243 total` | 0 |
| `npx jest src/__tests__/unit/api` | `Test Suites: 6 passed, 6 total` / `Tests: 35 passed, 35 total` | 0 |
| `npx tsc --noEmit` | (no output) | 0 |
| `npx oxlint` | `Found 84 warnings and 0 errors.` | 0 |
| `npx oxfmt --check` (the 8 non-receipt changed files) | `All matched files use the correct format.` | 0 |
| `node scripts/qc/lint-units.mjs` (lint:units) | `LINT_UNITS_PASS 100/100` | 0 |
| `node scripts/qc/validate-openspec-ci-quality.mjs` (qc:openspec-ci:validate) | `...errors=0` | 0 |
| `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |
| `... --next` | `U35b` (expected: review/merge/tick receipts are not yet recorded on this ledger at this head) | 0 |

Also re-run per finding: `npx jest src/__tests__/api/campaigns/campaignRecordJournalTransaction.test.ts` (10/10 on head), `npx jest src/services/campaignPersistence` (4/23), `npx jest src/__tests__/api` (55/761) — all as reported above.

## Cap

Files 11 (cap 15); product non-test lines 410 (cap 500). Both within cap. No file outside the owned paths.

## Verdict rationale

Every claim I could independently measure held: the one-transaction design is real (verified by reading `appendPreparedWithExtension` and reproducing red on the baseline's product files with the head's test), the non-journal path is a byte-for-byte-equivalent refactor (verified line by line and by full-suite gates), the idempotency properties that existed before U35b still hold and are unchanged by it (probed on both baseline and head), the one intentional authority consequence (checkpoint replaces journal state) matches its own recorded finding exactly (reproduced with an independent probe), the 500-vs-was-saved behavior change is real and intentional (reproduced on both sides), and an independently chosen mutant outside the receipts' own table was caught by the shipped suite. Every gate count matched the local receipt's claims exactly. Scope, caps, attribution, absolute-path and comment-accuracy checks all passed.

The only finding of substance is a narrow, low-severity test-coverage gap (finding 6): one of three combinations covered by a deleted unit test (flag enabled + non-create update) has no direct replacement row, though the code still structurally guarantees the same outcome and I verified that by reading it. This does not rise to a required edit — it is a legitimate observation for whoever next touches this ternary, not a defect in what was shipped.

This unit's review classes are authority, migration, and idempotency, all of which require a Lane B owner ruling per DELIVERY.md step 5 in addition to this Lane A review — in particular, FN-u35b-checkpoint-replaces-journal-state is explicitly awaiting that ruling. This review does not substitute for Lane B; it only confirms that the diff does what its own receipts and findings say it does.

**Verdict: APPROVE.**

## Cleanup

Performed after this report was written (see the tool transcript for exact output):

- Deleted the two scratch probe files before this point (`_probe_u35b_q4.test.ts`, `_probe_u35b_q3a.test.ts`); `git status --short` in the review worktree was clean before writing this file.
- `[System.IO.Directory]::Delete('E:\Projects\MekStation\.sisyphus\roadmap-completion-20260912\worktrees\u35b-review\node_modules')` (non-recursive junction removal).
- `git -C E:/Projects/MekStation worktree remove --force E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u35b-review`.
