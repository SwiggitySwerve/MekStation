# Tasks: Add Encounter Swarm Harness

## 1. Phase 1 — Honor Real Pilot Skills in Simulation [BLOCKING]

- [x] 1.1 Audit `IUnitGameState` in `src/types/gameplay/GameSessionInterfaces.ts` (~line 1207) — confirm `gunnery` and `piloting` fields exist on the type. If absent, widen the interface and seed defaults.
  <!-- EVIDENCE: gunnery?: number and piloting?: number confirmed present on IUnitGameState. No changes needed. -->
- [x] 1.2 Audit `createInitialState()` in `src/simulation/runner/SimulationRunnerState.ts` — confirm pilot skills propagate from `IGameUnit` → `IUnitGameState`. If they don't, propagate them.
  <!-- EVIDENCE: createInitialUnitState() in src/utils/gameplay/gameState/initialization.ts seeds gunnery: unit.gunnery and piloting: unit.piloting from IGameUnit. Confirmed propagated. -->
- [x] 1.3 Audit `createMinimalUnitState()` in `src/simulation/runner/SimulationRunnerSupport.ts` — confirm it accepts and seeds pilot skills (or accepts a partial that may carry them).
  <!-- EVIDENCE: createMinimalUnitState() does NOT set gunnery/piloting (by design — synthetic units). toAIUnitState() uses unit.gunnery ?? DEFAULT_GUNNERY as fallback. No change needed to createMinimalUnitState(). -->
- [x] 1.4 Replace `gunnery: DEFAULT_GUNNERY` at `src/simulation/runner/SimulationRunnerSupport.ts:134` with `gunnery: unit.gunnery ?? DEFAULT_GUNNERY`. Apply same pattern to any `piloting` read.
  <!-- EVIDENCE: Fixed in toAIUnitState() at SimulationRunnerSupport.ts. Also fixed weaponAttack.ts IAttackerState construction (was hardcoded DEFAULT_GUNNERY; now unit.gunnery ?? DEFAULT_GUNNERY) — this seam is what actually drives hit probability in the combat resolver. -->
- [x] 1.5 Audit `src/simulation/ai/AttackAI.ts` for any hardcoded `DEFAULT_GUNNERY` / `DEFAULT_PILOTING` reads or fixed-skill assumptions outside `toAIUnitState`.
  <!-- EVIDENCE: AttackAI.ts uses attacker.gunnery directly from IAIUnitState (no hardcoded defaults). scoreTarget formula: killProbability = clamp01(1 - (attacker.gunnery + rangeMod) / 12). Clean. -->
- [x] 1.6 Audit `src/simulation/ai/MoveAI.ts` for the same pattern.
  <!-- EVIDENCE: MoveAI.ts does not reference gunnery or piloting directly. Movement decisions are based on position/heat/range. Clean. -->
- [x] 1.7 Audit `src/simulation/ai/RetreatAI.ts` for the same pattern.
  <!-- EVIDENCE: RetreatAI.ts does not reference gunnery or piloting. Retreat is driven by HP fraction and retreat triggers. Clean. -->
- [x] 1.8 Add unit test: same map, same seed, gunnery 2 vs gunnery 5 produces measurably different `AttackAI.scoreThreat` outputs (assert delta exceeds noise floor).
  <!-- EVIDENCE: src/simulation/__tests__/swarm-pilot-skills.test.ts — 5 tests all pass. Delta = 0.3125 (>> 0.25 threshold). score2 ≈ 1.042, score5 ≈ 0.729 at distance=2, threat=1.25. -->
- [x] 1.9 Add integration test: 100 batches with gunnery-2 attacker vs gunnery-5 attacker on identical map/units — assert non-zero variance in average kill turn and total damage dealt vs the symmetric-skill baseline.
  <!-- EVIDENCE: src/simulation/__tests__/swarm-pilot-skills-batch.test.ts — 4 tests all pass. Asymmetric win-rate delta ≥ 10pp confirmed. BATTLE_TURN_CAP=100 (test-only; production MAX_TURNS=10 unchanged). -->
