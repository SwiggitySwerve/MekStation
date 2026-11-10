## Implementation

- [x] Record the failing tests first (10 red): ROUTED generates nothing; every non-routed level draws from the STALEMATE table row; `selectScenarioType` takes no morale level; the rewritten offset pins.
- [x] Skip ROUTED contracts in scenario generation, citing the pin.
- [x] Remove the morale modifier (`calculateBattleTypeMod`, the morale argument), keep the fixed offset of 1.
- [x] Delete the unreferenced `getMoraleDisplayInfo` and its tests.
- [x] Kill the mutants (6): skip removed, skip also at CRITICAL, skip ends the whole pass, offset 0, offset 2, old formula restored.
- [x] Run whole-directory gates, both TypeScript configs, lint, unit lint and suite, oxfmt and the budget check. (Lint 62 warnings, ceiling 63; `lint:units` src-tests 16,968 of 16,969; budget 57 unkeyable, unchanged; types, stores, lib campaign, scenario packs/replay, API and integration green.)
- [x] Run the fast-forward, live-parity, golden and scenario-pack suites before and after; any movement is a STOP. (Identical; processors 348 to 364 is the 16 tests added. Whole serialized fast-forward campaigns compared path by path, base against this change, noise removed: 0 paths moved.)

## Follow-up outside this change

- [ ] The ROUTED lifecycle (early end, payout, rout end date, re-spike), held with the payout packets.
- [ ] The pin's reinforcement-scenario odds modifiers (`StratConRulesManager.java:4499-4506`): no reinforcement model to apply them to.
- [x] The "Contract Morale Tracking" requirement in combat-resolution still describes the removed player-perspective `updateMorale`; M2 replaces it with the monthly check. Resolved by #3298's REMOVED delta, merge `2adcc8973213a7a667b969537c137dbca8d57584`.
