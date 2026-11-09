# K7 verification

Base: origin/main 1f3ada8888d9f99a06e4ba0ed3478a9810f848c3. Extraction commit: c3e0b744d5a21a04f87a6994680670f7dd84cf60. One draft PR; Root owns merge.

## Initial implementation evidence

| Check | Result |
| --- | --- |
| Extraction red | 5 characterization tests failed without the public repair application export |
| Extraction green | 24 full repair/processor suites, 351 tests passed |
| Extraction fidelity | Extracted function bodies exactly match the original after newline normalization |
| Behavior red | 9 assertions failed across the existing owning directories; the corrected integration harness separately failed all 4 new scenarios |
| Final owning directories plus integration | 130 suites passed; 1,603 tests passed; 32 existing skips |
| Full simulation runner directory | 151 suites, 1,484 tests passed |
| Replay/digest/golden before and after | 68 suites, 1,030 tests passed on each run; no committed fixtures/digests changed |
| Combat validation | npm run validate:combat exited 0, including catalog/behavior, unresolved gaps and strict OpenSpec validation |
| Root and scripts TypeScript configs | Both exited 0 |
| Root lint | 63 warnings, 0 errors; ceiling unchanged |
| Unit lint and Jest suite | Passed; path findings/ceilings: e2e 49/50, scripts 50/50, API 16/16 |
| OpenSpec focused strict | Passed |
| Repository budget check | 3,049 test files; 57 unkeyable; 92 repository-wide keys; exited 0 |

Tests use the installed Node 22.22.0 runtime to match the shared better-sqlite3 ABI. The shell defaults to Node 24; its initial replay attempt failed on native ABI mismatch. Shared dependencies were not rebuilt. Two cold budget-discovery attempts exceeded the check's existing 120-second timeout; a manual Jest census and the unchanged budget command then completed successfully. No ceilings or test exclusions were changed.

## Required integration scenarios

`src/__tests__/integration/campaignRepairTicketLifecycle.test.ts` verifies:

- A JSON campaign save containing 300 terminal tickets loads, prunes and saves without changing damage, inventory or processedBattleIds.
- Every terminal ticket referenced by pendingBattleOutcomes or recentlyAppliedOutcomes remains, while an unreferenced terminal ticket is removed.
- Reapplying an already processed outcome after completion, save/reload and pruning creates no duplicate ticket, repeat repair or additional parts consumption.
- The complete GM ledger record reproduces the full approved campaign through JSON save/reload, including concrete repaired unit, parts inventory and intervention events.

## Mutants

Both mutants run against copies of the production modules through an external Jest mapper. Production files are never mutated during the gate runs.

| Deliberate break | Test that kills it | Result |
| --- | --- | --- |
| Omit the GM base-unit companion effect while retaining ticket completion | GM ledger replay restores units and stock identically across save and reload | Exactly 1 of 4 integration tests fails: armor stays 4 instead of 10 |
| Remove pending/recent source-reference retention | retains every terminal ticket referenced by pending or recently-applied outcomes | Exactly 1 of 4 integration tests fails: protected ticket IDs disappear |

The initial production modules passed the original four integration tests; the follow-up below extends the suite to five. Mutant module SHA-256 receipts and full command logs are retained in `E:/Projects/Personal/_scratch/sm-audit-reports/k7-evidence/`.

## Commands

Jest commands below use `C:/Users/wroll/AppData/Local/nvm/v22.22.0/node.exe node_modules/jest/bin/jest.js --runInBand --watchAll=false`.

- Full directories: `src/lib/campaign/repair/__tests__ src/lib/campaign/processors/__tests__ src/lib/interventions/__tests__ src/lib/campaign/inventory/__tests__ src/lib/campaign/readiness/__tests__ src/lib/campaign/hooks/__tests__ src/stores/campaign/__tests__ src/components/campaign/gm/__tests__ src/__tests__/integration scripts/__tests__/lint-units.test.ts`.
- Full simulation runner: `src/simulation/runner/__tests__`.
- Replay/digest/golden: `--testPathPattern='[Rr]eplay|[Dd]igest|[Gg]olden'`.
- `npm run validate:combat` with Node 22 first on PATH.
- `node node_modules/typescript7/bin/tsc --noEmit --skipLibCheck` and `node node_modules/typescript7/bin/tsc -p scripts/tsconfig.json --noEmit`.
- `npm run lint:units`, `oxlint`, `npx oxfmt --check .`, focused strict OpenSpec validation and `node scripts/ci/budget-check.mjs --report <evidence>/budget.json`.

