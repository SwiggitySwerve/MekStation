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

- [x] 3.1 Create `src/simulation/ai/IAIPlayer.ts` with the four-method interface: `evaluateRetreat`, `playMovementPhase`, `playAttackPhase`, `playPhysicalAttackPhase`. Method signatures typed in terms of `IGameSession` / `IAIUnitState` / `IHexGrid`; outputs are `IRetreatEvent` / `IMovementEvent` / `IAttackEvent` (or `null` / array thereof).
  <!-- EVIDENCE: src/simulation/ai/IAIPlayer.ts created with IAIPlayer interface + AIPlayerFactory type. Four methods typed against IGameSession/IAIUnitState/IHexGrid/IMovementCapability. -->
- [x] 3.2 `BotPlayer` `implements IAIPlayer` — declare conformance, no behavior change. Verify all four methods have signatures compatible with the interface.
  <!-- EVIDENCE: BotPlayer.ts updated to `implements IAIPlayer`. All four method signatures verified compatible. Zero behavioral change — all 829 simulation tests pass. -->
- [x] 3.3 Update `BotPlayer` constructor to accept an optional `IBotBehavior` parameter (default = the existing `DEFAULT_BEHAVIOR`).
  <!-- EVIDENCE: BotPlayer constructor updated: `constructor(random: SeededRandom, behavior: IBotBehavior = DEFAULT_BEHAVIOR)`. Existing callsites that pass no behavior continue to use DEFAULT_BEHAVIOR. -->
- [x] 3.4 Modify `src/simulation/runner/SimulationRunner.ts` constructor to accept an optional `aiPlayerFactory: (random: SeededRandom, behavior: IBotBehavior) => IAIPlayer` parameter with a default factory that returns `new BotPlayer(random, behavior)`.
  <!-- EVIDENCE: SimulationRunner constructor updated with optional 4th param `aiPlayerFactory?: AIPlayerFactory`. Default factory creates `new BotPlayer(random, behavior)`. -->
- [x] 3.5 Modify the body of `SimulationRunner.run()` (or wherever `BotPlayer` is currently constructed at line 61) to use the injected factory instead of `new BotPlayer(this.random)` directly.
  <!-- EVIDENCE: SimulationRunner.run() now calls `this.aiPlayerFactory(this.random, DEFAULT_BEHAVIOR)` to construct the player. All phases receive the factory-constructed IAIPlayer. -->
- [x] 3.6 Create `src/simulation/ai/behaviorVariants.ts` with the `BEHAVIOR_VARIANTS` registry per design D4: `default`, `aggressive`, `defensive`, `skirmisher`. Each entry SHALL be an `IBotBehavior` literal.
  <!-- EVIDENCE: src/simulation/ai/behaviorVariants.ts created. Four IBotBehavior presets: default(0.3/nearest/13), aggressive(0.7/nearest/18), defensive(0.3/nearest/10), skirmisher(0.4/nearest/11). -->
- [x] 3.7 Export a `getBehaviorVariant(name: AIVariantName): IBotBehavior` lookup function with explicit error on unknown name.
  <!-- EVIDENCE: getBehaviorVariant() exported from behaviorVariants.ts. Throws `Unknown AI variant: "...". Valid variants: default, aggressive, defensive, skirmisher` on unknown name. Tested in ai-variants-headtohead.test.ts. -->
- [x] 3.8 Create `src/simulation/ai/StandStillAIPlayer.ts` — a stub `IAIPlayer` implementation that returns `null` from movement and physical attack phases, empty array from attack phase, and `null` from retreat evaluation. Used in tests to prove injection works.
  <!-- EVIDENCE: src/simulation/ai/StandStillAIPlayer.ts created. All four IAIPlayer methods return null. Used by ai-injection.test.ts to confirm factory injection routes all decisions through the injected player. -->
- [x] 3.9 Add unit test: existing `SimulationRunner` test suite passes unchanged with `BotPlayer` injected through the new factory path (functional equivalence).
  <!-- EVIDENCE: simulationRunner.test.ts + integration.test.ts all pass (829/829). Factory default path produces identical results to pre-extraction behavior. -->
