# Tasks

## 1. Authoring

- [x] 1.1 Author proposal.md
- [x] 1.2 Author simulation-system spec delta (Runner Emits GameCreated as Seed Event — 3 scenarios)
- [x] 1.3 `npx openspec validate emit-game-created-from-runner --strict` clean

## 2. synthesizeGameUnits helper

- [x] 2.1 Add `synthesizeGameUnits(config, hydration?)` in `src/simulation/runner/SimulationRunnerState.ts`
- [x] 2.2 Hydrated path: pull `name = "${chassis} ${model}"`, `unitRef = fullUnit.unitRef`, `gunnery` and `piloting` from `IHydratedUnitData`
- [x] 2.3 Synthetic path: `name = id`, `unitRef = id`, `pilotRef = "synthetic-pilot-${id}"`, skills fall back to `DEFAULT_GUNNERY` / `DEFAULT_PILOTING`

## 3. Emit GameCreated in runner

- [x] 3.1 In `SimulationRunner.run()`, after `createInitialState(config, hydration)`, call `synthesizeGameUnits(config, this.hydration)`
- [x] 3.2 Push a `GameCreated` event via `createGameEvent` with `turn: 0`, `phase: GamePhase.Initiative`, payload built from synthesized units + config
- [x] 3.3 Sequence-numbering verified: `events.length` is 0 at this point so the seed event lands at sequence 0; subsequent emissions stay monotonic

## 4. Tests

- [x] 4.1 `src/simulation/runner/__tests__/SimulationRunner.gameCreated.test.ts` — 12 tests covering all 3 spec scenarios + idempotence + monotonicity invariants + synthetic-fallback path
- [x] 4.2 Audit existing runner tests for `events[0]` assertions: only `simulationRunner.test.ts:884` ("should generate events with valid turn numbers") needed adjustment — added a skip for `GameEventType.GameCreated` (turn 0)
- [x] 4.3 `npm test src/simulation` clean (1177 tests pass; 12 new seed-event tests included)

## 5. Verification

- [x] 5.1 `npm run typecheck` clean
- [x] 5.2 `npm run lint` clean (42 pre-existing warnings, 0 errors)
- [x] 5.3 `npm test` full suite green (23505/23505 tests across 930 suites; no regressions)
- [x] 5.4 Smoke run: 12 dedicated tests assert `result.events[0].type === GameEventType.GameCreated` end-to-end through the real `SimulationRunner.run()` call path (no separate CLI smoke needed; the test path invokes the same runner method)
- [x] 5.5 `npx openspec validate emit-game-created-from-runner --strict` clean

## 6. PR

- [ ] 6.1 Commit on branch `sim-runner/emit-game-created`
- [ ] 6.2 Open PR against `main` titled `feat(sim-runner): emit GameCreated as seed event so persisted NDJSON includes the unit roster`
- [ ] 6.3 Wait for CI green
- [ ] 6.4 Merge with `--squash --delete-branch`

## 7. Archive

- [ ] 7.1 After merge, run `npx openspec archive emit-game-created-from-runner --yes`
- [ ] 7.2 Open archive PR; merge
