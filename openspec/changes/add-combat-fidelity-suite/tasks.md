# Tasks — Combat Fidelity Suite

## Phase 0 — Determinism infrastructure (~6h, PR #1)

- [x] 0.1 Author `src/simulation/core/SeededD6Roller.ts` adapting `SeededRandom` (Mulberry32 floats) to `D6Roller` interface from `src/utils/gameplay/diceTypes.ts`. Both `rollD6()` and `roll2d6()` methods.
- [x] 0.2 Unit test: 1000 sequential `roll2d6()` calls against seed 42 → exact match between two fresh rollers (determinism). Distribution check: roll counts within 5% of analytic 1/36 per (1,1) through (6,6).
- [x] 0.3 Audit `src/utils/gameplay/` for unseeded dice. Grep for `Math.random`, `roll2d6()` without parameters, `Math.floor(Math.random() * `. Tag every callsite with one of: `[OK — defaultD6Roller fallback acceptable]`, `[FIX — needs roller injection]`.
- [x] 0.4 Add optional `roller?: D6Roller` parameter to `checkCriticalHitTrigger` (`src/utils/gameplay/damage/critical.ts:14`). Default to `defaultD6Roller`. Update internal `roll2d6()` call to use the parameter.
- [x] 0.5 Thread `roller?: D6Roller` through `resolveDamage` (`src/utils/gameplay/damage/resolve.ts`) and pass to `checkCriticalHitTrigger`.
- [x] 0.6 Verify no production callsite breaks: `npm run build`, `npm run typecheck`, full Jest suite.
- [x] 0.7 Add CI grep guard: fail if `Math.random()` appears in `src/utils/gameplay/` or `src/simulation/` outside `defaultD6Roller` definition site.
- [x] 0.8 Open PR #1, wait for CI green, merge.

## Phase 1 — Atlas AS7-D hydration (~3h, PR #2)

- [x] 1.1 Modify `toAIUnitState()` (`src/simulation/runner/SimulationRunnerSupport.ts:132`) to accept `unitId` from the participant payload; look up real `IFullUnit` via the catalog service; map `IFullUnit.equipment` (filtered to weapons) to the `IAIWeapon[]` shape.
- [x] 1.2 Modify `createInitialUnitState` (`src/simulation/runner/SimulationRunnerState.ts` and/or `src/utils/gameplay/gameState/initialization.ts`) to propagate per-location armor + structure from the catalog `IFullUnit.armor.allocation` into `IUnitGameState` armor / structure maps.
- [x] 1.3 For Atlas AS7-D specifically: confirm hydrated state has 4 medium lasers + AC/20 + LRM-20 + SRM-6, total armor 304 across 11 locations, total internal structure per Atlas profile.
- [x] 1.4 Unit test: hydrate Atlas AS7-D from catalog, assert weapon count + per-location armor + per-location structure match canonical values.
- [x] 1.5 Integration test: run a 5-turn 1v1 Atlas-vs-Atlas seeded fight, assert AI emits attack actions for each Atlas weapon (not just one synthetic ML).
- [x] 1.6 Open PR #2 ([#520](https://github.com/SwiggitySwerve/MekStation/pull/520)), CI green, merge.

## Phase 0.5 — Closed-set hygiene (~3h, PR #2.5 — folded after Phase 1)

**Background**: The OMO Council's second-review identified a three-way naming split between `damage-system` source-of-truth spec (kebab-case), live code (snake_case across 15+ files), and PR #515's deltas (snake_case). Phase 0.5 reconciles spec → code, closes pilot- and match-terminal-state enums, and asserts conservation invariants.