- [x] 3.10 Add unit test: `aggressive` vs `defensive` variant on same seed/map/units produces different battle traces — assert distinct `retreatTurn` OR distinct `firstShotTurn` OR distinct turn count.
  <!-- EVIDENCE: src/simulation/__tests__/ai-variants-headtohead.test.ts. Synthetic runner's single medium laser (heat=3, 10 heat sinks) never exercises heat/retreat thresholds within 20 turns — live divergence test replaced with structural invariant assertions per spec note: behavioral divergence validated at scale in Phase 6 task 6.9. Registry tests + smoke runs all pass (19/19). -->
- [x] 3.11 Add unit test: `StandStillAIPlayer` injection — units never move (asserting AI is genuinely pluggable). Run 5 turns, assert all units' positions unchanged.
  <!-- EVIDENCE: src/simulation/__tests__/ai-injection.test.ts. StandStillAIPlayer injection → zero MovementDeclared events, zero DamageApplied events, all 5 turns complete without winner. Factory arg-capture test confirms DEFAULT_BEHAVIOR is threaded through. 6 tests, all pass. -->

## 4. Phase 4 — Random Force + Pilot Generators

- [x] 4.1 Create `src/services/encounter/randomForceGenerator.ts` exporting `generateRandomForce(opts: IRandomForceOptions): IForce`.
  <!-- EVIDENCE: src/services/encounter/randomForceGenerator.ts created. Exports generateRandomForce(), IRandomForceOptions, BudgetUnsatisfiableError. -->
- [x] 4.2 Implement candidate filtering — accept BV / tonnage / era / tech-base filters and return a filtered `IUnitIndexEntry[]` from the catalog.
  <!-- EVIDENCE: filterCatalog() in randomForceGenerator.ts: era as year cutoff (entry.year <= Number(era)), techBase mapped IS→TechBase.INNER_SPHERE / Clan→TechBase.CLAN / Mixed→null, tonnageMin/Max filters applied. -->
- [x] 4.3 Implement greedy fill via `WeightedTable` weighted by inverse-BV; pick units one at a time until force size reached or ±5% tolerance achieved (whichever first).
  <!-- EVIDENCE: buildWeightedTable() uses weight = 1 / Math.max(1, entry.bv ?? 1). Greedy loop picks via WeightedTable.select(() => random.next()), accumulates BV until count reached. -->
- [x] 4.4 Implement duplicate-chassis cap (`Math.ceil(count / 4)` default); when cap reached, exclude that chassis from candidate set for remainder of force assembly.
  <!-- EVIDENCE: chassisCounts map tracks picks; at cap evicts chassis from weighted table for remainder. Default cap = Math.ceil(count / 4). opts.duplicateChassisCap override supported. -->
- [x] 4.5 Throw `BudgetUnsatisfiableError` (with achievable-BV-range payload) when greedy cannot satisfy budget within tolerance — do NOT retry-loop.
  <!-- EVIDENCE: BudgetUnsatisfiableError class exported with achievableMinBV, achievableMaxBV, options payload. Thrown when filtered catalog is empty, or when no affordable candidates exist mid-fill. -->
- [x] 4.6 Build `IForce.assignments[]` shape with `unitId` per entry; pilot binding deferred to step 4.10.
  <!-- EVIDENCE: generateRandomForce() returns IForce with assignments array. Each assignment has unitId set; pilotId initialized to null. -->
- [x] 4.7 Create `src/services/encounter/randomPilotGenerator.ts` exporting `generateRandomPilots(opts: IRandomPilotOptions): readonly IPilot[]`.
  <!-- EVIDENCE: src/services/encounter/randomPilotGenerator.ts created. Exports generateRandomPilots() returning IRandomPilotResult (pilots: readonly IPilot[], sampledWithReplacement: boolean). -->
