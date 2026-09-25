# Lane A review: U35g
reviewedHead: 402102dc8be014c5590f304a7969d8661cb37ce0
baseline: 0fd24c343d8de2d467bb5b2d3d57c3beeb2d89af
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE-WITH-REQUIRED-EDITS

## Setup

- Fetched `origin` in the root checkout, then created a detached review worktree at
  `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u35g-review` at exactly
  `402102dc8be014c5590f304a7969d8661cb37ce0` (confirmed with `git rev-parse HEAD`).
- Did NOT reuse the pre-existing `worktrees/u35g` (the implementer's own worktree, already checked out at
  the same head) — the charter says other lanes' worktrees are off-limits and directs me to create my own,
  so I never touched `worktrees/u35g`, `worktrees/u22`, `worktrees/uat-diag`, or the root checkout's working
  tree/index.
- Junctioned `node_modules` from the root via PowerShell `New-Item -ItemType Junction`.
- Node 22.22.0 confirmed (`node --version` -> `v22.22.0`) via the prescribed PATH prefix; `npm_config_dry_run=true`
  exported before every npm/npx call; never ran `npm install`/`ci`/`prune`/build/Playwright; ran every jest
  suite as its own `npx jest <path>` invocation.
- Read GOAL.md, DELIVERY.md step 5, the U35g/U35d/U35e units.json entries, OD-u35g-coop-outcome-rewrites-record,
  the three named findings (FN-u35d-coop-outcome-roster-lost, FN-u35g-outcome-payload-may-carry-sourceversion,
  FN-u35g-feed-reads-damaged-as-repaired), the four evidence receipts named in the charter, the full product
  diff on the range, `CampaignBaselineSchemaPack.ts`, and `CampaignSync.ts`.
- One PostToolUse formatter hook rewrote an entire file to double-quote style the first time I used the `Edit`
  tool on `JournalCampaignEventStore.ts` to flip the cutover flag; I `git checkout`'d it back to HEAD
  immediately (confirmed sha256 match) and did every subsequent single-line mutation with `sed` via `Bash`
  instead, which the hook did not touch.
- Wrote one scratch jest file (`src/lib/multiplayer/server/__tests__/u35gLaneAProbeSourceVersion.test.ts`) for
  the question-1 probe; deleted it after capturing its output, confirmed with `git status --short` that the
  worktree was clean before running the final gates and before finishing.

## Files on the range

`git diff --stat 0fd24c343..402102dc8` — 13 files, +4224/-42 (dominated by the three evidence JSON receipts and
the 506-line new test file). Product files (7): `campaignActivityProjection.ts` (+6/-0),
`campaignRecordJournalState.ts` (+42/-15), `reconcileCoopBattle.ts` (+5/-3), `JournalCampaignEventStore.ts`
(+16/-7), `campaignCombatOutcomeInbox.ts` (+13/-5), `CampaignMatchHostOutcomeInbox.ts` (+27/-6),
`RosterUnitProjection.ts` (+9/-4) — summed via `git diff --numstat`: **+118/-40, 158 non-generated lines**,
matching the local receipt's own count exactly. Test files (3): `campaignActivityProjection.test.ts` (+21),
`reconcileCoopBattle.test.ts` (+11/-4), the new `campaignCombatOutcomeRecordRewrite.test.ts` (+506). All 13
files fall under U35g's ownership paths (`src/lib/campaign`, `src/lib/multiplayer/server`,
`src/types/campaign/RosterUnitProjection.ts`) or are the three named u35g evidence receipts. 13 ≤ 15 files;
158 ≤ 500 product lines.

## Findings

### 1. [Required edit before merge] `sourceVersion` (and any other optional ledger field) in a `RosterUnitChanged` payload is refused by the campaign baseline schema pack's `.strict()` roster-unit schema

