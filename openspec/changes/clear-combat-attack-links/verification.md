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
  investigate and record baseline before final gate. No ceiling increased.

Raw local logs/JSON: `E:/Projects/Personal/_scratch/sm-audit-reports/c9-lane/`.
These are supporting output, not ledger entries. The change ledger is only
`openspec/changes/clear-combat-attack-links/.ledger.json`.

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