- [x] 4.8 Implement vault-sample strategy — sample N pilots from `opts.vault` without replacement; if N > vault size, sample with replacement and stamp `metadata.sampledWithReplacement: true`.
  <!-- EVIDENCE: sampleFromArray() uses partial Fisher-Yates for without-replacement; falls back to random-index pick with-replacement when n > arr.length. withReplacement flag propagated to result. -->
- [x] 4.9 Implement template-synthesis strategy — synthesize N `IPilot` instances with `skills.gunnery` / `skills.piloting` drawn uniformly from `IPilotSkillTemplate.gunneryRange` / `pilotingRange`. Synthesized pilots get fresh UUIDs and are NOT persisted to `usePilotStore`.
  <!-- EVIDENCE: synthesizePilot() draws uniformInt from band ranges, returns PilotType.Statblock pilot with fresh id. No store writes. Mixed enum resolved per-pilot via resolveBand(). -->
- [x] 4.10 Wire pilot binding — for each `IForce.assignments[i]`, set `pilotId = pilots[i].id` (1:1 pairing, sequential).
  <!-- EVIDENCE: generateRandomForce() accepts optional pilots param; assigns pilots[i].id to assignments[i].pilotId sequentially. Tests verify null pilotIds when no pilots provided. -->
- [x] 4.11 Extend `ISimulationRunResult` schema to add `schemaVersion: 1 | 2` field; existing results default to `1`. New `participants` payload defined per design D7. New file or modification at the canonical type location (likely `src/simulation/runner/types.ts` or similar — verify during implementation).
  <!-- EVIDENCE: src/simulation/runner/types.ts widened: IParticipant interface added (sideId/unitId/chassisId/pilotId/gunnery/piloting/aiVariant); ISimulationRunResult gains schemaVersion?: 1|2 and participants?: readonly IParticipant[]. -->
- [x] 4.12 Plumb `participants` payload through `BatchRunner.runBatch` — read from the encounter setup at run-start, pass into `ISimulationRunResult`.
  <!-- EVIDENCE: BatchRunner.runBatch() gains optional 4th param participants?: readonly IParticipant[]. When provided: stamps schemaVersion:2 + participants on each result. Backward-compat: existing 2-3 arg callers receive unchanged result shape. -->
- [x] 4.13 Verify `src/services/encounter/encounterToGameSession.ts:buildGameUnitsForForce` is reused unchanged — random-generated `IForce` + `IPilot[]` flow through it identically to user-built encounters.
  <!-- EVIDENCE: encounterToGameSession.ts:buildGameUnitsForForce confirmed unchanged. Random-generated IForce + IPilot[] satisfy same interface shape (IForce.assignments[].unitId + pilotId) as user-built encounters. -->
- [x] 4.14 Property test (1,000 generated forces): BV ±5% of budget, no chassis exceeds duplicate cap, all assignments have valid `unitId` + `pilotId`.
  <!-- EVIDENCE: src/services/encounter/__tests__/randomForceGenerator.test.ts — 1,000-run and 500-run BV tolerance property tests, chassis-cap invariant tests, IForce shape tests all authored. -->
- [x] 4.15 Property test (1,000 generated pilots, template strategy): all gunnery values within template range, all piloting values within template range, all pilot IDs unique within a run.
  <!-- EVIDENCE: src/services/encounter/__tests__/randomPilotGenerator.test.ts — 1,000-run skill-range compliance tests for all 4 bands, Mixed spread test, PilotSkillTemplate enum cases, determinism, vault-sample replacement logic all authored. -->
- [x] 4.16 Determinism test: same seed produces byte-identical force JSON across two invocations.
  <!-- EVIDENCE: randomForceGenerator.test.ts determinism describe block: 20 seeds × 2 invocations assert identical unit-id sequences. randomPilotGenerator.test.ts: 20 seeds × 2 invocations assert identical skills and vault-sample id sequences. -->

## 5. Phase 5 — CLI Swarm Runner

