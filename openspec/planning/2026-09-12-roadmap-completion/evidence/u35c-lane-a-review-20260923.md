# Lane A review: U35c
reviewedHead: c5e7c7611213d039eab0a40c1978e99138483338
baseline: 9374745f468fa38248a2a83b1ece478840b975d2
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (head already present locally; branch `roadmap-u35c-flag-agnostic-repin-20260923` confirmed reachable and matching `origin/roadmap-u35c-flag-agnostic-repin-20260923`).
- `git -C E:/Projects/MekStation worktree add --detach E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u35c-review c5e7c7611213d039eab0a40c1978e99138483338` — succeeded, detached HEAD at the exact reviewed head.
- Junction: `New-Item -ItemType Junction -Path '...\u35c-review\node_modules' -Target 'E:\Projects\MekStation\node_modules'` — created (verified `Mode d----l`).
- `npm_config_dry_run=true` exported in every shell; no npm install/ci/prune/build/Playwright was run anywhere in this review.
- Node: `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH` — `node --version` → `v22.22.0`.
- This review shares no context with the implementer (a separate Claude Opus Agent lane); it read only the charter, the repo, and the receipts the implementer wrote to disk.
- Flip mechanism used: read-only reuse of the implementer's own `flip-measure.mjs` (sha256 `38880bbb4d3653ee8c97363a4e2b9cb2f305c58d2e42172b73902bb8f7c44416`, matches the receipts exactly) via my own flip/restore wrapper scripts in my scratchpad, applied inside the review worktree only.
- Root checkout (`E:/Projects/MekStation`) `git status --short` empty before and after; the review worktree's `git status --short` is empty at the end.
- Cleanup performed at the end of this review per the charter (junction unlinked non-recursively, `git worktree remove --force` run) — see Cap section.

## Files on the range (`git diff --stat` 9374745f4..c5e7c761)

```
 .../evidence/u35c-admission-20260923.json          |  168 ++++
 .../evidence/u35c-local-20260923.json              | 1001 ++++++++++++++++++++
 .../evidence/u35c-red-20260923.json                |  312 ++++++
 .../api/campaigns/campaignAuthorityBlocked.test.ts |   30 +-
 .../api/campaigns/campaigns.authority.test.ts      |   34 +-
 src/__tests__/api/campaigns/campaigns.test.ts      |   38 +-
 .../api/multiplayerCoopCreationCheckpoint.test.ts  |   52 +-
 7 files changed, 1619 insertions(+), 16 deletions(-)
```

Confirmed independently by `git diff --stat` in this session: exactly the four owned test files plus the three receipts. No product file appears on the range.

## Findings

