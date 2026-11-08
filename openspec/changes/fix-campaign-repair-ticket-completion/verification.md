# K7 verification

Base: origin/main 1f3ada8888d9f99a06e4ba0ed3478a9810f848c3. Extraction commit: c3e0b744d5a21a04f87a6994680670f7dd84cf60. One draft PR; Root owns merge.

## Evidence

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

Normal final production modules pass all four integration tests. Mutant module SHA-256 receipts and full command logs are retained in `E:/Projects/Personal/_scratch/sm-audit-reports/k7-evidence/`.

## Commands

Jest commands below use `C:/Users/wroll/AppData/Local/nvm/v22.22.0/node.exe node_modules/jest/bin/jest.js --runInBand --watchAll=false`.

- Full directories: `src/lib/campaign/repair/__tests__ src/lib/campaign/processors/__tests__ src/lib/interventions/__tests__ src/lib/campaign/inventory/__tests__ src/lib/campaign/readiness/__tests__ src/lib/campaign/hooks/__tests__ src/stores/campaign/__tests__ src/components/campaign/gm/__tests__ src/__tests__/integration scripts/__tests__/lint-units.test.ts`.
- Full simulation runner: `src/simulation/runner/__tests__`.
- Replay/digest/golden: `--testPathPattern='[Rr]eplay|[Dd]igest|[Gg]olden'`.
- `npm run validate:combat` with Node 22 first on PATH.
- `node node_modules/typescript7/bin/tsc --noEmit --skipLibCheck` and `node node_modules/typescript7/bin/tsc -p scripts/tsconfig.json --noEmit`.
- `npm run lint:units`, `oxlint`, `npx oxfmt --check .`, focused strict OpenSpec validation and `node scripts/ci/budget-check.mjs --report <evidence>/budget.json`.

No source anchors in the runner catalogs reference the changed files. campaignBayActions.ts, K5 salvage acceptance, K6 readiness-cache rules, K8 inventory rules, construction/BV/catalog code, schemas and wire payload shapes are unchanged.