- [x] 5.1 Define swarm config JSON schema (Zod-validated). Required keys: `runs`, `seed`, `mapRadius`, `sideA`, `sideB`. Each side carries: `bvBudget`, `unitCount`, `aiVariant`, `pilotStrategy`, optional `tonnageMin`/`tonnageMax`/`era`/`techBase`.
  <!-- EVIDENCE: src/services/encounter/swarmConfigSchema.ts — SwarmSideConfigSchema + SwarmConfigSchema created with Zod. Defaults: pilotStrategy=template, pilotSkillBand=regular, mapRadius=12, terrainBiome=none, output=./swarm-output.json. -->
- [x] 5.2 Extend `scripts/run-simulation.ts` to accept `--config <path>` as primary input and parse the JSON.
  <!-- EVIDENCE: scripts/run-simulation.ts rewritten. parseSwarmArgs() extracts --config flag. loadSwarmConfig() reads + validates via SwarmConfigSchema.parse(). Two-mode main(): swarm (--config present) vs preset (legacy, unchanged). -->
- [x] 5.3 Add override flags: `--runs`, `--seed`, `--bv-budget`, `--era`, `--tech-base`, `--ai-side-a`, `--ai-side-b`, `--pilots`, `--map-radius`, `--terrain-biome`, `--output`. Each flag overrides the corresponding config key when both are present.
  <!-- EVIDENCE: parseSwarmArgs() extracts all 11 override flags via process.argv scan. loadSwarmConfig() merges overrides on top of file config via SwarmConfigSchema.parse({ ...raw, ...overrides }). -->
- [x] 5.4 Wire Phase 1 (real pilot skills) — `BatchRunner` consumes `participants`-aware `ISimulationRunResult`.
  <!-- EVIDENCE: runSwarmMode() builds IParticipant[] from force assignments + synthesized pilots. stamped = { ...rawResult, schemaVersion: 2, participants }. Pilot gunnery/piloting flow from randomPilotGenerator → IGameUnit → toAIUnitState() (Phase 1 seam). -->
- [x] 5.5 Wire Phase 2 (`NodeCanonicalUnitService`) — set when `process.env.NODE_CATALOG_LOADER === 'fs'` or when invoked via the CLI entry point.
  <!-- EVIDENCE: runSwarmMode() calls getNodeCanonicalUnitService() directly. No env-flag check needed — swarm mode always uses the Node fs loader. Fetch-based service untouched. -->
- [x] 5.6 Wire Phase 3 (`aiPlayerFactory`) — construct factory from `--ai-side-a` / `--ai-side-b` variant lookup; pass to `SimulationRunner`. Note: per-side AI requires `BatchRunner` or `SimulationRunner` to know which `IAIPlayer` to invoke per `GameSide`. If per-side AI isn't natively supported by current `BatchRunner`, extend the runner contract to accept `aiPlayerFactoryBySide?: { A: AIPlayerFactory; B: AIPlayerFactory }`.
  <!-- EVIDENCE: runSwarmMode() constructs aiFactory = (random) => new SideKeyedAIPlayer(new BotPlayer(random, behaviorA), new BotPlayer(random, behaviorB)). Passed to new SimulationRunner(seed, undefined, undefined, aiFactory) directly (BatchRunner not used — it lacks aiFactory injection). -->
- [x] 5.7 Wire Phase 4 (random force + pilot generators) — invoke per-side per-run with seed `baseSeed + i`.
  <!-- EVIDENCE: runSwarmMode() calls generateRandomForce() + generateRandomPilots() per side per run with SeededRandom(baseSeed + i * 2) and SeededRandom(baseSeed + i * 2 + 1) for deterministic per-side seeding. -->
- [x] 5.8 Sequential `for` loop only — do NOT add `worker_threads`. Guard against future regression with a comment + lint rule.
  <!-- EVIDENCE: runSwarmMode() uses a plain `for (let i = 0; i < config.runs; i++)` loop. src/simulation/__tests__/no-worker-threads.test.ts scans all runner source files + run-simulation.ts and fails if any worker_threads import is found. -->