- [x] 1.10 Verify `src/simulation/__tests__/integration.test.ts` (existing 100-game batch test) continues to pass with synthetic-unit fallback to defaults.
  <!-- EVIDENCE: Full test suite run: 22,965/22,965 tests pass including integration.test.ts. Synthetic-unit fallback (unit.gunnery ?? DEFAULT_GUNNERY) preserves pre-existing behavior. -->

## 2. Phase 2 — Node-Side Catalog Loader

- [x] 2.1 Create `src/services/units/NodeCanonicalUnitService.ts` exposing the same `ICanonicalUnitService` shape as the fetch-based service.
  <!-- EVIDENCE: src/services/units/NodeCanonicalUnitService.ts — NodeCanonicalUnitService class implements ICanonicalUnitService with getIndex, getById, getByIds, query, clearCache. -->
- [x] 2.2 Implement `loadIndex()` using `fs.readFileSync(path.resolve(process.cwd(), 'public/data/units/battlemechs/index.json'), 'utf-8')` — pattern-match `scripts/validate-bv.ts:4648`.
  <!-- EVIDENCE: NodeCanonicalUnitService.ts:199 — fs.readFileSync(this.indexFilePath, 'utf-8') inside loadRawIndex(); pattern lifted from validate-bv.ts:4648. -->
- [x] 2.3 Implement `getById(unitId)` that resolves the index entry's `path` field and reads the unit JSON via `fs.readFileSync(path.resolve('public/data/units/battlemechs/', entry.path), 'utf-8')` — pattern-match `scripts/validate-bv.ts:5193`.
  <!-- EVIDENCE: NodeCanonicalUnitService.ts:258 — path.join(this.baseDir, entry.path) → fs.readFileSync(unitFilePath, 'utf-8'); pattern matches validate-bv.ts:5193. -->
- [x] 2.4 Cache parsed unit JSONs in an internal `Map<unitId, IFullUnit>` to avoid repeated disk reads in batch loops.
  <!-- EVIDENCE: NodeCanonicalUnitService.ts:166 — private readonly unitCache: Map<string, IFullUnit> = new Map(); checked on line 243, populated on line 264. -->
- [x] 2.5 Wire selection between fetch and fs services via env flag `NODE_CATALOG_LOADER=fs` OR a separate Node entry point that injects the fs service explicitly. Do NOT replace the global singleton.
  <!-- EVIDENCE: NodeCanonicalUnitService.ts:337 — getNodeCanonicalUnitService() is a separate standalone factory. getCanonicalUnitService() in CanonicalUnitService.ts is untouched. Option A per design D2. -->
- [x] 2.6 Verify `CompendiumAdapter.adaptUnitFromData(fullUnit, options)` runs in bare `tsx` without browser-only deps. If browser modules surface, factor a pure-Node loader path adjacent to `adaptUnitFromData`; do NOT refactor `CompendiumAdapter`.
  <!-- EVIDENCE: Verified via npx tsx — adaptUnitFromData exported clean with no browser-only deps. Test "adaptUnitFromData runs on a Node-loaded IFullUnit without error" passes (Task 2.7 Test 3). -->
- [x] 2.7 Add integration test: `tsx -e` script loads `public/data/units/battlemechs/index.json`, sample-loads 50 random units, asserts ≥4,000 index entries and 50/50 successful unit JSON parses with `bv` and `tonnage` fields present.
  <!-- EVIDENCE: src/services/units/__tests__/NodeCanonicalUnitService.test.ts — 3 tests in Task 2.7 describe block all pass: ≥4225 index entries, 50/50 sample units with tonnage, adaptUnitFromData end-to-end spot-check. bv is optional on catalog units (not present in raw files); assertions reflect real data shape. -->
- [x] 2.8 Add unit test: `NodeCanonicalUnitService` cache returns the same `IFullUnit` reference across two `getById(sameId)` calls.
  <!-- EVIDENCE: src/services/units/__tests__/NodeCanonicalUnitService.test.ts — Task 2.8 describe block: expect(first).toBe(second) strict reference equality, index cache reference stability, and clearCache() fresh-read test all pass. -->

## 3. Phase 3 — `IAIPlayer` Interface Extraction