- [x] 0.5.1 Update `src/types/gameplay/GameSessionInterfaces.ts:766` `IUnitDestroyedPayload.cause` union to the unified 7-value snake_case set: `'damage' | 'ammo_explosion' | 'pilot_death' | 'engine_destroyed' | 'shutdown' | 'ct_destroyed' | 'head_destroyed'`.
- [x] 0.5.2 Update `src/types/gameplay/CombatInterfaces.ts:350` `destructionCause` union to match exactly (currently has `'damage' | 'ammo_explosion' | 'pilot_death' | 'engine_destroyed'` — add `shutdown`, `ct_destroyed`, `head_destroyed`).
- [x] 0.5.3 Update `src/utils/gameplay/damage/types.ts:45` `cause` union to match the symmetric set.
- [x] 0.5.4 Search for remaining inline string literals using the old kebab-case values (`'pilot-killed'`, `'crew-kia'`, `'engine-destroyed'`, `'ct-destroyed'`, `'ammo-explosion'`) anywhere in `src/`. Update or remove. Confirm zero hits via grep before commit. (Resolved: zero hits in `cause:` / `destructionCause:` taxonomies. The kebab string `'ammo-explosion'` survives in three independent UI taxonomies — `KeyMomentType`, `damageFeedback.emphasis`, encounter-history `IKeyMoment.type` — which are NOT the cause field. See `notepad/learnings.md` for the disambiguation.)
- [x] 0.5.5 Add `IPilotMatchSummary.matchTerminalState: 'unhurt' | 'wounded' | 'unconscious' | 'kia' | 'ejected'` field to whichever pilot summary type the engine outputs (likely `src/types/gameplay/CombatInterfaces.ts` `IPilotCasualty` or successor). (Resolved: new `IPilotMatchSummary` type added at `src/types/gameplay/CombatInterfaces.ts:511` — no existing pilot summary had the right shape; created the minimal type per task hint.)
- [x] 0.5.6 Add `IMatchResult.matchTerminalState: 'player_victory' | 'opfor_victory' | 'draw' | 'mutual_destruction' | 'timeout' | 'forfeit' | 'withdrawal'` field to the runner's match-result type. Compute it at run-end from per-unit fates (per the conservation rules in `after-combat-report`). (Resolved: `MatchTerminalState` + `determineMatchTerminalState` in new file `src/simulation/runner/matchTerminalState.ts`; field added to `ISimulationRunResult` and populated in `SimulationRunner.run()` at `SimulationRunner.ts:218`. Forfeit / withdrawal flags currently passed as `false`; documented in `notepad/issues.md` as deferred follow-up.)
- [x] 0.5.7 Unit tests: closed-set enforcement. Try assigning a string outside the union — TypeScript MUST reject. Try the conservation invariants (sum of fates == roster size) — assertion MUST hold for every test scenario. (Resolved: `src/simulation/runner/__tests__/matchTerminalState.test.ts` — 16 tests covering TS-level rejection, exclusivity / membership / precedence, and conservation invariants.)
- [x] 0.5.8 Open PR `feat(combat-fidelity): closed-set hygiene for unit/pilot/match terminal states`, CI green, merge. (PR #519 opened; CI green across all required checks; merge gate held for boss agent per task brief.)

## Phase 2 — Weapon attack events (~1d, PR #3)

- [ ] 2.1 Modify `weaponAttack.ts` (`src/simulation/runner/phases/weaponAttack.ts`) to emit `AttackDeclared` (with `attackerId`, `targetId`, `weaponId`, `range`, `arc`, `modifiers[]`) BEFORE the to-hit roll.
- [ ] 2.2 Emit `AttackResolved` (with `attackerId`, `targetId`, `weaponId`, `rolledTN`, `rolled2d6`, `hit: bool`, `hitLocation`, `damage`) AFTER the to-hit roll resolves.
- [ ] 2.3 Emit `LocationDestroyed` when a location's armor + structure both reach zero.
- [ ] 2.4 Emit `TransferDamage` when damage flows from a destroyed location to the next location in the transfer chain.
- [ ] 2.5 Update `IGameEvent` payload types in `src/types/gameplay/GameSessionInterfaces.ts` (or matching events file) to include the new fields. Discriminated union per `GameEventType`.
- [ ] 2.6 Unit tests: per-event-type payload shape assertions. Each event has a corresponding minimal-fixture test.
- [ ] 2.7 Scenario test: 5-turn Atlas-vs-Atlas asserts `AttackDeclared` count = expected attack count, `AttackResolved` count = `AttackDeclared` count, `LocationDestroyed` events fire when armor + structure reach zero.
- [ ] 2.8 Open PR #3, CI green, merge.

## Phase 3 — Critical hit wiring (~1d, PR #4)

- [ ] 3.1 Fix `resolve.ts:61` to capture `checkCriticalHitTrigger()` return: `const trigger = checkCriticalHitTrigger(locDamage.structureDamage, roller);`.
- [ ] 3.2 When `trigger.triggered`, call `resolveCriticalHits({ unit, location, count: trigger.count, roller })` from `src/utils/gameplay/criticalHitResolution/resolver.ts`.
- [ ] 3.3 Append result to the existing `criticalHits[]` array on `IDamageResult`. Make sure component-effect side effects (engine destroyed, gyro destroyed, etc.) are applied to `IUnitGameState`.
- [ ] 3.4 Modify `weaponAttack.ts` to emit `CriticalHit` (per crit triggered: count, location), `CriticalHitResolved` (per slot resolved: slot, component, location, criticalRoll), and `ComponentDestroyed` (per component fully destroyed: componentType, componentId, location).
- [ ] 3.5 Verify `applyDamageResultToState()` (`SimulationRunnerState.ts:112`) accepts and applies `criticalHits` to mutate `IComponentDamageState` correctly (engine hits, gyro hits, sensor hits, cockpit hit, actuator hits, weapons destroyed, heat sinks destroyed, jump jets destroyed).
- [ ] 3.6 Unit test: structure damage 5 with seeded roller producing crit roll 8 → 1 critical hit triggered, 1 slot resolved, event chain emitted in correct order.
- [ ] 3.7 Scenario test: gyro-destruction sequence — repeated CT structure damage until gyro takes 2 hits → unit falls (PSR), eventually destroyed.
- [ ] 3.8 Scenario test: engine-destruction sequence — 3 engine crits → unit destroyed via engine cause.
- [ ] 3.9 Open PR #4, CI green, merge.

## Phase 4 — Heat & ammo events (~1d, PR #5)

- [ ] 4.1 Modify `runHeatPhase()` (`src/simulation/runner/phases/postCombat.ts:144`) to emit `HeatGenerated` (per unit per turn, with breakdown: movement heat, weapon heat, terrain), `HeatDissipated` (per unit per turn, heat sink count + capacity), `HeatEffectApplied` (when heat ≥ 5 / 10 / 15 / 20 / 25 / 30 thresholds, with movement penalty / to-hit penalty / shutdown gates).
- [ ] 4.2 Emit `ShutdownCheck` when heat ≥ 14 (avoidable) or ≥ 30 (auto).
- [ ] 4.3 Emit `AmmoConsumed` when a weapon fires (linked ammo bin decrements).
- [ ] 4.4 Emit `AmmoExplosion` when a critical hit lands on an ammo slot. Apply CASE / CASE-II location confinement rules. Cascade damage event chain through the existing damage pipeline.
- [ ] 4.5 Emit `PilotHit` when a head hit damages the pilot (already tracked in state, not yet emitted as event).
- [ ] 4.6 Scenario test: alpha-strike heat shutdown — Atlas alphas (AC/20 + LRM-20 + 4×ML + SRM-6 = ~30 heat) at heat 0 → heat 30 → ShutdownCheck → unit shuts down → next turn no fire.
- [ ] 4.7 Scenario test: ammo cook-off — Atlas takes critical hit on AC/20 ammo bin → AmmoExplosion → 200 internal damage to RT → RT destroyed → no transfer (CASE blocks) OR transfer to CT (no CASE) → unit destroyed.
- [ ] 4.8 Open PR #5, CI green, merge.

## Phase 5 — MetricsCollector hydration (~0.5d, PR #6)

- [ ] 5.1 Modify `MetricsCollector.recordGame()` (`src/simulation/metrics/MetricsCollector.ts`) to parse the now-typed event log and populate the stub fields: `playerUnitsStart` (count from initial state), `playerUnitsEnd` (count of player units not destroyed at end), `opponentUnitsStart`, `opponentUnitsEnd`, `totalDamageDealt` (sum of `DamageApplied.damage` across all events).
- [ ] 5.2 Add new fields to `IGameMetrics`: `criticalHitsLanded`, `componentDestroyedCount`, `ammoExplosions`, `shutdowns`, `falls`, `pilotHits`. Populate from event log.
- [ ] 5.3 Update `swarmAggregation` consumers (`src/simulation/metrics/swarmAggregation.ts`) to surface these metrics in `chassisMatrix` rollups (already wired for damage/kills, extend for crits/components).
- [ ] 5.4 Unit tests: synthetic 1-game event log produces expected metrics totals.
- [ ] 5.5 Scenario test: Atlas-vs-Atlas mirror produces non-zero `criticalHitsLanded` and `totalDamageDealt` reconcilable with the event log.
- [ ] 5.6 Open PR #6, CI green, merge.

## Phase 6 — Test pyramid (~2d, PR #7)

### Unit tests (~60 total)

- [ ] 6.1 `combat-fidelity-hit-location.test.ts` — 11 tests (one per 2d6 outcome) per arc × 4 arcs = 44 tests. Inputs: arc + 2d6 roll. Outputs: location enum value matching MegaMek's `Mek.innerRollHitLocation` table (cited as golden oracle).
- [ ] 6.2 `combat-fidelity-to-hit.test.ts` — 12 tests covering GATOR matrix: gunnery 0-7, attacker movement (stationary / walk / run / jump), target movement (stationary / walk / run / jump / immobile / prone), range bracket (short / medium / long / extreme / out), terrain modifier (light / heavy / urban). Each test asserts target number computation.
- [ ] 6.3 `combat-fidelity-critical-trigger.test.ts` — 6 tests covering threshold ladder: roll 7 → 0 crits, roll 8-9 → 1 crit, roll 10-11 → 2 crits, roll 12 → 3 crits or limb-blown-off (per location). Cited from MegaMek `TWGameManager.criticalEntity:21564-21586`.
- [ ] 6.4 `combat-fidelity-damage-transfer.test.ts` — 8 tests covering transfer chains: HD → null (head doesn't transfer), CT → no transfer (rear), LT → CT, RT → CT, LA → LT, RA → RT, LL → LT, RL → RT. Each with overflow damage assertion.
- [ ] 6.5 `combat-fidelity-heat-math.test.ts` — 5 tests: heat generated (alpha-strike), heat dissipated (10 single heat sinks vs 10 double), net heat after turn, threshold effects at 5/10/15/20/25/30, water-cooling bonus.

### Scenario tests (~8 scripted 5-turn fights)

- [ ] 6.6 `scenario-atlas-mirror.test.ts` — 1v1 Atlas-vs-Atlas mirror match, 10 turns. Asserts: full event chain emitted, both units take damage, at least one component destroyed, deterministic event count across 10 reseeded runs.
- [ ] 6.7 `scenario-atlas-vs-locust.test.ts` — Atlas (assault) vs Locust (light) 10 turns. Asserts: speed-mod GATOR penalties applied, Locust takes more shots than Atlas due to range advantage at light's high movement.
- [ ] 6.8 `scenario-head-3-shot-kia.test.ts` — script 3 sequential head hits via seeded rolls. Asserts: pilot takes 3 wounds, `PilotHit` × 3 emitted, `UnitDestroyed { cause: 'pilot_kia' }` on third hit.
- [ ] 6.9 `scenario-ammo-cookoff.test.ts` — script crit on AC/20 ammo bin. Asserts: `AmmoExplosion` event, 200 damage to source location, downstream events propagate per CASE rules.
- [ ] 6.10 `scenario-gyro-crit-fall.test.ts` — script 1 gyro crit. Asserts: `ComponentDestroyed { component: 'gyro' }`, `PSRTriggered`, `UnitFell` on PSR fail (seeded).
- [ ] 6.11 `scenario-alpha-strike-shutdown.test.ts` — script Atlas alpha-strike (~30 heat). Asserts: `ShutdownCheck` event, `HeatEffectApplied { effect: 'shutdown' }`, next turn AI emits no attack actions.
- [ ] 6.12 `scenario-quad-arm-loss.test.ts` — script repeated arm-location damage on a quad chassis. Asserts: `LocationDestroyed { location: 'LA' }`, `TransferDamage { from: 'LA', to: 'LT' }` (or quad-specific transfer rule).
- [ ] 6.13 `scenario-partial-cover-los.test.ts` — script attacker firing at partial-cover target. Asserts: cover modifier applied, lower-body hits convert to misses per partial-cover rules.

### Monte Carlo distribution tests (~4)

- [ ] 6.14 `mc-medium-laser-hit-rate.test.ts` — 10K seeded ML attacks at S/M/L range vs gunnery-4 stationary target. Assert hit% within ±2σ of analytic 2d6 CDF for target numbers 4 / 7 / 10.
- [ ] 6.15 `mc-hit-location-histogram.test.ts` — 10K hit-location rolls per arc. Assert histogram matches the canonical 1/36-per-outcome distribution within 5%.
- [ ] 6.16 `mc-crit-trigger-rate.test.ts` — 10K critical trigger rolls at 10 structure damage. Assert trigger rate matches CDF (P(2d6 ≥ 8) ≈ 41.67%) within ±2σ.
- [ ] 6.17 `mc-ammo-explosion-frequency.test.ts` — 10K Atlas turns at heat 19 with AC/20 ammo. Assert ammo-explosion frequency matches analytic ammo-explosion-roll CDF.

- [ ] 6.18 Open PR #7, CI green, merge.

## Phase 7 — Verification & archive (~0.5d)

- [ ] 7.1 Spec-verifier (`omo-spec-verifier`) on the change — APPROVE per-requirement coverage table.
- [ ] 7.2 End-to-end smoke: re-run `scripts/run-simulation.ts --config=scripts/swarm-configs/duel-3kbv-temperate.json --runs=10 --seed=42` and verify outputs now include weapon-attack events, critical events, component destruction events, full per-chassis damage matrix.
- [ ] 7.3 Update MEMORY.md with combat-fidelity findings.
- [ ] 7.4 `openspec archive add-combat-fidelity-suite`.

## Deferred / Out of scope (follow-on changes)

- **add-combat-fidelity-catalog-matrix** — extend P1 hydration to all 4196 BattleMech variants; verify each weapon family handler.
- **add-infantry-ba-damage-adapter** — Infantry and Battle Armor combat (no per-location armor, platoon damage, swarm/leg-attack).
- **add-vehicle-structure-rules** — vehicle internal structure, motive damage table, immobilization.
- **add-aerospace-combat-handlers** — atmosphere/space movement, capital weapons, naval rules.
- **add-engine-determinism-audit** — if P0's roller infrastructure surfaces non-dice non-determinism (Date.now, Set/Map iteration, object identity), spawn this follow-on.
- **add-combat-specials** — TAG / iNarc / AMS / aimed shots / called shots / TSM / MASC / supercharger / chameleon LPS / null-sig / void-sig / stealth armor.