- **Files**: `src/lib/multiplayer/server/CampaignMatchHostOutcomeInbox.ts:192,210-216` (the carry-forward:
  `const current = state.rosterUnits[change.unitId]; ... current === undefined ? {unitId, designation, status}
  : { ...current, status: change.status }`); `src/lib/events/replay/CampaignBaselineSchemaPack.ts:26-34`
  (`campaignRosterUnit` — `unitId`, `designation`, `status`, `unitRef?`, `unitSource?`, `.strict()`, no
  `sourceVersion`); `src/types/campaign/CampaignSync.ts:38-51` (`ICampaignRosterUnit.sourceVersion?: number`).
- **Probe**: wrote a scratch jest file that drives the REAL production path — `commitCampaignOutcomeConsequences`
  (exported from `CampaignMatchHostOutcomeInbox.ts`, calls the private `deriveCombatOutcomeConsequences`
  internally) — with a stubbed `eventStore.appendCombatOutcomeBatch` (no real SQLite needed since this is a
  pure-function probe of the payload shape) and a host state whose `rosterUnits['unit-0']` carries
  `sourceVersion: 3, unitRef: 'saved:abc123', unitSource: 'custom'`. Ran it once with a `destroyed` outcome and
  once with a `damaged` outcome, captured the committed `RosterUnitChanged` event, and ran its `payload`
  through the actual exported `CAMPAIGN_BASELINE_SCHEMA_PACK`'s `RosterUnitChanged` registration
  (`.schemas[0].parse(...)`). A third control case (a unit with no optional fields) confirmed the harness itself
  accepts a schema-clean payload.
- **Output** (`npx jest src/lib/multiplayer/server/__tests__/u35gLaneAProbeSourceVersion.test.ts`, 3/3 passed):
  the emitted payload really carries `sourceVersion: 3` (destroyed) / `sourceVersion: 7` (damaged), and
  `schema.parse(payload)` throws both times with `ZodError: [{"code":"unrecognized_keys","keys":["sourceVersion"],
  "path":["unit"],"message":"Unrecognized key: \"sourceVersion\""}]`. The control case (no optional fields)
  parses without throwing.
