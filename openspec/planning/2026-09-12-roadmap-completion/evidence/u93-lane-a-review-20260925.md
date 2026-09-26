# Lane A review: U93
reviewedHead: f1c7057d58a731e6a8ece5af841727c7bbd8251c
baseline: fab5328254ffc30c8a853aa301bcfb0a69638439
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin`.
- `git -C E:/Projects/MekStation worktree add --detach .../worktrees/u93-review f1c7057d58a731e6a8ece5af841727c7bbd8251c` (a fresh detached worktree, separate from the implementer's own worktree at `.../worktrees/u93`, which was never touched).
- `New-Item -ItemType Junction` for `node_modules` into the review worktree.
- `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH` (node v22.22.0 confirmed); `npm_config_dry_run=true` for every npm invocation; no install/ci/prune/build/Playwright run.
- `node scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` run before each full-directory jest gate; every run returned `MACHINE_IDLE`.
- Teardown: `[System.IO.Directory]::Delete(...node_modules)` then `git worktree remove --force .../worktrees/u93-review`. The root checkout and every other worktree (`u21b`, `u35h`, `u58`, `u91`, `u93`) were left untouched.

## Files on the range

`git diff fab5328254ffc30c8a853aa301bcfb0a69638439..f1c7057d58a731e6a8ece5af841727c7bbd8251c --stat`:

```
 src/lib/api/__tests__/coopMatchRosterSourceVersion.test.ts | 63 ++++++++++++++--------
 1 file changed, 41 insertions(+), 22 deletions(-)
