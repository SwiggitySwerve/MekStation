# Tasks: extend-combat-seed-to-all-session-producers

## 1. Red tests first (the missing harness is the point)

- [ ] 1.1 Author failing armor-assertion tests: encounter launch (`EncounterService.launchEncounter`) produces a session whose BattleMech units derive non-empty `armor`, `structure`, and `startingInternalStructure` in `currentState.units` (assert a real per-location value, not just non-empty)
- [ ] 1.2 Author failing armor-assertion tests for `buildGameSessionFromLobbyState` (lobby/hot-seat) and `buildFromSkirmishConfig` (pre-battle builder) with the same per-location assertions
- [ ] 1.3 Author the P2P mirror-inheritance test: a seeded host session mirrored via `createMirrorSession` yields identical seeded values on the guest twin

## 2. Producer wiring

- [ ] 2.1 `EncounterService.launchEncounter`: derive adapted units for the encounter's forces and route through `gameUnitsWithAdaptedCombatSeeds` before `createGameSession` (mirror the `GameEngine.runToCompletion` inline pattern at `GameEngine.ts:110-116`); confirm 1.1 goes green
- [ ] 2.2 `lobbySessionBuilder`: same splice before `createGameSession`; confirm 1.2 (lobby) green
- [ ] 2.3 `preBattleSessionBuilder`: same splice; first confirm at runtime which callers consume this builder's session (council flagged it may feed only BV-preview helpers — if provably preview-only, document that and seed anyway for uniformity); confirm 1.2 (pre-battle) green
- [ ] 2.4 Verify the synthetic-fixture exemption still holds: bare `IGameUnit` fixtures without construction inputs keep the legacy empty-map behavior (existing initialization tests stay green)

## 3. Verification battery

- [ ] 3.1 Full suites for touched areas: `src/services/encounter`, `src/utils/gameplay`, `src/lib/p2p`, `src/engine`
- [ ] 3.2 Sweep for battle-length/outcome-sensitive tests on the newly seeded paths; widen any legitimately affected perf/outcome budgets 3× with a cause-naming comment (pattern from #998)
- [ ] 3.3 `openspec validate --strict`; evidence capture (`npm run qc:command-evidence`) for regressions on command screens
