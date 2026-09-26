# Lane A review: U35i
reviewedHead: 00535cb45869ede00a0b00c39f24f024b3d3c575
baseline: 20d69c1d0264cf906b7fc3524fbaa3981bf7e5cc
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (clean).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u35i-review 00535cb45869ede00a0b00c39f24f024b3d3c575` — detached HEAD confirmed at `00535cb45`.
- `New-Item -ItemType Junction ... u35i-review\node_modules -Target ...\node_modules` (root) — junction created, no install/ci/prune run; `npm_config_dry_run=true` set for every npm/npx call; Node 22.22.0 (`v22.22.0`) on PATH.
- `gh pr view 1982 --json headRefOid,headRefName,baseRefName,state,title` → `headRefOid=00535cb45869ede00a0b00c39f24f024b3d3c575`, `headRefName=roadmap-u35i-flag-off-comments-20260925`, `baseRefName=main`, `state=OPEN` — PR #1982's exact proposed head matches the reviewed commit.
- Read `GOAL.md` (seven-stage ladder, Lane A definition matches DELIVERY.md), `DELIVERY.md` line 11 (Lane A: cross-model, no shared context, never a GitHub approval), `units.json` U35i entry on `origin/main` (behavior sentence: 3 exact edits + 2 folded clauses = 6 sites), the three staged receipts (`u35i-admission-20260925.json`, `u35i-local-20260925.json`, `u35i-red-20260925.json`), `evidence/u35d-admission-20260924.json` `flipResidueDecision.exactEdits[9..11]`, and the diff `git diff 20d69c1d0264cf906b7fc3524fbaa3981bf7e5cc..00535cb45869ede00a0b00c39f24f024b3d3c575`.
- Cleanup performed at the end of this review (see Setup teardown note in Findings 6).

## Files on the range

`git diff --stat 20d69c1d0264cf906b7fc3524fbaa3981bf7e5cc..00535cb45869ede00a0b00c39f24f024b3d3c575`:
```
src/lib/campaign/coop/coopRuntimeSession.ts                 | 4 ++--
src/lib/campaign/sync/ICampaignEventStore.ts                | 2 +-
src/lib/campaign/sync/InMemoryCampaignEventStore.ts          | 2 +-
src/lib/multiplayer/server/combatJournalAuthorityEnabled.ts | 4 ++--
src/lib/multiplayer/server/matchJournalAuthority.ts          | 1 -
src/pages/api/multiplayer/matches/index.ts                   | 6 +++---
6 files changed, 9 insertions(+), 10 deletions(-)
```
Exactly the six files named in the charter and in `units.json`'s behavior sentence; all fall under the unit's `ownershipPaths` (`src/lib/campaign`, `src/lib/multiplayer/server`, `src/pages/api/multiplayer/matches/index.ts`).

## Findings

1. **Comment-only, proven (Q1).** Method: for each of the six files, `git show <rev>:<path>` at baseline and at head, parsed each revision into a TypeScript AST (`ts.createSourceFile`), printed it back with `ts.createPrinter({ removeComments: true })`, and SHA-256'd the printed output. The printer's output depends only on AST structure, never on comment text, so identical printed output across revisions proves the AST (every non-comment token) is unchanged. Result for all six files: `rawByteDiff=true` (raw source differs) and `strippedByteIdentical=true` (same sha256 baseline vs. head) — e.g. `coopRuntimeSession.ts` both hash to `ccfa4545...d490c88`; all six pairs matched. `ALL_STRIPPED_IDENTICAL=true`. Confirmed independently by inspection: every `+`/`-` line in the diff is a `//` line, a `/** ... */` line, or a JSDoc `*` line (including the single-line deletion in `matchJournalAuthority.ts:3`, which removes one full comment line inside an unchanged `/** ... */` block).

2. **Every new comment matches the code (Q2).** Quoted after-text against the line that makes it true, read at head:
   - `coopRuntimeSession.ts:99-100`: "The cutover-flag factory, called with no journal factory: it returns the in-memory store whatever CAMPAIGN_JOURNAL_AUTHORITY_ENABLED holds." → `:101 eventStore: createDefaultCampaignEventStore(),` (no argument) into `JournalCampaignEventStore.ts:547 if (CAMPAIGN_JOURNAL_AUTHORITY_ENABLED && deps?.journal) { ... } return new InMemoryCampaignEventStore();` — with no `deps.journal`, the `&&` short-circuits regardless of the flag's value. True.
   - `matchJournalAuthority.ts:1-2`: JSDoc header now reads only "Combat journal-authority types and consume-apply seam (task 2.3)." (the false-equivalence sentence deleted). `:20-21 export const COMBAT_JOURNAL_AUTHORITY_MODE = 'off' as CombatJournalAuthorityMode;` is its own constant, independent of `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED = true` (`JournalCampaignEventStore.ts:90`) — the deleted claim was false on the head; the corrected (shortened) comment asserts nothing about the relationship. True.
   - `matches/index.ts:263-266`: "The creation checkpoint skips its genesis-branch step when this is false. The resolver answers the production constant, true with no override, so the step runs and a campaign with no genesis marker fails the checkpoint." → `:267 journalAuthorityEnabled: isCampaignJournalAuthorityEnabled()` resolves via `campaignJournalAuthorityEnabled.ts:16-18 return CAMPAIGN_JOURNAL_AUTHORITY_ENABLED;` (no override — confirmed by reading the whole 18-line file, no env-key branch present) into `campaignCreationCheckpoint.ts:216 if (!input.journalAuthorityEnabled) return 'skipped';` then `:218-220 if (marker === null) return failed('genesis-branch', ...)`. True.
   - `combatJournalAuthorityEnabled.ts:35-36`: "Null unless Playwright e2e mode is on (NEXT_PUBLIC_E2E_MODE==='true', its own check: the campaign resolver has no e2e arm) AND the ..." → `:42 if (process.env.NEXT_PUBLIC_E2E_MODE !== 'true') return null;`, and `campaignJournalAuthorityEnabled.ts` (full file read) has no `NEXT_PUBLIC_E2E_MODE` reference at all. True.
   - `ICampaignEventStore.ts:177`: "Both the journal-backed and the in-memory stores provide it" → `InMemoryCampaignEventStore.ts:80 appendCommandBatch = async (` and `JournalCampaignEventStore.ts:421 appendCommandBatch = async (` both define it. True; the deleted qualifier "flag-off" is gone and nothing false replaces it.
   - `InMemoryCampaignEventStore.ts:40`: "Client-command receipts make the in-memory adapter retry-safe." → `:85-89` a stored receipt for a repeated `commandId` returns `duplicate-command` instead of re-appending; `:119 record.commandReceipts.set(...)` stores it. True.
   No sentence claims more than the code shows; each drops or replaces exactly the false "flag-off" framing.