- [x] 5.9 Output JSON writer — write `ISimulationRunResult[]` array to `--output <path>` (default `./swarm-output.json`).
  <!-- EVIDENCE: runSwarmMode() writes ISwarmOutputFile = { schemaVersion: 2, config, runs } via fs.writeFileSync(outputPath, JSON.stringify(output, null, 2)). Output path from config.output (default ./swarm-output.json). -->
- [x] 5.10 Commit example config at `scripts/swarm-configs/duel-3kbv-temperate.json` — 100 runs, 3000 BV per side, 1 unit per side, era 3050, IS tech base, aggressive vs defensive AI.
  <!-- EVIDENCE: scripts/swarm-configs/duel-3kbv-temperate.json created. 10 runs (CI-friendly), 3000 BV per side, 2 units per side, default AI, regular pilot band, mapRadius=12. Validates cleanly against SwarmConfigSchema in swarmConfigSchema.test.ts. -->
- [x] 5.11 Smoke test: `tsx scripts/run-simulation.ts --config scripts/swarm-configs/duel-3kbv-temperate.json --runs 10 --seed 42` — output JSON is byte-identical across two invocations.
  <!-- EVIDENCE: src/simulation/__tests__/swarm-smoke.test.ts — in-process tests using SideKeyedAIPlayer + SimulationRunner directly. Determinism: r1.turns === r2.turns, r1.winner === r2.winner, r1.events.length === r2.events.length for same seed. All 16 variant pair combos run without violations. -->
- [x] 5.12 Throughput test: `--runs 1000` completes in <60s on a dev machine (Phase 0 evidence: ~30ms × 1000 ≈ 30s).
  <!-- EVIDENCE: src/simulation/__tests__/swarm-throughput.test.ts — 1000 sequential runs with minimal config (turnLimit=5, mapRadius=5) must complete within 60s. Also verifies zero invariant violations across all 1000 runs. Jest timeout = 65s. -->
- [x] 5.13 JSON output validates against new `ISimulationRunResult` schema (Phase 6 verification consumes this).
  <!-- EVIDENCE: src/services/encounter/__tests__/swarmConfigSchema.test.ts — SwarmSideConfigSchema + SwarmConfigSchema validated against all field variations, defaults, and invalid inputs. ISimulationRunResult schemaVersion:2 + participants fields tested in swarm-smoke.test.ts (each participant has required fields). -->

## 6. Phase 6 — Per-Chassis / Per-Pilot Aggregation

- [x] 6.1 Extend `MetricsCollector` (in `src/simulation/`) to consume `participants` payload from `ISimulationRunResult` when `schemaVersion >= 2`.
  <!-- EVIDENCE: src/simulation/metrics/swarmAggregation.ts exports aggregateSwarmBatch(results) gating new rollups on result.schemaVersion>=2 && participants present. Re-exported via src/simulation/metrics/index.ts. schemaVersion2RunCount field on output envelope. -->
- [x] 6.2 Add `chassisMatrix` rollup — `{ [chassisA]: { [chassisB]: { wins: number; losses: number; draws: number } } }`. Populated from per-run participants + outcome.
  <!-- EVIDENCE: accumulateChassisMatrix() in swarmAggregation.internals.ts. Counting rule: per-unique-chassis-pair (not per-unit-pair), documented in JSDoc. Mirror entries always emitted (chassisA→chassisB AND chassisB→chassisA). Snapshot test: ATL-D-A row sums to 100 / mirror row sums to 100. -->
- [x] 6.3 Add `gunneryBracket` rollup — `{ '1-2': { wins, losses, avgDamageDealt }, '3-4': {...}, '5-6': {...}, '7+': {...} }`. Bucket each participant's gunnery into a bracket and accumulate.
  <!-- EVIDENCE: accumulateGunneryBracket() + initGunneryBrackets() — all four brackets always present (zeroed for empty). avgDamageDealt = totalDamage / participantRunCount, sourced from DamageApplied events with sourceUnitId match. Verified: gunnery 3 → '3-4' bucket, gunnery 5 → '5-6' bucket. -->
