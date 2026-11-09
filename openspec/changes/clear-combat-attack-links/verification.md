# C9 verification

## Current result after C10

C9 implementation is complete. PR #3052 remains a draft pending hosted checks
and Root review. Main was merged at `0217646cc` (C10), then again at
`447803027` (P2P retry). Both merges completed without conflicts; no rebase or
force-push was used. The existing refactor-first commit order is preserved.

The held `commitHeatPhaseUnit` integration now calls `clearAttackLinks` before
returning critical-PSR updates. C10 startup/shutdown behavior remains intact.
The held heat test failed before this edit and all six runner C9 tests passed
afterward (`resume-heat-red.json`, `resume-heat-green.json`).

| Gate | Result | Evidence |
| --- | --- | --- |
| Full gameplay, runner, engine, integration and replay/digest/golden set on merged main | 593 suites, 10,540 passed, 32 skipped, zero failures | `final-all.json` |
| Replay/digest/golden before the held edit | 55 suites, 989 passed | `resume-before.json` |
| Replay/digest/golden after the edit, including final merged main | 55 suites, 989 passed; final subset also 55/989 | `resume-after.json`, `final-all.json` |
| Combat validation | 79 suites, 2,107 passed; gap inventory and strict spec checks passed | `final-combat.log` |
| Both TypeScript configs | PASS | `final-typecheck.log` |
| Root lint | PASS: 63 warnings, zero errors | `final-lint.log` |
| lint:units and its complete Jest suite | PASS; 33 Jest tests passed; no ceilings changed | `final-lint-units.log`, `final-lint-units-tests.log` |
| oxfmt / root format check | PASS | `final-format.log` |
| Cache budget | PASS: 57/57 unkeyable, 92/93 repository-wide | `final-budget.json` |
| Strict OpenSpec | 262 items passed | `final-openspec.log` |

No previously committed replay, digest, golden or snapshot fixture changed.
The earlier repository-wide budget overage is resolved by the merged main;
C9 changed no ceiling.

The content audit re-anchored 37 citations across 19 catalog/contract files.
[The source anchor record](source-anchors.md) lists each range and its source
content. Prior dispatch citations pointing at neighboring events were corrected
by the named handler. `CombatSourceRefAnchorRemap.ts` has no targets affected by
C9, so its merged C10 content remains unchanged.

A separate run reproduced the known K6/K13 failure in
`CampaignDashboardPage.advanceButtons.test.tsx`: all four cases throw
`Cannot read properties of undefined (reading 'map')` at
`CampaignDashboardPage.tsx:167`. This is outside the C9 directories and remains
untouched as Root directed (`resume-known-dashboard.json`). No repository-wide
all-green claim is made.

## Earlier baseline and refactor

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
  No ceiling increased. This was a failing baseline gate before the latest main merge.

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

## C10 hold resolved

The initial draft deliberately left the heat commit and catalogs untouched
while #3039 was open. Root resumed the lane after that PR merged. Heat cleanup,
content-based citation updates, full directory verification and the cache gate
are now complete. The initial red runs above remain as test-first evidence.
Only hosted checks/review and the separately owned dashboard failure remain.

## Pipeline-health evidence

- **CI at merge:** NOT-RUN — no merge authorized or performed; this is a draft.
- **Post-merge validation:** NOT-RUN — no merge performed.
- **Error-log baseline (scope: required local C9 validation):** zero failures -
  PASS. The separate known campaign dashboard run has four failing cases - FAIL;
  no campaign fix is included.

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
regenerate. C10 overlap has been reconciled after merging #3039. Merge any
required future main updates by content. Never merge the draft PR.