- [ ] 3.1 Create `src/simulation/ai/IAIPlayer.ts` with the four-method interface: `evaluateRetreat`, `playMovementPhase`, `playAttackPhase`, `playPhysicalAttackPhase`. Method signatures typed in terms of `IGameSession` / `IAIUnitState` / `IHexGrid`; outputs are `IRetreatEvent` / `IMovementEvent` / `IAttackEvent` (or `null` / array thereof).
- [ ] 3.2 `BotPlayer` `implements IAIPlayer` — declare conformance, no behavior change. Verify all four methods have signatures compatible with the interface.
- [ ] 3.3 Update `BotPlayer` constructor to accept an optional `IBotBehavior` parameter (default = the existing `DEFAULT_BEHAVIOR`).
- [ ] 3.4 Modify `src/simulation/runner/SimulationRunner.ts` constructor to accept an optional `aiPlayerFactory: (random: SeededRandom, behavior: IBotBehavior) => IAIPlayer` parameter with a default factory that returns `new BotPlayer(random, behavior)`.
- [ ] 3.5 Modify the body of `SimulationRunner.run()` (or wherever `BotPlayer` is currently constructed at line 61) to use the injected factory instead of `new BotPlayer(this.random)` directly.
- [ ] 3.6 Create `src/simulation/ai/behaviorVariants.ts` with the `BEHAVIOR_VARIANTS` registry per design D4: `default`, `aggressive`, `defensive`, `skirmisher`. Each entry SHALL be an `IBotBehavior` literal.
- [ ] 3.7 Export a `getBehaviorVariant(name: AIVariantName): IBotBehavior` lookup function with explicit error on unknown name.
- [ ] 3.8 Create `src/simulation/ai/StandStillAIPlayer.ts` — a stub `IAIPlayer` implementation that returns `null` from movement and physical attack phases, empty array from attack phase, and `null` from retreat evaluation. Used in tests to prove injection works.
- [ ] 3.9 Add unit test: existing `SimulationRunner` test suite passes unchanged with `BotPlayer` injected through the new factory path (functional equivalence).
- [ ] 3.10 Add unit test: `aggressive` vs `defensive` variant on same seed/map/units produces different battle traces — assert distinct `retreatTurn` OR distinct `firstShotTurn` OR distinct turn count.
- [ ] 3.11 Add unit test: `StandStillAIPlayer` injection — units never move (asserting AI is genuinely pluggable). Run 5 turns, assert all units' positions unchanged.

## 4. Phase 4 — Random Force + Pilot Generators

- [ ] 4.1 Create `src/services/encounter/randomForceGenerator.ts` exporting `generateRandomForce(opts: IRandomForceOptions): IForce`.
- [ ] 4.2 Implement candidate filtering — accept BV / tonnage / era / tech-base filters and return a filtered `IUnitIndexEntry[]` from the catalog.
- [ ] 4.3 Implement greedy fill via `WeightedTable` weighted by inverse-BV; pick units one at a time until force size reached or ±5% tolerance achieved (whichever first).
- [ ] 4.4 Implement duplicate-chassis cap (`Math.ceil(count / 4)` default); when cap reached, exclude that chassis from candidate set for remainder of force assembly.
- [ ] 4.5 Throw `BudgetUnsatisfiableError` (with achievable-BV-range payload) when greedy cannot satisfy budget within tolerance — do NOT retry-loop.
- [ ] 4.6 Build `IForce.assignments[]` shape with `unitId` per entry; pilot binding deferred to step 4.10.
- [ ] 4.7 Create `src/services/encounter/randomPilotGenerator.ts` exporting `generateRandomPilots(opts: IRandomPilotOptions): readonly IPilot[]`.
- [ ] 4.8 Implement vault-sample strategy — sample N pilots from `opts.vault` without replacement; if N > vault size, sample with replacement and stamp `metadata.sampledWithReplacement: true`.
- [ ] 4.9 Implement template-synthesis strategy — synthesize N `IPilot` instances with `skills.gunnery` / `skills.piloting` drawn uniformly from `IPilotSkillTemplate.gunneryRange` / `pilotingRange`. Synthesized pilots get fresh UUIDs and are NOT persisted to `usePilotStore`.
- [ ] 4.10 Wire pilot binding — for each `IForce.assignments[i]`, set `pilotId = pilots[i].id` (1:1 pairing, sequential).
- [ ] 4.11 Extend `ISimulationRunResult` schema to add `schemaVersion: 1 | 2` field; existing results default to `1`. New `participants` payload defined per design D7. New file or modification at the canonical type location (likely `src/simulation/runner/types.ts` or similar — verify during implementation).
- [ ] 4.12 Plumb `participants` payload through `BatchRunner.runBatch` — read from the encounter setup at run-start, pass into `ISimulationRunResult`.
- [ ] 4.13 Verify `src/services/encounter/encounterToGameSession.ts:buildGameUnitsForForce` is reused unchanged — random-generated `IForce` + `IPilot[]` flow through it identically to user-built encounters.
- [ ] 4.14 Property test (1,000 generated forces): BV ±5% of budget, no chassis exceeds duplicate cap, all assignments have valid `unitId` + `pilotId`.
- [ ] 4.15 Property test (1,000 generated pilots, template strategy): all gunnery values within template range, all piloting values within template range, all pilot IDs unique within a run.
- [ ] 4.16 Determinism test: same seed produces byte-identical force JSON across two invocations.