- **Answer to question 1**: refused. The field is exactly **`sourceVersion`** (an already-existing, pre-PR
  optional field of `ICampaignRosterUnit` — the same gap already exists for `CampaignSnapshotPublished`'s
  roster units, per the implementer's own F1). `unitRef`/`unitSource` are already declared optional in the
  schema and are NOT refused.
- **Context for the "required edit"**: the pack is explicitly "Not wired to campaign authority or recovery"
  today (its own header, confirmed by grep — nothing in `src/lib/campaign` or the campaign recovery path
  imports `CAMPAIGN_BASELINE_SCHEMA_PACK`), so this refusal has no live production effect on this head. But
  this PR is the FIRST code path to ever put `sourceVersion` into a `RosterUnitChanged` payload (previously
  the inbox always built a fixed 3-key object); once `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` flips (U35d, already
  queued right behind this unit) a real production combat outcome on a `sourceVersion`-carrying unit will
  durably journal an event that a later, unwired-today schema pack will refuse to replay. The minimal correct
  fix is on the schema side, not the payload side: add `sourceVersion: z.number().optional()` to
  `campaignRosterUnit` in `CampaignBaselineSchemaPack.ts` (that file sits outside U35g's ownership paths, so
  this needs either a path amendment here or an explicit decision to defer it to the schema pack's own
  task-11 wiring work — but per the review question's own framing, a measured refusal is a required edit
  before merge, so I am flagging it as such rather than silently deferring it).

### 2. [Recorded, non-blocking, matches receipt] A damaged unit's activity-feed entry still reads "repaired"

- **File**: `src/lib/campaign/activity/campaignActivityProjection.ts:167-172`. Pre-existing wording gap
  (FN-u35g-feed-reads-damaged-as-repaired, F2 in the local receipt); this PR only special-cases `status ===
  'destroyed'`, so `change === 'repaired' && unit.status === 'damaged'` still falls through to the old
  `'${designation} repaired'` / category `'technical'` branch. Confirmed by reading the diff; not something
  this unit's OD scope requires it to fix.

### 3. [Recorded, non-blocking, UAT round 2 triage] Guest mirror "Units" count now includes destroyed units

- **Files**: `src/components/campaign/coop/CampaignCoopRouteSurfaceConnected.tsx:373-375` (`rosterUnitCount:
  mirrorCampaign ? Object.keys(mirrorCampaign.rosterUnits).length : 0`); rendered at
  `src/components/campaign/coop/CampaignCoopRouteSurface.tsx:451-456` under `data-testid="guest-mirror-unit-count"`.
- This is a real, visible (if secondary) UI element — a small "guest mirror sync summary" strip (Sync / Balance
  / Salvage / Units / Seq) shown on the guest's co-op route surface — not a hidden debug panel. Already recorded
  as FN-u35g-kept-destroyed-units-in-guest-roster-count (F4 in the local receipt); the owner's sub-decision 1
  (keep destroyed units, don't remove them) makes this the correct consequence, not a bug, but it is a real
  answer to question 4's "what changes for a UAT round 1 tester": the guest's "Units" count that used to drop
  by one when a unit was destroyed now stays the same.

### 4. [Info, low confidence] The rewritten `unit` payload keeps the ledger's own `designation`, not the battle's

- **File**: `src/lib/multiplayer/server/CampaignMatchHostOutcomeInbox.ts:216` — `{ ...current, status:
  change.status }` takes `current.designation` (the host ledger's stored value) rather than
  `change.designation` (what `ICoopBattleConsequences.rosterChanges` derived from the battle). Before this PR
  the code always used `change.designation`. I found no unit-renaming capability in this codebase, so I judge
  this very low risk, but it is a real, disclosed change in which source wins if the two designations were ever
  to differ; not asserted by any test I found.

## Question-by-question answers

1. **Schema probe (see Finding 1)**: refused; field is `sourceVersion`; required edit before merge.
2. **Red/green reproduced**: rows suite `campaignCombatOutcomeRecordRewrite.test.ts` is 8/8 at HEAD with the
   flag false (`npx jest ...`, "Tests: 8 passed, 8 total"), and 8/8 under a temporary flip of
   `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` to `true` in `JournalCampaignEventStore.ts:86` (flipped via `sed`,
   restored via `sed` back to `false`, sha256 `f1d5e7cf...` before and after — byte-identical). Red repro:
   checked out the 7 baseline product files with `git checkout 0fd24c343 -- <paths>` (keeping HEAD's test
   file), flipped the flag on the reverted file, ran the same suite: **7 of 8 failed** (`o1`, `o1c`, `o1s`,
   `d`, `i`, `o2u`, `t`), only `a` (snapshot-authority untouched) passed — exactly matching the red receipt's
   own count. Restored all 7 files with `git checkout 402102dc8 -- <paths>`; sha256 of every file matched its
   HEAD blob hash before revert.
3. **Idempotency/concurrency**: row `(i)` (real SQLite) shows a duplicate `reconcileCoopBattle` call for the
   same outcome commits zero new events (`second.events` = `[]`) and leaves the raw `campaigns` row and event
   type list byte-identical (`expect(rawRow(id)).toEqual(rowAfterFirst)`). Row `(t)` mocks
   `campaignRecordRow.write` to throw inside the append's transaction (`appendWithExtension` wraps the whole
   thing in `this.db.transaction(...)`, confirmed by reading `SQLiteEventJournalWriter.ts:75-80`) and shows the
   whole outcome — consequences AND the inbox receipt — rolls back (0 receipts, unchanged raw row, unchanged
   event types), then a retry commits cleanly once. Stale-save 409: re-ran the suite with `U35E_ROWS_DIR` set
   to capture the rows JSON (not gated by any `expect()` in the suite itself, so I measured it directly) —
   `o1`, `o1c`, `o2u` (journal-native, rewrite applies) all show `stalePutStatus: 409, currentPutStatus: 200`;
   `o1s` (created via the PUT route alone, not journal-native, no rewrite) correctly shows `stalePutStatus: 200`
   because its record version never advanced, so the "stale" envelope wasn't actually stale — consistent
   behavior, not a gap.
4. **Destroyed units**: row `(d)` confirms the unit stays in the journal roster and the saved record with
   status Destroyed and `Object.keys(saved.forceOf)` still contains it (force membership kept). Snapshot-
   authority (production-default, non-journal-native): the record-rewrite hook is gated on the migration
   marker (`campaignRecordJournalState.ts:80`, `marker.marker.state !== 'journal'` -> no write), confirmed by
   row `(a)` passing ("a snapshot-authority campaign keeps its record untouched by an outcome"); the host's
   own local roster/force UI derives readiness from `unitCombatStates` via a separate post-battle processor
   this diff does not touch (read, not run — no test in this diff exercises that UI path directly). What DOES
   change for every co-op campaign regardless of persistence backend, because `reconcileCoopBattle.ts` and the
   `applyRosterUnitChanged` reducer (`applyCampaignEvent.ts:42-57`) are unconditional: the live shared CO1
   ledger (`host.getState().rosterUnits`) now keeps a destroyed unit with `status: 'destroyed'` instead of
   deleting it — directly proven by the updated `reconcileCoopBattle.test.ts` assertion
   (`expect(host.getState().rosterUnits['u-2']?.status).toBe('destroyed')`, previously
   `toBeUndefined()`), which I ran and confirmed green. That live-ledger change is what a UAT round 1 tester
   would actually see: (a) the campaign Activity Log (shared by host and guest, fed by the same CO1 event log)
   describes a destroyed unit as "`<designation> destroyed`" under category `battle` instead of
   "`<designation> removed`" under `acquisitions` (confirmed green via the new
   `campaignActivityProjection.test.ts` case); (b) the guest's small mirror-sync summary "Units" count no
   longer drops when a unit is destroyed (Finding 3).
5. **Field-keeping change, minimality**: correct, not over-broad. Before this PR the inbox already dropped
   `unitRef`/`unitSource`/`sourceVersion` from `unit` for EVERY roster change (including plain damage, which
   already used `'repaired'`), because the reducer replaces the roster-unit entry wholesale rather than merging
   (`applyRosterUnitChanged`: `rosterUnits: { ...state.rosterUnits, [unit.unitId]: unit }`). The owner's
   decision to keep destroyed units "available for salvage or repair decisions" (OD-u35g sub-decision 1) is
   only actionable if the kept unit still carries its catalog reference, so spreading `current`'s fields is not
   merely a test-satisfying convenience (per F3's alternate suggestion of weakening the agreement assertion
   instead) — it fixes a real, latent data-loss bug in the live CO1 ledger that predates this PR and would
   otherwise persist (and now compound, since destroyed units are no longer deleted so the stripped state
   sticks around indefinitely instead of vanishing). A narrower change (accept the test rows without the
   agreement check, per F3) would leave that bug in place; I judge the implemented fix minimal-correct, not
   over-broad, modulo Finding 4's low-confidence designation-source note.
6. **Independent mutant** (not M1-M9): mutated `STATUS_READINESS.destroyed` in
   `campaignRecordJournalState.ts:104` from `'Destroyed'` to `'Damaged'` (a wrong-but-present value, distinct
   from the receipt's M8 which is a full omission of the readiness carry-forward). sha256 before:
   `85686f84...439afc`. Applied via `sed` (single-line diff confirmed with `git diff`). Ran the rows suite:
   4 of 8 failed (`o1`, `o1c`, `d`, `t` — every row asserting `RECORD_ROSTER` with `unit-0: 'Destroyed'`), 4
   passed (rows not asserting that specific value). Restored via `git checkout 402102dc8 --
   src/lib/campaign/authority/campaignRecordJournalState.ts`; sha256 confirmed back to `85686f84...439afc`;
   `git status --short` clean.
7. **Gates** (see table below).
8. **Scope and cap** (see Cap section below).

## Gates

| Gate | Last line | Exit |
|---|---|---|
| `npx jest src/lib/campaign` | `Test Suites: 204 passed, 204 total` / `Tests: 2982 passed, 2982 total` | 0 |
| `npx jest src/__tests__/api/campaigns` | `Test Suites: 15 passed, 15 total` / `Tests: 110 passed, 110 total` | 0 |
| `npx jest src/lib/multiplayer/server` | `Test Suites: 160 passed, 160 total` / `Tests: 1178 passed, 1178 total` | 0 |
| `npx jest src/services/campaignPersistence` | `Test Suites: 4 passed, 4 total` / `Tests: 23 passed, 23 total` | 0 |
| `npx jest src/lib/events` | `Test Suites: 51 passed, 51 total` / `Tests: 927 passed, 927 total` | 0 |
| `npx tsc --noEmit` | (no output) | 0 |
| `npx oxlint` | `Found 84 warnings and 0 errors.` | 0 |
| `npx oxfmt --check` (10 changed .ts files) | `All matched files use the correct format.` | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | `...errors=0` | 0 |
| `node .../validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

All counts match the local/red receipts exactly (`src/lib/multiplayer/server` was 161/1181 on my first run
because my still-present scratch probe file added one suite/three tests; re-ran clean at 160/1178 after
deleting it, matching the receipt). No `src/lib/events` failure recurred (the shared `tsx` restoration held).

## Cap

- Files: 13 changed (≤ 15 cap), all under U35g's ownership paths or the three named receipts.
- Product lines: +118/-40 = 158 non-generated lines (≤ 500 cap), confirmed by `git diff --numstat` on exactly
  the 7 product files, matching the local receipt's own count.
- Flag constant: `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` is `false` in the diff and I restored it to `false` after
  every temporary flip (sha256-confirmed each time).
- No AI attribution: `git log` on the range shows a single commit with no attribution trailer.
- No absolute machine paths in product/test code: `git diff -- 'src/*'` on the range has no `C:\`/`E:\`/`/c/`/`/e/`
  hits (the three evidence JSON receipts do contain scratch-directory paths from the implementer's own mutant
  logs, which is expected of a receipt, not product code).
- Comments: read every changed/added function and doc comment against the code beneath it
  (`rewriteCampaignRecordAfterCommand`, `recordAtJournalState`, `STATUS_READINESS`, `appendCombatOutcomeBatch`,
  `appendCampaignCombatOutcomeBatch`, `deriveCombatOutcomeConsequences`'s new header, the `RosterUnitProjection.
  readiness` doc, the `reconcileCoopBattle` and `campaignActivityProjection` inline comments). None claims a
  property the code does not implement; `STATUS_READINESS`'s claim of being "the inverse of the checkpoint
  projection's readiness-to-status map" was checked directly against `campaignSourceGenesis.ts:52-54`
  (`Ready: 'operational', Damaged: 'damaged', Destroyed: 'destroyed'`) and is exact.

## Verdict rationale

Authority, idempotency, concurrency and the destroyed-unit migration behavior are all real, measured, and
correct: the rewrite runs inside the outcome's own transaction and rolls back atomically on failure, a
duplicate receipt is a true no-op, a stale save is refused with 409 once the record has advanced, and
snapshot-authority campaigns are provably untouched. The field-keeping change is the minimal correct fix, not
a shortcut. Every gate matches the receipts exactly, scope and caps are respected, and comments are accurate.
The one thing keeping this out of a plain APPROVE is Finding 1: I measured, with the real production code path
and the real schema pack, that a unit carrying `sourceVersion` produces a `RosterUnitChanged` payload the
strict campaign baseline schema pack refuses — exactly the risk FN-u35g-outcome-payload-may-carry-sourceversion
flagged and asked this review to settle. It is not live today (the pack is unwired), but this PR is the first
to expose it through a second event type, and it will be silently durable in the journal before the pack is
ever wired — so per the review question's own framing this is a required edit (most likely a one-line
`sourceVersion` addition to `campaignRosterUnit` in `CampaignBaselineSchemaPack.ts`, which is outside this
unit's current ownership paths) rather than something to wave through as a recorded-only finding.