3. **Completeness (Q3).** The three `u35d-admission-20260924.json` `flipResidueDecision.exactEdits` entries for `coopRuntimeSession.ts:99-100`, `matchJournalAuthority.ts:3` and `matches/index.ts:262-265` (indices 9-11 of that array) are all present and match the diff verbatim in intent. Both folded clauses from `units.json`'s U35i sentence are present: `combatJournalAuthorityEnabled.ts:35-36` (U35h finding F1) and the paired `ICampaignEventStore.ts:177` + `InMemoryCampaignEventStore.ts:40` (U35d finding FN-u35d-inmemory-store-comments-say-flag-off). All six sites accounted for. `grep -in` for `flag-off`, `flag off`, `turns on`, `task 5.2`, `fixture arm`, `e2e arm` across the six files: the first four patterns have zero hits; `fixture arm` and `e2e arm` hit only in `combatJournalAuthorityEnabled.ts:26,36,52` and `matchJournalAuthority.ts:31` — all four describe the **combat** e2e/fixture arm, which U35d did not touch and which is still real (confirmed by reading `resolveCombatJournalAuthorityMode` at `:54-58`, which still falls through to `e2eCombatJournalAuthorityMode()` when the constant is `'off'`); none describe the deleted campaign fixture arm. No stale flag-off residue found.

4. See Gates below.

5. **Scope (Q5).** `git diff --name-only` lists exactly the six files, all under the unit's `ownershipPaths`. Commit `00535cb45` author/committer is `Wes Rollings <wrollings@gmail.com>`; `git log <range> --format=%B` greps clean for `co-authored|claude|anthropic|generated with|opus|sonnet` (no hits) — no AI attribution. `git diff <range>` greps clean for `[A-Za-z]:\\`, `/e/Projects`, `/c/Users`, `C:\Users` (no hits) — no absolute machine paths in the diff.

## Gates

All run on `00535cb45` in the detached review worktree, junctioned `node_modules`, `npm_config_dry_run=true`, Node v22.22.0. `scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` returned `MACHINE_IDLE` before each full-directory jest run.

| Gate | Last line | Exit |
|---|---|---|
| `npx jest src/lib/campaign/sync` | `Test Suites: 14 passed, 14 total` / `Tests: 108 passed, 108 total` | 0 |
| `npx jest src/lib/multiplayer/server` | `Test Suites: 161 passed, 161 total` / `Tests: 1180 passed, 1180 total` | 0 |
| `npx jest src/__tests__/unit/api` | `Test Suites: 6 passed, 6 total` / `Tests: 35 passed, 35 total` | 0 |
| `npx tsc --noEmit` | (no output) | 0 |
| `npx oxlint` | `Found 84 warnings and 0 errors.` | 0 |
| `npx oxfmt --check` (six files) | `All matched files use the correct format.` | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] ... errors=0` | 0 |
| `node .../validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

Note: an initial `npx oxlint` run picked up an incidental review-scratch file (`strip-compare.js`) that had been copied into the worktree to run the Q1 comment-stripping script, producing `86 warnings and 3 errors` — those 3 errors and 2 of the extra warnings were `no-console` on that scratch file, not on any of the six reviewed files or anything on the diff range. The scratch file was deleted from the worktree before the gate run recorded above; the clean re-run (`84 warnings, 0 errors`) matches the baseline warning count exactly, with the diff contributing zero new warnings or errors.

Roadmap validator counts (75/13/376/40) match `u35i-admission-20260925.json`'s `validatorOnBaseline.lastLine`, confirming the ledger is unchanged by this comment-only unit.

## Scope

Six files, all under `src/lib/campaign`, `src/lib/multiplayer/server`, or `src/pages/api/multiplayer/matches/index.ts` — the unit's declared `ownershipPaths`. 9 insertions / 10 deletions, well inside `caps.maxFiles=15` and `caps.maxNonGeneratedLines=500`. No AI attribution in the commit message. No absolute machine paths in the diff.

## Verdict rationale

Every changed line in the six-file diff is a comment line; a printer-based AST comparison (comments stripped) shows byte-identical output between baseline and head for all six files, independently confirming no non-comment code changed. Each of the six corrected comments was checked against the exact code line(s) it describes and is accurate; none overclaims. All three `u35d-admission-20260924.json` exact edits and both `units.json`-folded clauses are present, and a targeted grep found no remaining stale flag-off language in the six files (the only "fixture arm"/"e2e arm" survivors describe the still-real combat arm, out of this unit's scope). All nine gates pass with counts matching the admission baseline. Scope is exactly the six files under the unit's ownership paths, with no AI attribution and no absolute paths in the diff. APPROVE.