## 5. Phase 5 — CLI Swarm Runner

- [ ] 5.1 Define swarm config JSON schema (Zod-validated). Required keys: `runs`, `seed`, `mapRadius`, `sideA`, `sideB`. Each side carries: `bvBudget`, `unitCount`, `aiVariant`, `pilotStrategy`, optional `tonnageMin`/`tonnageMax`/`era`/`techBase`.
- [ ] 5.2 Extend `scripts/run-simulation.ts` to accept `--config <path>` as primary input and parse the JSON.
- [ ] 5.3 Add override flags: `--runs`, `--seed`, `--bv-budget`, `--era`, `--tech-base`, `--ai-side-a`, `--ai-side-b`, `--pilots`, `--map-radius`, `--terrain-biome`, `--output`. Each flag overrides the corresponding config key when both are present.
- [ ] 5.4 Wire Phase 1 (real pilot skills) — `BatchRunner` consumes `participants`-aware `ISimulationRunResult`.
- [ ] 5.5 Wire Phase 2 (`NodeCanonicalUnitService`) — set when `process.env.NODE_CATALOG_LOADER === 'fs'` or when invoked via the CLI entry point.
- [ ] 5.6 Wire Phase 3 (`aiPlayerFactory`) — construct factory from `--ai-side-a` / `--ai-side-b` variant lookup; pass to `SimulationRunner`. Note: per-side AI requires `BatchRunner` or `SimulationRunner` to know which `IAIPlayer` to invoke per `GameSide`. If per-side AI isn't natively supported by current `BatchRunner`, extend the runner contract to accept `aiPlayerFactoryBySide?: { A: AIPlayerFactory; B: AIPlayerFactory }`.
- [ ] 5.7 Wire Phase 4 (random force + pilot generators) — invoke per-side per-run with seed `baseSeed + i`.
- [ ] 5.8 Sequential `for` loop only — do NOT add `worker_threads`. Guard against future regression with a comment + lint rule.
- [ ] 5.9 Output JSON writer — write `ISimulationRunResult[]` array to `--output <path>` (default `./swarm-output.json`).
- [ ] 5.10 Commit example config at `scripts/swarm-configs/duel-3kbv-temperate.json` — 100 runs, 3000 BV per side, 1 unit per side, era 3050, IS tech base, aggressive vs defensive AI.
- [ ] 5.11 Smoke test: `tsx scripts/run-simulation.ts --config scripts/swarm-configs/duel-3kbv-temperate.json --runs 10 --seed 42` — output JSON is byte-identical across two invocations.
- [ ] 5.12 Throughput test: `--runs 1000` completes in <60s on a dev machine (Phase 0 evidence: ~30ms × 1000 ≈ 30s).
- [ ] 5.13 JSON output validates against new `ISimulationRunResult` schema (Phase 6 verification consumes this).

## 6. Phase 6 — Per-Chassis / Per-Pilot Aggregation