No source anchors in the runner catalogs reference the changed files. campaignBayActions.ts, K5 salvage acceptance, K6 readiness-cache rules, K8 inventory rules, construction/BV/catalog code, schemas and wire payload shapes are unchanged.

## Hosted CI follow-up: multi-day preview cleanup

Hosted Unit Tests (1/3), job 128662379255, exposed a stale final-queue assertion in `src/lib/starmap/__tests__/starmapTravelPreview.test.ts`. The initial local gate set covered the touched owner directories but omitted this starmap caller directory. The expanded gate now includes the whole `src/lib/starmap` and `src/lib/interventions` directories.

Root's diagnosis is confirmed: a 16-hour ticket progresses on day one, completes on day two and is pruned on day three when no pending/recent outcome references it. Travel to Outreach runs beyond those days.

No production summary change is needed:

- `src/lib/starmap/starmapTravelPreview.ts:175,296` builds the completion count from accumulated `projection.events`.
- `src/pages/gameplay/campaigns/[id]/starmap.tsx:366-370` renders that event-derived progress summary, rather than counting completed tickets in the final queue.
- `src/lib/interventions/GmTimeCascadePreview.ts:213-219` accumulates every day's events and summaries. The GM preview panel uses the time effect's date/public summaries; it does not derive repair completions from the final queue. Ledger replay retains the recorded day summaries and repair events after cleanup.

The travel test now asserts the reported completion event/count, the final pruned queue, actual repaired armor and an unchanged input. The GM cascade suite keeps its two-day completion boundary case and adds a three-day completion-then-pruning case with retained events, day summaries, unit state and replay equality. The lifecycle integration suite separately advances the real day pipeline three times and proves one parts debit, retained repair results and persisted cleanup.

Follow-up base: Root merge 774a42996ed45fb4eec8a49a89d431cea456b490, containing freshly fetched origin/main 060409496864a508cd69c58aa0c510b8459f2dbb. Both were merged/confirmed again before the push. All 31 existing ledger entries are unchanged. This follow-up changes three test files and this verification record only; pruning, save formats and runtime summaries are unchanged.

| Follow-up check | Result |
| --- | --- |
| Reproduction across whole starmap/interventions directories | 1 failing test, 140 passing tests; exact hosted failure reproduced |
| Corrected starmap/interventions and lifecycle suite | 18 suites, 147 tests passed |
| Full owning directories plus whole starmap/interventions and integration | 134 suites, 1,668 tests passed; 32 existing skips |
| Full simulation runner directory | 151 suites, 1,496 tests passed |
| Replay/digest/golden before and after | 68 suites, 1,030 tests passed each; no committed fixture/digest changes |
| Combat validation | `npm run validate:combat` exited 0, including catalog/behavior, unresolved gaps and strict OpenSpec validation |
| Root and scripts TypeScript configs | Both passed through `npm run typecheck` |
| Root lint | 63 warnings, 0 errors |
| Unit lint and its Jest suite | Passed; no ceiling increases |
| Formatter | `npx oxfmt --check .` passed |
| Budget | 3,052 test files; 57 unkeyable; 92 repository-wide keys; passed |
| Both original mutants, refreshed from merged sources | Each fails exactly its designated integration test; the other four pass |

The full-directory Jest command extends the original command above with `src/lib/starmap` and uses the whole `src/lib/interventions` directory. Full logs are retained under `E:/Projects/Personal/_scratch/sm-audit-reports/k7-evidence/travel-followup/`. The PR remains a draft; Root owns the hosted CI wait and merge.
