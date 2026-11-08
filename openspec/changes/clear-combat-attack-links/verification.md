# C9 verification

## Baseline and refactor

Base: `05257e185c87aaa1d4141b58d7c69b59ab0c6e46` (includes #3045).
Node 22.22.0 matches the existing SQLite native module. The initial Node 24
attempt failed with a native ABI mismatch; no dependency was rebuilt.

- Before executable edits: replay/schema-pack/checkpoint/journal, command golden
  digest, P2P RNG replay and engine/simulation determinism: **55 suites, 989
  tests passed** (`baseline-node22.json`). No fixtures changed.
- Original release characterization: **3 tests passed** before extraction
  (`refactor-before.log`), including exact key shapes and preserved source data.
- After extraction: complete `src/utils/gameplay` and `src/simulation/runner`:
  **446 suites, 8,272 tests passed** (`refactor-directories.json`).
- Complete `src/__tests__/integration`: **52 suites, 627 passed, 32 skipped**
  (`refactor-integration.json`).
- Both TypeScript configs passed; root lint: **63 warnings, zero errors**.
- Budget census: **57 unkeyable**, 94 repository-wide keys against limit 93;
  the original main sources also classify 94 tests as repository-wide
  (`baseline-repowide.json`). C9 adds no unkeyable or repository-wide test.
  No ceiling increased. This remains a failing baseline gate.

Raw local logs/JSON: `E:/Projects/Personal/_scratch/sm-audit-reports/c9-lane/`.
These are supporting output, not ledger entries. The change ledger is only
`openspec/changes/clear-combat-attack-links/.ledger.json`.

Refactor commit: `7c9eea5b7`.

## Fix evidence before the C10 dependency lands

- Valid test-first red run: **35 failed, 21 passed** across the reducer, runner,
  session and P2P test files (`c9-red-valid.json`). Both TypeScript configs pass
  with these test inputs. The failures precede the cleanup implementation.
- Full changed directories (`src/utils/gameplay`, `src/simulation/runner`,
  `src/engine`, `src/__tests__/integration`): **536 suites passed, 1 failed;
  9,508 tests passed, 32 skipped, 1 failed** (`full-pre-c10.json`). The sole
  failure is `C9 runner commits clears at the heat unit commit without changing
  heat or shutdown`, deliberately pending the held C10 overlap edit.
- The complete-engine test starts with displacement links, produces real exits
  through `runToCompletion`, asserts no surviving reference to an off-field
  unit and compares live state with its replay fold.
- Post-fix replay/schema-pack/checkpoint/journal, golden command digest, P2P RNG
  replay and engine/simulation determinism: **55 suites, 989 passed**
  (`post-fix-replay.json`). No previously committed replay, digest, golden or
  snapshot fixture changed. `attackLinks.fixtures.ts` is a new test builder,
  not a changed historical replay or golden fixture.
- `npm run validate:combat`: **79 suites, 2,107 tests passed**; gap inventories
  and strict canonical combat spec validation passed (`combat-pre-c10.log`).
- Both TypeScript configs passed. Root lint: **63 warnings, zero errors**.
- `lint:units`: **17,082 findings / 17,085 ceiling**, all path gates passed;
  its Jest suite: **33 passed**. No ceiling changed.
- Root `format:check` passed. Change-local strict OpenSpec passed; full strict
  OpenSpec: **257 passed, zero failed**. OpenSpec CI accounting: **36/36**.
- Final independent budget census: **57/57 unkeyable**, **94/93 repository-wide**
  (same pre-existing repository-wide overage; `c9-budget.json`).

### Mutants

Each deliberate break ran separately, failed, and was restored. Complete killed
test names are recorded in `mutants.json` beside the raw Jest reports.

| Mutant | Killing test | Failures |
| --- | --- | --- |
| Skip inbound participants | `C9 destroyed exit clears inbound-only references while preserving unrelated outgoing links` (also ejected/retreated variants) | 3 |
| Skip destroyed cleanup | `C9 destroyed exit releases both grapple participants when a exits` | 8 |
| Skip ejected cleanup | `C9 ejected exit releases both grapple participants when a exits` | 8 |
| Skip retreated cleanup | `C9 retreated exit releases both grapple participants when a exits` | 8 |

## Pending work and continuation

At the last read, #3039 is an open, blocked draft. Per Root's instruction,
`postCombatHeatLifecycle.ts` and combat catalog files remain untouched by C9.
This draft is incomplete and must remain a draft.

1. After #3039 merges, fetch and **merge** `origin/main` (never force-rebase).
2. At `commitHeatPhaseUnit`, call `clearAttackLinks` on the committed state
   before returning the critical-PSR result. Preserve C10 startup/shutdown code.
3. Re-anchor every affected `Combat*Source*` citation and
   `CombatSourceRefAnchorRemap.ts` value by matching the cited source content,
   including shifted reducer, runner and session-test ranges. Update the direct
   ejection URL expectation in `combatEventCatalog.contract.test.ts` if changed.
4. Re-run all directories, replay/digest/golden, combat validation and static
   gates on that final tree. Stop on any historical fixture change.
5. Resolve the baseline repository-wide cache gate through the owning lane;
   C9 must not raise its ceiling or add an unkeyable test.

## Pipeline-health evidence

- **CI at merge:** NOT-RUN — no merge authorized or performed; this is a draft.
- **Post-merge validation:** NOT-RUN — no merge performed.
- **Error-log baseline (scope: local C9 validation):** one held heat-commit test
  failure and one pre-existing repository-wide cache-budget violation — FAIL.

## Entry paths

| Entry | Exit boundary |
| --- | --- |
| Reducer/replay | eventDispatch -> damageResolution or unitExitState; deriveState repeats the fold |
| Interactive session | movement/attack/physical/heat/withdraw/eject -> appendEvent -> reducer |
| Complete GameEngine | movement/retreat, ranged, physical and heat phases -> session/reducer |
| runToCompletion consumers | QuickResolveService, useQuickGameStore.actions, usePreBattleLaunch, fastForwardCombatRunner |
| AI | InteractiveSession.ai and GameEngine phase bots use the same session events |
| Multiplayer | ServerMatchHostEngineDispatch -> InteractiveSession; journal authority persists canonical events; recovery derives state |
| P2P fallback/store eject | translated or directly appended canonical exit events -> reducer |
| Standalone runner | SimulationRunnerState damage commit; ammo-pilot, physical, PSR and heat unit commits |

## Stop conditions

Any changed committed replay, digest or golden fixture stops this lane. Do not
regenerate. Hold heat lifecycle/catalog overlap until #3039 merges, then merge
origin/main and re-anchor citations by content. Never merge the draft PR.
