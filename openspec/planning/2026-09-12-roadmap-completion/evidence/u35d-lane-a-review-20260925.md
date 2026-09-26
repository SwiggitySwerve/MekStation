# Lane A review: U35d

reviewedHead: 68c5912f9d67c990c80524102d37f48677f04ab5
baseline: 5a3e87f8ca4876ed36a3b186e56ba1211137cb12
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (silent success), confirmed `68c5912f9d67c990c80524102d37f48677f04ab5` resolves in the fetched repo.
- Created a detached worktree at `.sisyphus/roadmap-completion-20260912/worktrees/u35d-review` at the exact reviewed head (not the implementer's `worktrees/u35d`, which was never read or entered by this lane's Bash calls beyond `pwd`/`ls` at session start, before the worktree's off-limits status was re-confirmed).
- Junctioned `node_modules` from PowerShell (`New-Item -ItemType Junction`) targeting the root checkout's `node_modules`. `npm_config_dry_run=true` exported for the whole session; no `npm install`/`ci`/`prune` run. Node `v22.22.0` confirmed via `node --version`.
- All evidence/units.json/roadmap.json reads were done against the root checkout's tracked files (`openspec/planning/2026-09-12-roadmap-completion/{units,roadmap}.json` and its `evidence/` folder), never against another lane's worktree.
- At the end of this review the four scratch probe files below were deleted and `git status --short` in the review worktree showed a fully clean tree (no diff from the reviewed head) before the node_modules junction and worktree were torn down.

## Files on the range

`git diff --stat 5a3e87f8c..68c5912f9` — 15 files changed, 290 insertions(+), 417 deletions(-). Every file falls inside `units.json`'s U35d `ownershipPaths` (`src/lib/campaign/sync`, `src/__tests__/api/campaigns`, `e2e`, `scripts/e2e`, `src/__tests__/unit/api`) — verified file-by-file, no out-of-scope path touched. File count is exactly 15, at `caps.maxFiles`. Product-line diff on the three non-test files (`JournalCampaignEventStore.ts` +23/-20, `campaignJournalAuthorityEnabled.ts` +9/-29, `scripts/e2e/campaign-journal-authority.ts` +23/-25) is far under `caps.maxNonGeneratedLines` (500) by any reasonable counting. No absolute machine path (`E:\Projects`, `C:\Users`, `/e/Projects/MekStation`) appears anywhere in the diff (grepped). No AI-attribution string in any commit message on the range (`git log --format=%B` grepped for claude/anthropic/co-authored-by/generated with — no hits).

## Findings

1. **(informational, not a defect) Residue outside U35d's paths is real and already deferred, not silently broken.** `playwright.config.ts:314-323` still forwards `MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY` from the parent env into the e2e webServer's env, and `scripts/qc/gm-two-player-campaign-core.cjs:236` still sets it to `'1'` for the authority-recovery/privacy-pack plans, even though `campaignJournalAuthorityEnabled.ts` (this diff) deletes the only reader of that key. `src/lib/campaign/coop/coopRuntimeSession.ts:100`, `src/lib/multiplayer/server/matchJournalAuthority.ts:3` still describe the flag as off. Verified this is dead-but-harmless (`npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts` — 14/14 pass, unaffected) and that `units.json` U35h (`playwright.config.ts`, `scripts/qc`, `scripts/__tests__`) and U35i (`coopRuntimeSession.ts`, `matchJournalAuthority.ts`, `multiplayer/matches/index.ts`) already name these exact files as their scope, both citing `OD-u35g-coop-outcome-rewrites-record` sub-decision 3, both `state: "blocked"` (queued, not forgotten). Not a defect in this unit.
2. **(none found in scope) Comment accuracy.** Every changed doc comment I checked against the code it describes was accurate: the `JournalCampaignEventStore.ts` header/constant/factory comments now correctly describe the flag as on; `campaignJournalAuthorityEnabled.ts`'s new header correctly says "no environment key overrides it" (and the file's own test proves it with a `jest.doMock` that forces the constant false and confirms the resolver still answers false, i.e. no arm path survives to override anything); the `e2e/campaign-two-device-drive.spec.ts` and `e2e/gm-two-player-authority-recovery.pack.spec.ts` corrections (folded finding F4) match what `src/lib/multiplayer/server/getCampaignEventStore.ts:108-134` actually does — `selectCampaignEventStore` (the server co-op host's store) picks the durable journal store whenever SQLite is initialized, independent of `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED`, which only gates genesis/marker writes on create and adopt. The `maybeAppendCampaignGenesisOnCreate` renames point to `saveCampaignRecordThroughJournal` (confirmed to exist at `src/lib/campaign/authority/campaignRecordJournalSave.ts:71`, imported and called from `src/pages/api/campaigns/[id].ts:32,209`).
3. **(none found) No env-key residue inside the unit's own paths.** `CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV` and `e2eJournalAuthorityArmed` have zero occurrences anywhere in `src`, `scripts`, `e2e`. The only remaining occurrences of the retired arm string `MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY` are: the in-path test that names it explicitly as `RETIRED_ARM_KEY` to prove no code reads it any more, and the out-of-scope U35h/U35i residue in finding 1.

No REJECT-level or edit-required finding inside the unit's own ownership paths.

## Question 2's answer (two lines)

No real production flow loses an effect after the flip. `r1-r3`/`c1` (command-route and co-op-hire effects) and the combat-outcome/roster path (`o1c`, `o1s`, `o2u`) survive every host save I drove through the live route; `o1`/`o1s`'s "red-as-written" shape (a save at the *post*-outcome version still carrying a pre-battle roster) is real but unreachable by any store code path, which I independently confirmed: my own probe of that exact artificial envelope shape *does* lose the outcome (confirming the risk is genuine), while every store code path that advances `baseVersion` to a server-written version (`useCampaignPersistenceStore.ts:656-693, :746-760, :973-987, :1441-1450`) also calls `restoreRosterProjection` from that same record first, so the shape never arises from a real client; my own h1-h3 probe against the live route (stale pre-outcome PUT -> 409 -> GET server record, already carrying the outcome -> resave at the server version -> outcome preserved) passed.

## Gate rows (my re-measurement)

All rows probed on real SQLite (in-memory or temp-file, per fixture), via scratch test files under this worktree, deleted afterward with the two touched product files restored and sha256-verified against the head blobs.

| Row(s) | Method | Result |
|---|---|---|
| r1-r3, c1 | Already covered by the committed, passing suites (`src/lib/campaign` gate, U35e's suites) — not independently re-probed beyond re-running the gate (server-side balance/day-survival rows). | PASS (part of the 204/2987 gate) |
| o1, o1c, o1s, o2u, i, t, a, d | Already covered by `src/lib/campaign/sync/__tests__/campaignCombatOutcomeRecordRewrite.test.ts` (U35g, committed, part of the 204-suite gate) — read the test bodies in full; ran the gate and confirmed pass. | PASS (part of the 204/2987 gate) |
| o1 "red-as-written" premise | My own probe: an artificial envelope at the *post-outcome* version with a stale Ready roster (`laneAProbe.o1red.test.ts`) | Confirmed: PUT accepted 200, outcome lost (roster reverts to Ready) — this IS unsafe, exactly as the gate result says, but the shape is unreachable by real store code (see Findings/Q2). |
| h1-h3 | My own probe against the live route (`laneAProbe.h1h3.test.ts`): stale pre-outcome PUT, then GET, then resave at server version | 409 on the stale save; server record already carries the outcome (`Destroyed`); resave at the server version keeps it. All three assertions passed. |
| Migration (Q3) | My own probe (`laneAProbe.migration.test.ts`): a legacy record seeded directly via `saveCampaign` (no marker), first PUT at non-zero baseVersion, first combat-outcome command | Marker stays `not_found` through both; first PUT goes through the plain row-only path (route's `purpose` stays `null` since `authority.kind==='snapshot'`); the row is byte-identical before/after the outcome command (record-rewrite hook gated off with no journal-native marker). Control: a journal-native record created after the flip keeps `marker.state==='journal'` through its own PUT. |
| Idempotency (Q4) | My own probe (`laneAProbe.idempotency.test.ts`): same envelope/baseVersion PUT retried after the first succeeds | First PUT 200, journal event count +1; retry with the same stale baseVersion refused 409; event count unchanged; record version unchanged. Combat-outcome duplicate-receipt idempotency (`(i)` row) already covered by the committed suite (zero new events, byte-identical row on a duplicate `reconcileCoopBattle` call). |
| s1 (salvage) | Not independently re-probed; accepted the receipt's characterization (`FN-u35d-recovered-unit-lost`, scoped out by the owner, no production producer) since it is explicitly out of scope by owner ruling, not a claim this unit makes about correctness. | Accepted as scoped-out, not re-verified |

## Red reproduction

Restored `src/lib/campaign/sync/JournalCampaignEventStore.ts` and `campaignJournalAuthorityEnabled.ts` (the only two non-test files this unit changed) to the baseline blobs (`git show 5a3e87f8c:<path>`), ran the five re-pinned suites (`campaignPutGenesisRoute.test.ts`, `campaignAdoptRoute.test.ts`, `multiplayerCoopCreationCheckpoint.test.ts`, `JournalCampaignEventStore.test.ts`, `campaignJournalAuthorityEnabled.test.ts`): **9 failed, 27 passed, 36 total** — matches the red receipt's "9 failed, 27 passed" exactly. Restored both files to the head blobs via `git checkout 68c5912f9 -- <path>` and confirmed sha256 equality with the pre-restore head content (`cdddb0613147...` and `b81e7327c6cc...`), and `git diff --stat` on those two paths came back empty.

## Independent mutant (not M1-M4)

Mutated `isCampaignJournalAuthorityEnabled` to `return !CAMPAIGN_JOURNAL_AUTHORITY_ENABLED;` (negated resolver, distinct from the implementer's four: constant-to-false, arm-restored, genesis-route-assertion-inverted, store-factory-ignoring-flag). Ran the flag pins plus the two route suites: **8 failed, 5 passed, 13 total** — caught. Restored the file via `git checkout 68c5912f9 -- <path>` and confirmed sha256 equality with the head blob.

## Ladder runs

Build: `NEXT_PUBLIC_E2E_MODE=true NEXT_PUBLIC_E2E_TEST=true npm run build` — reached the standalone hydration guard and failed as expected in a junctioned worktree (`"Unsafe hydration destination ... contains a symlink or junction"`), matching the charter's stated expectation. Confirmed the `__E2E_MODE__` marker is present in `.next/static/chunks/pages/_app-*.js`.

Playwright ladder groups, run one at a time with `machine-idle.mjs --wait` before each, `HOSTNAME=127.0.0.1` process-scoped:
- `authority-recovery`: **4 passed** (matches receipt's "4")
- `privacy-pack`: **8 passed** (matches receipt's "8")
- `proposal-pack`: **2 passed** (matches receipt's "2")

Two-process specs (`campaign-journal-two-process-convergence.spec.ts`, `campaign-journal-two-process-privacy.spec.ts`) not run, per charter FN-u22-two-process-specs-cannot-run-in-junctioned-worktree; read in full instead (see Findings item 2).

## Gates

| Gate | Last line | Exit |
|---|---|---|
| `npx jest src/lib/campaign` | `Test Suites: 204 passed, 204 total` / `Tests: 2987 passed, 2987 total` | 0 |
| `npx jest src/__tests__/api` | `Test Suites: 57 passed, 57 total` / `Tests: 772 passed, 772 total` | 0 |
| `npx jest src/__tests__/unit/api` | `Test Suites: 6 passed, 6 total` / `Tests: 35 passed, 35 total` | 0 |
| `npx jest src/services/campaignPersistence` | `Test Suites: 4 passed, 4 total` / `Tests: 23 passed, 23 total` | 0 |
| `npx jest src/lib/multiplayer/server` | `Test Suites: 160 passed, 160 total` / `Tests: 1178 passed, 1178 total` | 0 |
| `npx jest src/stores/campaign` | `Test Suites: 27 passed, 27 total` / `Tests: 342 passed, 342 total` | 0 |
| `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts` | `Test Suites: 1 passed, 1 total` / `Tests: 14 passed, 14 total` | 0 |
| `npx tsc --noEmit` | (no output) | 0 |
| `npx oxlint` | `Found 84 warnings and 0 errors.` | 0 (warnings unchanged vs the receipt's 84) |
| `npx oxfmt --check` (15 changed files) | `All matched files use the correct format.` | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | `errors=0` | 0 |
| `node .../validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

All counts match the local receipt (`evidence/u35d-local-20260925.json`) exactly.

## Cap

15 files (== `caps.maxFiles`), well under `caps.maxNonGeneratedLines` (500) on the product diff (3 non-test files, largest single-file diff 23 insertions). No AI attribution in any commit on the range. No absolute machine path in the diff. Every changed comment I checked states what the code as-shipped actually does (see Findings item 2); no comment overclaims a guarantee the code does not implement.

## Verdict rationale

The flip is real and total: `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` is `true`, the resolver has no override, the deleted arm's env key and function have zero remaining readers or importers anywhere in `src`/`scripts`/`e2e`, and this is proven by a test that mocks the constant false and shows the resolver still answers false (no hidden path resurrects it). The one residue outside the unit's own paths (`playwright.config.ts`, `scripts/qc`) is dead-but-harmless, already covered by a passing test, and already named by two blocked successor units citing the same owner decision — it is not this unit's job to fix and is not silently unaccounted for. Red reproduction matches the receipt exactly (9/27 on the baseline product code with the re-pinned tests). All jest/tsc/lint/format/openspec/roadmap gates reproduce the receipt's exact counts. The Playwright ladder groups this unit's main proof depends on reproduce exactly (4/8/2). My own independent probes of the gate's hardest rows (h1-h3, the o1 "red" shape, migration of a pre-flip legacy record, and idempotent retry of a whole-envelope PUT) all confirm the receipt's characterization rather than contradicting it, including confirming that the "red" shape genuinely would lose data if a real client could ever produce it — which none can, by the store's own restore-on-adopt discipline. No finding rises to REJECT or to a required edit inside the unit's scope.
