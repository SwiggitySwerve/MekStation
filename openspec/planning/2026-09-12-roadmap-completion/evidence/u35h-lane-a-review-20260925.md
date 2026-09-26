# Lane A review: U35h
reviewedHead: 895a94d35916c43b078d98eb030150a39a14da2e
baseline: 54ca8197ca90534648bf6b1ef310186116189c6f
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (no new refs).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u35h-review 895a94d35916c43b078d98eb030150a39a14da2e` — succeeded, HEAD confirmed at the exact reviewed commit (`git rev-parse HEAD` = `895a94d35916c43b078d98eb030150a39a14da2e`).
- `node_modules` junctioned via PowerShell `New-Item -ItemType Junction` to the root checkout's `node_modules`.
- `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH` for every node/npm/npx call (confirmed `node --version` = v22.22.0).
- `npm_config_dry_run=true` exported; no install/ci/prune/build was run.
- No context shared with the implementer session; this review was built solely from the ledger receipts, the diff, and independent command runs in a detached worktree distinct from `worktrees/u35h` (the implementer's).
- Worktree removed and junction deleted at the end per the charter's teardown steps.

## Files on the range

`git diff 54ca8197c..895a94d35 --stat` (in the review worktree, exact reviewed head):

```
 e2e/gm-two-player-authority-recovery.pack.spec.ts  |  3 +-
 playwright.config.ts                               | 15 +---
 .../__tests__/gm-two-player-campaign-qc.test.ts    | 86 ++++++++++++++--------
 scripts/qc/gm-two-player-campaign-core.cjs         | 19 ++---
 4 files changed, 69 insertions(+), 54 deletions(-)
