# Tasks: extend-combat-seed-to-all-session-producers

## 1. Red tests first (the missing harness is the point)

- [x] 1.1 Author failing armor-assertion tests: encounter launch (`EncounterService.launchEncounter`) produces a session whose BattleMech units derive non-empty `armor`, `structure`, and `startingInternalStructure` in `currentState.units` (assert a real per-location value, not just non-empty) — landed as the "combat-seeds launched units" test in `EncounterService.test-helpers.ts` (asserts seeded units at the `createGameSession` boundary; the suite mocks session derivation) plus derived-state assertions in `src/engine/__tests__/combatSeedDerivation.test.ts`
- [x] 1.2 Author failing armor-assertion tests for `buildGameSessionFromLobbyState` (lobby/hot-seat) and `buildFromSkirmishConfig` (pre-battle builder) with the same per-location assertions — lobby covered by `buildSeededGameSessionFromLobbyState` derived-state test; pre-battle resolved as SCAFFOLD-ONLY per 2.3 (its session's derived state is never played; the production skirmish session is the covered `InteractiveSession` path)
- [x] 1.3 Author the P2P mirror-inheritance test: a seeded host session mirrored via `createMirrorSession` yields identical seeded values on the guest twin

## 2. Producer wiring

- [x] 2.1 `EncounterService.launchEncounter`: derive adapted units and route through `gameUnitsWithAdaptedCombatSeeds` before `createGameSession` — implemented via the new engine-side `deriveCombatSeededGameUnits` (`src/engine/combatSeedDerivation.ts`; engine placement avoids a `utils/gameplay` → engine import cycle). `launchEncounter` became async; ripple absorbed through `launchCampaignEncounter`, `launchCoopMission`, the mission-launch page handler, and the API route
- [x] 2.2 `lobbySessionBuilder`: split into pure `buildLobbyGameData` + composing builder; production lobby launches route through the engine's `buildSeededGameSessionFromLobbyState` (seeded-first with unseeded fallback so a catalog hiccup never blocks a committed match); raw builder documented as unseeded
- [x] 2.3 `preBattleSessionBuilder`: runtime-confirmed scaffold-only — `usePreBattleSkirmish.createInteractiveSkirmishSession` consumes only its unit metadata and builds the real session through the covered `InteractiveSession` constructor. Documented on `buildFromSkirmishConfig` with a pointer to the derivation module for any future consumer that needs a playable session
- [x] 2.4 Verify the synthetic-fixture exemption still holds: bare `IGameUnit` fixtures without construction inputs keep the legacy empty-map behavior (initialization + gameState suites green)

## 3. Verification battery

- [x] 3.1 Full suites for touched areas: encounter, campaign encounter/coop, lobby, pre-battle, p2p, engine (56 suites / 828 tests) + gameState, stores, multiplayer, pages-modules (105 suites / 1196 tests) — all green; typecheck clean
- [x] 3.2 Sweep for battle-length/outcome-sensitive tests on the newly seeded paths — none required widening (the encounter suite mocks session derivation; lobby/pre-battle paths run no auto-battles in tests)
- [x] 3.3 `openspec validate --strict --all` 216/216; `qc:command-evidence` capture+validate 6/6