```

One test file only. No product file in the range. `sha256After` in `evidence/u93-local-20260925.json` (`776f17d5...`) matches the head blob measured directly (`sha256sum` on the checked-out head file).

## Findings

1. **Severity: none (informational, confirms receipt).** `src/lib/api/__tests__/coopMatchRosterSourceVersion.test.ts:298` (baseline) / `:306` (head). Reproduced red on the exact baseline file (`git show fab532825:...` written into the worktree, sha256 `7d9b97cf...` matching `testFileSha256` in `evidence/u93-red-20260925.json`): `npx jest src/lib/api/__tests__/coopMatchRosterSourceVersion.test.ts` gave `Tests: 3 failed, 7 passed, 10 total`, the three route rows failing on (a) `expect(isCampaignJournalAuthorityEnabled()).toBe(false)` — `Expected: false, Received: true` at `:298:49`, and (b) a secondary `TypeError: The "path" argument must be of type string or an instance of Buffer or URL. Received undefined` at the `afterEach` `rm(dir, ...)` on `:311:13` (dir never assigned because `:298` throws before `mkdtemp` at `:299`). This matches `evidence/u93-red-20260925.json` exactly, including the diagnosis correction that the TypeError is the suite's own `afterEach`, not a campaign-journal database path.

2. **Severity: none (informational, confirms receipt).** Probe: flipped only line 298 (`toBe(false)` → `toBe(true)`) on the baseline file, ran, restored via `git checkout <head> -- <file>` and re-verified sha256 `776f17d5...`. Result: `Tests: 2 failed, 8 passed, 10 total`; the two 201 rows answered `status 500, error "Campaign creation checkpoint failed at genesis-branch: genesis branch is not committed"`, the 400 row passed, no TypeError. Matches `evidence/u93-red-20260925.json`'s `probePinFlippedToTrue` block exactly (same counts, same error text, same passing row).

3. **Severity: none (harness parity confirmed).** `src/lib/api/__tests__/coopMatchRosterSourceVersion.test.ts:322-356` (head) vs `src/__tests__/unit/api/multiplayerCoopCreationCheckpoint.test.ts:120-164`. Both build the envelope, call `saveCampaign(envelope, 0)` and assert `saved.kind === 'ok'`, then call `appendCampaignGenesis(new SQLiteEventJournal(getSQLiteService().getDatabase(), () => GENESIS_AT), writeCampaignMigrationMarker, { envelope, occurredAt: GENESIS_AT })` and assert `genesis.kind === 'genesis-appended'`. The only difference is the `GENESIS_AT` literal date string (`2026-09-25T00:00:00.000Z` vs `2026-08-29T00:00:00.000Z`), which is immaterial to route behavior — the checkpoint (`campaignCreationCheckpoint.ts:212-222`) only checks that `readGenesisMarker` returns non-null, not the date. No difference that changes what the route sees.

4. **Severity: none (behavior confirmed).** `src/pages/api/multiplayer/matches/index.ts:320-329,335,341`: the 201 path registers the host with `state: body.coopCampaign.state` (the posted body, not a re-derived value), so `sourceVersion 3` on the 201 rows comes from the request body as the unit's behavior sentence claims. The 400 row (`answers 400 and registers no host for an unknown extra roster field`) still fails schema parsing before the route reaches `commitCoopCampaignAuthority`, unchanged from U88. `campaignJournalAuthorityEnabled.ts:16-18` returns the raw `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` constant with no override; `JournalCampaignEventStore.ts:90` sets it `= true`. The head's `beforeEach` assertion `expect(isCampaignJournalAuthorityEnabled()).toBe(true)` is therefore a true statement of production state with no override, confirmed by direct read of the flag source, not by trusting the receipt.

5. **Severity: none (independent mutant, caught).** Chose a mutant distinct from the three in the receipts (genesis-append-removed, flag-inverted, flag-removed): replaced the `writeCampaignMigrationMarker` argument to `appendCampaignGenesis` with a no-op (`async () => undefined`) at `:351`, i.e. the in-memory append still runs and still reports `genesis-appended`, but the durable marker the checkpoint reads is never written. Ran `npx jest src/lib/api/__tests__/coopMatchRosterSourceVersion.test.ts`: `Tests: 2 failed, 8 passed, 10 total`, both 201 rows failing with the same `500 "Campaign creation checkpoint failed at genesis-branch: genesis branch is not committed"`. Caught. This shows the checkpoint's `readGenesisMarker` (`campaignCreationCheckpointPorts.ts:35-36`) depends on the marker actually being persisted, not merely on the in-process append call returning success — a slightly stronger guarantee than the three receipted mutants individually demonstrate. Restored the file afterward; sha256 back to `776f17d5...`, `git status --porcelain` clean.

No defects found. The one open item is process-level, not a defect in this diff: `evidence/u93-local-20260925.json`'s own `findingsReportedNotFixed.F1` already flags that U93's ledger `behavior` sentence on origin/main (written by the parent before this unit's admission) misattributes the baseline TypeError to a campaign-journal database path; the unit's own admission/red receipts already correct this (`diagnosisCorrected20260925`), and this review independently reproduced the same correction (findings 1-2 above), so the record is accurate at the unit level even though the top-level ledger sentence that predates it is not. Not a code defect and outside this PR's file (`units.json` is not in the diff).

## Gates

All commands run from the detached review worktree at head `f1c7057d5`, Node v22.22.0, `npm_config_dry_run=true`, machine idle confirmed before each full-directory run.

| command | last line | exit |
|---|---|---|
| `npx jest src/lib/api` | `Test Suites: 1 passed, 1 total; Tests: 10 passed, 10 total` | 0 |
| `npx jest src/__tests__/unit/api` | `Test Suites: 6 passed, 6 total; Tests: 35 passed, 35 total` | 0 |
| `npx jest src/__tests__/api` | `Test Suites: 57 passed, 57 total; Tests: 772 passed, 772 total` | 0 |
| `npx tsc --noEmit` | (no output) | 0 |
| `npx oxlint` | `Found 84 warnings and 0 errors.` | 0 |
| `npx oxfmt --check src/lib/api/__tests__/coopMatchRosterSourceVersion.test.ts` | `All matched files use the correct format.` | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] ... errors=0` | 0 |
| `node .../validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

Every count matches `evidence/u93-local-20260925.json`'s recorded gates exactly (10/10, 35/35, 772/57, oxlint 84 warnings/0 errors, oxfmt clean, lint:units 100/100, qc:openspec-ci errors=0, validator PASSED with identical node/package/task/triage counts).

## Scope

- One file changed: `src/lib/api/__tests__/coopMatchRosterSourceVersion.test.ts` (test only), confirmed by `git diff --stat` on the exact range.
- No product file in the diff; `productLines: 0` in the local receipt is consistent with the measured diff.
- No AI attribution in the head commit message (`git log fab532825..f1c7057d5 --format="%B"`): `test(api): the co-op roster sourceVersion suite seeds the campaign genesis under journal authority`, no trailer.
- No absolute machine paths in the diff (`grep -iE "C:\\|E:\\|/c/Users|/e/Projects|wroll"` over the diff: none found).
- Header comment (`:1-14`) and the `persistHostCampaign` doc comment (`:314-320`) were read against the code beneath them: both state exactly what the function does (journal authority on, no override; save then append genesis then write the marker) with no unverifiable claim.

## Verdict rationale

Every claim in the U93 admission/red/local receipts was independently reproduced by this lane rather than trusted: the baseline red (3 failed/7 passed, same two failure shapes), the pin-only probe (2 failed/8 passed, same 500 at genesis-branch), the harness-parity comparison against `multiplayerCoopCreationCheckpoint.test.ts`, the flag's true-with-no-override state read from source, the route's use of the posted body for host state, all nine listed gates at their exact recorded counts, and one independently-chosen mutant (marker-write no-op) that the head's assertions caught. The diff is a single test file, test-only, in-scope for `ownershipPaths: ["src/lib/api"]`, with no product change, no AI attribution, no absolute paths, and accurate comments. No finding rises above informational. Recommend APPROVE.