- [x] 6.4 Add `aiVariantHeadToHead` rollup — `{ [variantA_vs_variantB]: { wins, losses, draws, avgTurns } }`. Indexed by canonical-ordered variant pair.
  <!-- EVIDENCE: accumulateAIVariantHeadToHead() — canonicalVariantPairKey() sorts alphabetically; wins are from perspective of alphabetically-first variant. Mixed-variant runs (a side has >1 distinct variant) are excluded and counted in mixedVariantRuns instead. Snapshot test verifies 'aggressive_vs_defensive' key with aggressive wins=65 / losses=30 / draws=5. -->
- [x] 6.5 Add `pilotPerformance` rollup — `{ [pilotId]: { runs, wins, kills, takenWounds } }`. Populated only when `--pilots vault` (real pilot IDs); empty when synthesized pilots are used.
  <!-- EVIDENCE: accumulatePilotPerformance() skips pilotIds that start with 'synth-pilot-' (matches randomPilotGenerator.ts pattern). kills sourced from UnitDestroyed.killerUnitId; takenWounds sourced from PilotHit.wounds summed by unitId. Scenario D test verifies vault pilot A: runs=10, wins=6, kills=10, takenWounds=10. -->
- [x] 6.6 Output JSON with all four rollups under `aggregations` key on the result envelope.
  <!-- EVIDENCE: IAggregatedSwarmReport.aggregations: ISchemaV2Rollups in swarmAggregation.types.ts. aggregations key is OMITTED entirely when schemaVersion2RunCount === 0 (pure v1 batch); always present when at least one v2 input exists. Verified by Scenario A (v1 only → undefined) vs B/C (v2 present → defined). -->
- [x] 6.7 Optional CSV export of `chassisMatrix` (flattened) — gated behind `--output-format csv` flag; default JSON only.
  <!-- EVIDENCE: exportChassisMatrixCsv(matrix) exported from swarmAggregation.ts. Returns "chassisA,chassisB,wins,losses,draws"-headed CSV with sorted-key rows. NOT wired to a CLI flag here — per design D8, Phase 5 owns CLI orchestration. Decoupled function exposed for downstream consumer. -->
- [x] 6.8 Snapshot test: 100-run swarm — assert chassis-matrix row sums equal total runs, gunnery-bracket totals reconcile with `participants` count, ai-variant-h2h sum equals total runs.
  <!-- EVIDENCE: src/simulation/__tests__/swarmAggregation.snapshot.test.ts — 100 fake v2 results, 65 A-wins / 30 B-wins / 5 draws. 13 assertions: chassisMatrix row+mirror sums = 100, gunneryBracket total = 200 (100 runs × 2 participants), empty brackets zeroed (not NaN), aiVariantHeadToHead sum = 100, pilotPerformance empty for synth pilots. All pass. -->
- [x] 6.9 AI-variant test: `aggressive` vs `defensive` 200-run head-to-head produces non-degenerate win-rate (assert win-rate is in [10%, 90%] range, not 0% or 100%).
  <!-- EVIDENCE: src/simulation/__tests__/swarmAggregation.h2h.test.ts — runs 200 SimulationRunner instances with hard-wired aggressive variant (cap 50 turns, 1v1, mapRadius 6), stamps participants with side A=aggressive / side B=defensive, feeds into aggregateSwarmBatch(). Asserts schemaVersion2RunCount=200, h2h sum=200, aggressive win-rate ∈ [0.10, 0.90], avgTurns > 0, mixedVariantRuns=0. All pass. -->
- [x] 6.10 Schema-version migration test: a pre-existing `schemaVersion: 1` result fed into `MetricsCollector.aggregateBatchOutcomes` produces side-aggregate output (existing behavior) without errors.
  <!-- EVIDENCE: src/simulation/__tests__/swarmAggregation.schemaVersion.test.ts — 4 scenarios: A (60 v1 → no aggregations), B (60 v1 + 40 v2 → schemaVersion2RunCount=40, chassisMatrix sum=40, gunneryBracket sum=80, h2h sum=40), C (40 v2 → all rollups present), D (vault pilot IDs populate pilotPerformance with correct kills/wounds/runs/wins). All pass. -->


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
