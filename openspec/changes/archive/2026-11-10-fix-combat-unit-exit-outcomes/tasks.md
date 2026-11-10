## 1. PR 1: unit operability and exit latches

- [x] Characterization tests pin all seven operability call sites; they pass
      before and after the refactor.
- [x] Add `getUnitOperability` and route the seven predicates through it.
- [x] Kill the `canAct`-without-shutdown mutant.
- [x] Record failing exit-latch tests (reducer, P2P eject/withdraw,
      `declarePlayerWithdrawal`).
- [x] Latch exits once and keep the first retreat edge.
- [x] Kill the withdrawal-edge and retreat-destroyed-guard mutants.
- [x] Victory page lists retreated and ejected units.
- [x] Re-anchor runner source-ref citations by content.
- [x] Replay, checkpoint, digest and golden suites unchanged before and after.

## 2. PR 2: combat outcome

- [x] Record failing outcome, legacy-reader, salvage, co-op, `combatReady`,
      casualty-panel and producer tests.
- [x] Additive `IUnitCombatDelta.exitReason`, omitted when the unit did not exit.
- [x] KIA only for lethal wounds or a pilot-killing destruction, never once ejected.
- [x] Salvage and co-op salvage share one eligibility helper: retreated
      enemies excluded, ejected enemies included.
- [x] Ejected player unit loses `combatReady` when the player did not win.
- [x] Legacy reader: `exitReason`, then `report.log`, then null.
- [x] Interactive and multiplayer producers carry the field; fast-forward and
      pre-battle auto-resolve share `deriveCombatOutcome`.
- [x] Kill the KIA, salvage and legacy-fallback mutants.
- [x] Replay, checkpoint, digest and golden suites unchanged before and after.