1. **[info] F1 (carried from the implementer's own receipt, verified accurate)** — `src/__tests__/unit/api/multiplayerCoopCreationCheckpoint.test.ts:319-338` ("refuses creation under the e2e journal-authority arm when the campaign has no genesis branch"): the row arms `NEXT_PUBLIC_E2E_MODE`/`MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY` and calls `persistHostCampaign({ genesis: false })`, still asserting a 500. Read the row directly (line range above): the assertion is intact and correct today; the arm becomes dead once U35d deletes `e2eJournalAuthorityArmed`, which is out of U35c's ownership paths. Correctly folded into U35d per units.json/git log (`5c4622fa7`/`56564f64c`). Not a defect in this PR.
2. **[info] F2 (carried from the implementer's own receipt, independently re-measured)** — `src/lib/campaign/persistence/__tests__/campaignFixture.ts:24-37` gives every force the same two units, forcing every genesis-dependent suite to override membership inline. I independently ran `grep -rl "unitIds: [\`unit-${index}\`]" src` in the review worktree and got exactly 13 files, matching the receipt's count exactly (3 of the 13 added by this unit: campaigns.test.ts, campaigns.authority.test.ts, the co-op suite). Real, outside this unit's paths, correctly recorded rather than fixed here.
3. **[none — no new findings]** — I found no additional defect, weakened assertion, scope leak, absolute-path leak, or AI-attribution issue beyond what the implementer already disclosed. See Gates and Verdict rationale below for the checks that back this.

## Independent measurements

### Q1 — Flag-agnostic, both sides, four suites

All four suites run individually, flag false (as on main, unedited worktree) then under the temporary flip (implementer's own `flip-measure.mjs`, restored + sha256-verified after every run):

| Suite | Flag false | Under temporary flip |
|---|---|---|
| campaigns.test.ts | 23 passed / 23 total | 23 passed / 23 total |
| campaigns.authority.test.ts | 6 passed / 6 total | 6 passed / 6 total |
| campaignAuthorityBlocked.test.ts | 4 passed / 4 total | 4 passed / 4 total |
| multiplayerCoopCreationCheckpoint.test.ts | 6 passed / 6 total | 6 passed / 6 total |

All eight runs are exit 0. These counts (23, 6, 4, 6 both ways) match `u35c-local-20260923.json`'s `flipRuns` section exactly.

Flag-file sha256 before flip (matches recorded baseline `0f062a9b...`/`392fd63f...`), after flip (matches recorded flipped `3de3dff6...`/`a6eab0af...`), after restore (matches baseline again) — all three checkpoints verified in this session with `sha256sum`.

`npx jest src/__tests__/api` under the same flip: **1 failed / 750 passed / 751 total**, the single failure being `campaignPutGenesisRoute.test.ts:88` ("writes the genesis marker only when the resolver is true", expected `not_found`, received `ok`) — exactly the row the charter names as U35d's, and the only one. `npx jest src/__tests__/unit/api` under the flip: **6 suites / 35 tests, all passed**. Both match the receipt's `informationalFlippedRuns`.

### Q2 — Test honesty

Read the baseline and head versions of all four files side by side (not just the diff):
- `campaigns.test.ts` / `campaigns.authority.test.ts`: the only body change is `envelopeFor`'s fixture construction (each force gets its own synthetic unit id instead of sharing the stock fixture's two units) plus one new premise test. No existing `it(...)` block lost an assertion; the diff's `-` lines are exclusively the old `envelopeFor` return statement.
- `campaignAuthorityBlocked.test.ts`: read the full pre- and post-image of both changed tests (lines ~104-136 baseline vs. ~121-153 head). `await put(...)` was replaced by `await seedSnapshotWithoutStream()` in exactly the two seeding call sites; every downstream assertion (`expect(stored.kind).toBe('ok')`, the 409/`blocked`/`conflict` checks, the version-unchanged check) is untouched. The new helper adds one assertion (`highestSequence(...) === -1`), it does not remove one.
- `multiplayerCoopCreationCheckpoint.test.ts`: `persistHostCampaign` became `async` and gained a `{ genesis }` option; all four call sites gained `await`; the arm row now passes `{ genesis: false }`. The row's own assertion (`statusCode` 500) is unchanged. No assertion anywhere in the file was deleted or weakened.

Premise rows assert something real, not tautologies: I independently reproduced mutant M4 below (a product-side mutation), and separately, the receipt's mutant M1 (disjoint-membership removed in `envelopeFor`) is corroborated by code reading — `campaignSourceGenesis.ts` refuses a unit claimed by two forces, so an envelope that violates the stated premise does make `authoritativeStateFromSerializedCampaign` throw, which is exactly what the new premise test in `campaigns.test.ts`/`campaigns.authority.test.ts` guards against.

### Q3 — No product change

`git diff --stat 9374745f4..c5e7c761` (reproduced above): only the four test files and the three receipts. No product path appears.

### Q4 — Independent mutant reproduction (my choice: M4, a product-side mutant, different from the test-side mutants I read about in the receipt)

- File: `src/pages/api/campaigns/[id].ts:187`.
- Pre-mutant sha256 in this worktree: `a0144a7cd574719a51328d49318d46fb82c5bc57fed4b707ccf2eacc603b946a` — matches the receipt's `preMutantSha256` for M4 exactly.
- Edit applied: `if (authority.kind === 'blocked') {` → `if (authority.kind === 'blocked' && process.env.U35C_MUTANT_NEVER === '1') {` (disables the blocked-refusal branch).
- Mutated sha256: `b3c08c61319b24053242896e5f0273f26dfbc7f44a195acf4c4d716fa2ce1d8b` — matches the receipt's `mutatedSha256` for M4 exactly.
- Ran `npx jest src/__tests__/api/campaigns/campaignAuthorityBlocked.test.ts` (flag false, no flip): **3 failed, 1 passed, 4 total** — the three refusal rows fail (`Expected 409, Received 200`; `Expected "blocked", Received undefined`), the control row (`accepts writes for a campaign that never began migrating`) still passes. This is an exact match to the receipt's M4 `flagFalse` run.
- Restored via `git checkout HEAD -- "src/pages/api/campaigns/[id].ts"`; sha256 back to `a0144a7c...` (matches pre-mutant); `git status --short` on the worktree came back empty.
- **The receipts' mutant table matches** what I measured for M4. (I did not re-run M1/M2/M3/M5; the charter asks for one mutant of my choosing, and I picked one on the product side, outside the four owned test files, as the more independent check.)

### Q5 — Gates

| Gate | Command | Last line | Exit |
|---|---|---|---|
| Four suites, flag off | run individually (table above) | see above | 0 each |
| Combined API + unit/api, flag off | `npx jest src/__tests__/api src/__tests__/unit/api` | `Test Suites: 60 passed, 60 total` / `Tests: 786 passed, 786 total` | 0 |
| Typecheck | `npx tsc --noEmit` | (no output) | 0 |
| Format | `npx oxfmt --check <4 changed files>` | `All matched files use the correct format. Finished in 57ms on 4 files using 16 threads.` | 0 |
| Lint units | `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| OpenSpec CI quality | `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] workflowContracts=8/8 ... errors=0` | 0 |
| Roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

All match the counts recorded in `u35c-local-20260923.json` exactly (751/54, 35/6, 100/100, errors=0, PASSED 75/13/376/40).

### Q6 — Scope

- `git diff --name-only` on the range: exactly the four files under `src/__tests__/api/campaigns` and `src/__tests__/unit/api`, plus the three receipts under `openspec/planning/2026-09-12-roadmap-completion/evidence/`. Nothing else.
- `git log -1 --format=%B` on the head: no AI attribution of any kind (checked by reading the full body).
- `grep -inE "C:\\\\|C:/Users|/c/Users|E:\\\\Projects|E:/Projects"` over the four changed test files: no matches — no absolute machine paths.
- Receipts describe the diff: cross-checked `u35c-local-20260923.json`'s per-file added/deleted line counts, its `implementation` summary per file, and its mutant table against the actual diff and my own re-runs; all consistent, no discrepancy found.
- Flag files byte-identical to baseline on the head: verified via `sha256sum` at the start of this review (before touching anything) — `0f062a9b...`/`392fd63f...`, matching the recorded baseline exactly.

## Gates (recap with exit codes)

- Four suites individually, flag false: exit 0, 0, 0, 0 (23/6/4/6 passed).
- Four suites individually, under temporary flip: exit 0, 0, 0, 0 (23/6/4/6 passed).
- `npx jest src/__tests__/api` under flip: exit 1 (1 failed — `campaignPutGenesisRoute.test.ts`, U35d's row, expected).
- `npx jest src/__tests__/unit/api` under flip: exit 0 (35/35 passed).
- `npx jest src/__tests__/api src/__tests__/unit/api` flag false: exit 0 (786/786 passed).
- `npx tsc --noEmit`: exit 0.
- `npx oxfmt --check` (4 changed files): exit 0.
- `npm run lint:units`: exit 0 (`LINT_UNITS_PASS 100/100`).
- `npm run qc:openspec-ci:validate`: exit 0 (`errors=0`).
- `node validate-roadmap.mjs`: exit 0 (`ROADMAP VALIDATION PASSED`).
- Mutant M4 apply + run + restore: apply exit 0, jest exit 1 (3 failed as expected), restore verified byte-identical.

## Cap

Read-only review; no build; no Playwright; no commit; root checkout untouched throughout (`git -C E:/Projects/MekStation status --short` empty before and after). Every jest invocation was scoped to one suite (or the two explicitly-named combined invocations the charter itself calls for) and run one at a time, never in parallel. `npm_config_dry_run=true` held for the whole session; no install/ci/prune ran. Non-claims: I did not re-run mutants M1/M2/M3/M5 myself (read their logged results and corroborated M1's mechanism by code reading only); I did not run Playwright, a production build, or a repository-wide `npx jest`; I did not inspect every one of the 13 files sharing the `campaignFixture.ts` override pattern beyond counting them.

## Verdict rationale

Every review question resolves cleanly and every number I measured independently matches the implementer's receipts bit-for-bit (suite counts both flag states, sha256 of the flag files at every checkpoint, the mutant's pre/post sha256 and failure counts, all gate outputs). The diff is test-only, all four suites are demonstrably flag-agnostic (green both ways, and green under the flip for the whole `src/__tests__/api`/`src/__tests__/unit/api` ownership paths except the one row that is explicitly U35d's), no assertion was removed or weakened, the two shared findings (F1, F2) are real but correctly deferred to their owning units rather than fixed or hidden here, and scope/attribution/path hygiene all check out. Review class is `routine` (Lane A only, no Lane B ruling required). Verdict: **APPROVE**.