```

Exactly the four paths named in `units.json` U35h's `ownershipPaths` (after the 2026-09-26 path amendment adding the e2e spec) and no others.

## Findings

1. **[info] Completeness against `evidence/u35d-admission-20260924.json` `flipResidueDecision.exactEdits`** — every one of the four in-scope exact edits was made and nothing beyond them:
   - `playwright.config.ts:314-322` (campaign forward comment + guarded spread) — deleted whole. Confirmed in the diff hunk (`- Fixture-only journal authority ...` and the `...(process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY ...)` spread both removed).
   - `playwright.config.ts:324-328` (combat forward comment reworded to stand alone) — new text reads "Fixture-only combat journal authority. Playwright's webServer.env is a whitelist, so the QC plan's opt-in never reaches server.js unless it is forwarded here, under a presence guard." The combat guarded spread itself (baseline `:329-334`) is byte-identical (no diff hunk touches it).
   - `scripts/qc/gm-two-player-campaign-core.cjs:71-76` (authority-recovery comment) — reworded to name the combat key alone ("sets MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE=enabled so combat genesis is live under the fixture arm ...; campaign genesis is live through the production flag").
   - `scripts/qc/gm-two-player-campaign-core.cjs:228-238` (arming comment + campaign key line `:236`) — comment rewritten to the combat key alone, `MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY: '1',` deleted from the `armsJournalAuthorityFixture` spread; the combat key line is unchanged.
   - The `scripts/__tests__/gm-two-player-campaign-qc.test.ts` edits (all nine `exactEdits` sub-items in the unit's scope) are all present: the authority-recovery `toEqual` and privacy-pack `toMatchObject` drop the campaign key; the authority-union and all-union campaign `toBe(1)` expects are deleted; the non-arming `toBeUndefined` row is kept (permitted by the exact-edits list as "keep or drop it as redundant" — still true, still asserts against `undefined`); the config-source `toContain`/`toMatch(guardedForward(...))` campaign pins and the "the campaign line is the control" comment are removed/rewritten; a new row `forwards and sets no campaign journal key from the config or the runner` was added.
   - `e2e/gm-two-player-authority-recovery.pack.spec.ts:16-17` — the sentence "The QC group still sets MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY, which no server code reads." is deleted; the paragraph now ends cleanly at "... runs its genesis-branch step." (confirmed by reading the file at head, lines 1-25).
   - Nothing outside this list was touched in the four files (full diff read line-by-line above).

   **Repo-wide grep** (`git grep -n MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY -- . ':!openspec/planning'` at head) returns exactly four hits, all classified:
   - `scripts/__tests__/gm-two-player-campaign-qc.test.ts:560` — the retained non-arming `toBeUndefined` pin (retired-key test, permitted).
   - `scripts/__tests__/gm-two-player-campaign-qc.test.ts:605` — the new row's own `const campaignKey = '...'` (retired-key test, the row itself).
   - `src/lib/campaign/sync/__tests__/campaignJournalAuthorityEnabled.test.ts:5,13` — `RETIRED_ARM_KEY`, a pin from U35d proving the resolver has no override (history/retired-key test, out of U35h's scope, unedited and unaffected).
   - `openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md:496` — a dated 2026-09-03 historical decision entry (history, not a live claim).
   No live forward, set, or read of the key remains anywhere in `src`, `scripts`, `e2e`, or `playwright.config.ts`. `src/lib/campaign/sync/campaignJournalAuthorityEnabled.ts:16-18` still returns the bare `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` constant with no env read (read directly, confirms admission's `readerSurvivesInSrc: none`).

2. **[info] Combat arm untouched** — diffed the combat forward and the runner's combat setting against baseline: in `playwright.config.ts` only the comment above the combat spread changed (reworded to stand alone); the guarded spread `...(process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE ? {...} : {})` itself produced no diff hunk (byte-identical). In the runner, `MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE: 'enabled'` under `armsJournalAuthorityFixture` is unchanged; only the comment above it was reworded. Ran `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts --verbose` at head: all seven combat-key pins named in the admission receipt (`combatKeyAssertionsThatStay`) are in the 15/15 passing rows, including `forwards the combat journal key from the Playwright webServer env`.

3. **[info] The new row** — read the row at `scripts/__tests__/gm-two-player-campaign-qc.test.ts:604-639`: it builds `linesNamingTheKey` by grepping `MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY` line-by-line across `playwright.config.ts`, `scripts/qc/gm-two-player-campaign-core.cjs`, and `scripts/qc/run-gm-two-player-campaign.mjs`, and `groupsSettingTheKey` by calling `core.buildRunPlan` for every key in `core.REGISTERED_GROUPS` and checking whether the campaign key appears in the resulting `plan.environment` (skipping groups that throw `NOT_IMPLEMENTED`), then asserts both lists equal `[]`.
   - Restored `playwright.config.ts` alone to the baseline byte (`git show 54ca8197c:playwright.config.ts > playwright.config.ts`, sha256 confirmed `0e4ee55...` matches the admission receipt's baseline hash) and ran `npx jest ... -t "forwards and sets no campaign journal key"`: **red**, naming exactly `playwright.config.ts:318`, `:320`, `:321` — matching the row's own claimed lines. Restored to head (`git show 895a94d35:playwright.config.ts > playwright.config.ts`), sha256 verified `d483179...` (matches local receipt's recorded post-edit hash).
   - Restored the runner alone to baseline (sha256 `f065b25...` confirmed against baseline hash) and re-ran the same `-t` filter: **red**, naming `scripts/qc/gm-two-player-campaign-core.cjs:73` and `:236`, and groups `authority-recovery`, `privacy-pack`, `authority`, `all` — matching the red receipt's `linesTheRowFinds`/`groupsTheRowFinds` exactly. Restored to head, sha256 verified `5547462...`.
   - `git status --short` after both restores: clean (exit 0), confirming the working tree returned exactly to the reviewed head.

4. **[info] Independent mutant** — chose a mutant not in the local receipt's three (M1: config forward restored; M2: runner sets the key keyed on group; M3: runner sets the key under a dynamically-built name). Appended one comment line naming the campaign key to `scripts/qc/run-gm-two-player-campaign.mjs` (the third file the row's `linesNamingTheKey` scans, untouched by any of the receipt's three mutants). Re-ran the focused test: **red**, `linesNamingTheKey: ["scripts/qc/run-gm-two-player-campaign.mjs:8: // MYMUTANT: ..."]`. Restored via `git checkout --`, sha256 verified `33c704c...` (unchanged from before the mutant). The row therefore also covers the third file it claims to scan, which none of the implementer's three mutants exercised.

5. **[info] Gates on the head** (`E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u35h-review`, node v22.22.0, machine-idle confirmed via `node scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` before each full-directory jest run):
   - `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts --verbose`: exit 0, 15/15 passed (matches local receipt row table verbatim, including the new row).
   - `npx jest scripts`: exit 0, `Test Suites: 80 passed, 80 total`, `Tests: 10 skipped, 1235 passed, 1245 total` — identical counts to the local receipt.
   - `npx jest src/__tests__/unit/evidence`: exit 0, `2 passed, 2 total` suites, `18 passed, 18 total` tests — identical to the local receipt.
   - `npx jest src/lib/campaign/sync`: exit 0, `14 passed, 14 total` suites, `102 passed, 102 total` tests (includes `campaignJournalAuthorityEnabled.test.ts`, unaffected by U35h and green).
   - `npx tsc --noEmit`: exit 0, no output.
   - `npx oxlint`: `Found 84 warnings and 0 errors.` — matches the local receipt's recorded baseline (84) exactly.
   - `npx oxfmt --check playwright.config.ts scripts/qc/gm-two-player-campaign-core.cjs scripts/__tests__/gm-two-player-campaign-qc.test.ts e2e/gm-two-player-authority-recovery.pack.spec.ts`: `All matched files use the correct format.`
   - `npm run lint:units`: `LINT_UNITS_PASS 100/100`.
   - `npm run qc:openspec-ci:validate`: `... errors=0` (identical line to the local receipt).
   - `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs`: `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` (identical to the local receipt).

6. **[info] Scope and cap** — `git diff --numstat` at head: `playwright.config.ts` +3/-12, `scripts/qc/gm-two-player-campaign-core.cjs` +8/-11 → 34 product lines (matches local receipt); `e2e/...pack.spec.ts` +1/-2, `scripts/__tests__/...qc.test.ts` +57/-29 → 89 test lines (matches local receipt, not counted toward the cap per OD-line-cap-product-lines). 4 files, well under `maxFiles: 15`; 34 product lines, well under `maxNonGeneratedLines: 500`. `git diff | grep -iE "co-authored|generated with|claude|anthropic|E:\\\\|E:/Projects|C:\\\\Users"`: no matches — no AI attribution, no absolute machine paths. Every changed comment was checked against the code beneath it (finding 1's quotes) and each states what the code actually does, verified against `campaignJournalAuthorityEnabled.ts` (returns the bare constant) and the actual guarded spreads/`armsJournalAuthorityFixture` logic read directly.

7. **[info, carried, not a defect of this PR]** `src/lib/multiplayer/server/combatJournalAuthorityEnabled.ts:35-36` still reads "the same `NEXT_PUBLIC_E2E_MODE==='true'` check the campaign arm uses" (confirmed by reading the file at head) — the campaign arm it refers to was deleted by U35d, so this doc comment is stale. It is outside U35h's four ownership paths (owned by R2/U35i, not R6.loop-harness), correctly reported-not-fixed in the local receipt (`findingsReportedNotFixed` F1) and folded into U35i per units.json U35h local-receipt summary. Not a completeness gap in U35h.

No findings warrant a REQUIRED-EDITS or REJECT verdict.

## Gates

| Gate | Last line | Exit |
|---|---|---|
| `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts --verbose` | `Tests: 15 passed, 15 total` | 0 |
| `npx jest scripts` | `Tests: 10 skipped, 1235 passed, 1245 total` | 0 |
| `npx jest src/__tests__/unit/evidence` | `Tests: 18 passed, 18 total` | 0 |
| `npx jest src/lib/campaign/sync` | `Tests: 102 passed, 102 total` | 0 |
| `npx tsc --noEmit` | (no output) | 0 |
| `npx oxlint` | `Found 84 warnings and 0 errors.` | 0 |
| `npx oxfmt --check` (4 changed files) | `All matched files use the correct format.` | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | `... errors=0` | 0 |
| `node validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