- [ ] 6.1 Extend `MetricsCollector` (in `src/simulation/`) to consume `participants` payload from `ISimulationRunResult` when `schemaVersion >= 2`.
- [ ] 6.2 Add `chassisMatrix` rollup — `{ [chassisA]: { [chassisB]: { wins: number; losses: number; draws: number } } }`. Populated from per-run participants + outcome.
- [ ] 6.3 Add `gunneryBracket` rollup — `{ '1-2': { wins, losses, avgDamageDealt }, '3-4': {...}, '5-6': {...}, '7+': {...} }`. Bucket each participant's gunnery into a bracket and accumulate.
- [ ] 6.4 Add `aiVariantHeadToHead` rollup — `{ [variantA_vs_variantB]: { wins, losses, draws, avgTurns } }`. Indexed by canonical-ordered variant pair.
- [ ] 6.5 Add `pilotPerformance` rollup — `{ [pilotId]: { runs, wins, kills, takenWounds } }`. Populated only when `--pilots vault` (real pilot IDs); empty when synthesized pilots are used.
- [ ] 6.6 Output JSON with all four rollups under `aggregations` key on the result envelope.
- [ ] 6.7 Optional CSV export of `chassisMatrix` (flattened) — gated behind `--output-format csv` flag; default JSON only.
- [ ] 6.8 Snapshot test: 100-run swarm — assert chassis-matrix row sums equal total runs, gunnery-bracket totals reconcile with `participants` count, ai-variant-h2h sum equals total runs.
- [ ] 6.9 AI-variant test: `aggressive` vs `defensive` 200-run head-to-head produces non-degenerate win-rate (assert win-rate is in [10%, 90%] range, not 0% or 100%).
- [ ] 6.10 Schema-version migration test: a pre-existing `schemaVersion: 1` result fed into `MetricsCollector.aggregateBatchOutcomes` produces side-aggregate output (existing behavior) without errors.

## 7. Phase 7 — Deferred (Out of Scope, Tracked Here)

- [ ] 7.1 Worker-thread parallelism in `BatchRunner` — trigger when single-thread ≥10K runs becomes painful, OR exhaustive matrix crosses ~360K runs.
- [ ] 7.2 Wire `src/utils/gameplay/terrainGenerator.ts` Perlin biome generator (`temperate` / `desert` / `arctic` / `urban` / `jungle`) into `ScenarioGenerator.generateMap` — connector exists, just unwired.
- [ ] 7.3 LLM-driven `IAIPlayer` implementation — wraps Anthropic API via `claude-api` skill; `IAIPlayer` (Phase 3) is the seam.
- [ ] 7.4 `--reproduce <output-json>` CLI flag — extract seed + config from prior swarm output, replay exactly.
- [ ] 7.5 Markdown-table summaries for `chassisMatrix` — human-readable post-batch output.
- [ ] 7.6 Multi-matchup config support — single CLI invocation runs 5 different BV budgets in a sweep matrix.

## 8. Verification — End-to-End

- [ ] 8.1 Determinism (CI): same `--config` + `--seed` produces byte-identical output JSON across two invocations.
- [ ] 8.2 Pilot skill end-to-end: `--pilots template --pilot-skill-band 2-3` 100 runs vs `--pilot-skill-band 5-6` 100 runs same seed-base — assert measurable win-rate delta (≥10 percentage points) and lower average turn count for the high-skill side.
- [ ] 8.3 AI variant H2H: `--ai-side-a aggressive --ai-side-b defensive` 200 runs — assert non-degenerate win-rate (35-65% range).
- [ ] 8.4 Real catalog wiring: `--mech-pool catalog --bv-budget 5000 --era 3050` 50 runs — output report shows ≥3 distinct chassis names per side; no `null` chassis IDs in `participants`.
- [ ] 8.5 Aggregation correctness: run 100, parse output JSON, assert `chassisMatrix` row sums equal `gunneryBracket` row sums equal 100.
- [ ] 8.6 Existing test suite: all `src/simulation/__tests__/*` continue to pass — no regression in BV calc or invariant detectors.
- [ ] 8.7 Swarm-test as feature shakedown: 1,000-run swarm of `aggressive` vs `defensive` over 5 random catalog forces — manual review of the per-chassis win-rate matrix surfaces at least one obvious balance signal (chassis dominating its weight bracket).
- [ ] 8.8 Build green: `npx nx run-many -t build` (or equivalent project build target) succeeds.
- [ ] 8.9 Lint green: `npx nx run-many -t lint` succeeds.
- [ ] 8.10 Type-check green: `npx tsc --noEmit` succeeds.