## Cap

4 files changed (cap 15); 34 non-generated product lines (cap 500, `playwright.config.ts` + the runner counted as product per OD-line-cap-product-lines); 89 test lines reported separately, not counted. No AI attribution, no absolute machine paths in the diff (grepped). All four changed files are within `ownershipPaths`; no file outside the four paths was modified.

## Verdict rationale

Every listed exact edit was made, verified line-for-line against the diff and against the files read at head; nothing was made beyond the list. A repo-wide grep found no live forwarder, setter, or reader of the retired key anywhere; the four remaining hits are all correctly classified as retired-key tests or history. The combat arm's forwarding, setting, and all seven combat-key test pins are byte-identical or unchanged and green. The new no-campaign-key row was independently reproduced red against the baseline for the config alone and the runner alone, naming the exact lines and groups the receipts claim, and files were restored to their recorded sha256 after each mutation. An independent mutant in the one file none of the implementer's three mutants touched (`scripts/qc/run-gm-two-player-campaign.mjs`) was caught by the row. All ten required gates pass on the exact reviewed head with counts identical to the local receipt. The diff stays within the four owned paths and under cap, carries no AI attribution or absolute paths, and every changed comment states what the code actually does. The one pre-existing stale comment (`combatJournalAuthorityEnabled.ts:35-36`) is outside this unit's paths and was correctly reported-not-fixed rather than silently left unmentioned. Verdict: APPROVE.
