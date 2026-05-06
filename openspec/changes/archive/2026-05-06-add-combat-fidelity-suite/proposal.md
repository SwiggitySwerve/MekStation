# Add Combat Fidelity Suite

## Why

The simulation engine has a fully-implemented combat substrate (hit-location 2d6 tables, damage transfer chain, critical hit resolver, PSR resolution) that is silently severed from the runner at three precise integration points. The recently-shipped Phase 7 swarm harness (`add-encounter-swarm-harness`, archived 2026-05-06) exposed the gap: 50-turn 2v2 default-vs-default real-catalog encounters produce 200 movement events, 36 damage events, 0 weapon-attack events, 0 critical events, 0 kills.

Live evidence from the harness smoke run today (PR #514 branch):

- `weapon_attack_declared` / `weapon_attack_resolved`: **0** emitted across all 10 runs (the AI generates `IAttackEvent` payloads at `src/simulation/ai/BotPlayer.ts:322` but `weaponAttack.ts:184-222` ignores them and emits only `damage_applied` + `unit_destroyed`)
- `CriticalHit` / `CriticalHitResolved` / `ComponentDestroyed`: **0** emitted (`src/utils/gameplay/damage/resolve.ts:61` calls `checkCriticalHitTrigger()` but the return value is not assigned, and `resolveCriticalHits()` at `src/utils/gameplay/criticalHitResolution/resolver.ts:18` has zero callers in the runner)
- `LocationDestroyed` / `TransferDamage` / `AmmoExplosion` / heat events: **0** emitted (the destruction and transfer logic runs, but no events fire)
- Every mech in the runner — regardless of whether the swarm picked an Atlas, Locust, Mad Cat, or Annihilator — fires the same synthetic single-medium-laser loadout because `toAIUnitState()` at `src/simulation/runner/SimulationRunnerSupport.ts:132` ignores the catalog `IFullUnit.weapons` and constructs `[createMinimalWeapon(...)]` regardless

Without these gaps closed, the per-chassis aggregation matrix shipped in `add-encounter-swarm-harness` Phase 6 (PR #511) is mathematically meaningless data — every Atlas-vs-Locust matchup is identical to Locust-vs-Locust at the engine layer. The 4196-unit catalog selection is harmless decoration. Replay determinism (an open issue exposed by PR #514's `MAX_TURNS` bump) cannot be audited because the event log is too sparse to compare runs.

This change closes the engine's combat-fidelity gaps layer-by-layer with a deterministic seeded test pyramid, anchored on a single real catalog unit (Atlas AS7-D) so each layer's assertions exercise real BattleTech mechanics rather than synthetic-laser fiction.

## What Changes

### Engine integration fixes

- **P0 — Determinism infrastructure** — author `SeededD6Roller` in `src/simulation/core/` that adapts the existing `SeededRandom` (Mulberry32) to the `D6Roller` interface at `src/utils/gameplay/diceTypes.ts:20`. Thread `roller?: D6Roller` through `checkCriticalHitTrigger()` (currently calls `roll2d6()` unseeded at `src/utils/gameplay/damage/critical.ts:14`), `resolveDamage()`, and any other `roll2d6` / `Math.random` callsites in the damage pipeline. Audit `src/utils/gameplay/` for unseeded dice.
- **P1 — Real-unit hydration** — wire `toAIUnitState()` (`src/simulation/runner/SimulationRunnerSupport.ts:132`) to read the catalog `IFullUnit.weapons` for the participants' real `unitId`. Propagate per-location armor + structure from the catalog into `IUnitGameState` via `createInitialUnitState`. Initial coverage: Atlas AS7-D (mixed loadout: AC/20 + LRM-20 + 4×ML + SRM-6) as the anchor case.
- **P2 — Weapon attack events** — emit `AttackDeclared` (pre-roll, with attacker/target/weapon/range/modifiers), `AttackResolved` (post-roll, with rolledTN/hit-bool/hit-location), `LocationDestroyed`, and `TransferDamage` from `weaponAttack.ts`.
- **P3 — Critical hit wiring** — fix `resolve.ts:61` to capture the `checkCriticalHitTrigger()` return value, call `resolveCriticalHits()` with the trigger result + roller, return populated `criticalHits[]`, and emit `CriticalHit` + `CriticalHitResolved` + `ComponentDestroyed` events.
- **P4 — Heat & ammo events** — emit `HeatGenerated`, `HeatDissipated`, `HeatEffectApplied`, `ShutdownCheck`, `AmmoConsumed`, `AmmoExplosion` from `runHeatPhase()` and the weapon attack ammo branch.
- **P5 — MetricsCollector hydration** — populate `playerUnitsStart/End`, `opponentUnitsStart/End`, `totalDamageDealt` in `recordGame()` by parsing the now-typed event log.

### Test pyramid

- **P6 — Layered tests** authored against the now-typed engine:
  - **Unit tests (~60)**: per-layer atomic input→output. Hit-location 2d6 → location per arc (using MegaMek `Mek.innerRollHitLocation` at `Mek.java:1976-2034` as golden oracle). To-hit GATOR matrices. Critical threshold ladder (porting MegaMek's table at `TWGameManager.java:21564-21586`). Damage transfer chains. Heat math.
  - **Scenario tests (~8)**: scripted 5-turn fights asserting full event chain. Atlas-vs-Atlas mirror, Atlas-vs-Locust speed-stress, head-3-shot pilot KIA, ammo cook-off, gyro-crit fall, alpha-strike shutdown, quad arm-loss, partial-cover LOS.
  - **Monte Carlo (~4)**: distribution tests over 10K rolls each. Medium laser hit% at S/M/L vs gunnery-4 stationary target (analytic 2d6 CDF ±2σ). Hit-location histogram per arc. Critical-hit trigger rate at 10 structure damage. Ammo-explosion frequency at heat 19.

### Explicitly deferred (out of scope, follow-on changes)

- **`add-combat-fidelity-catalog-matrix`** — extend P1 hydration to all 4196 BattleMech catalog units; verify each weapon family handler (cluster tables for LRM/SRM/AC; ultra-AC jam; rotary-AC fire-modes; Gauss explosion; PPC capacitor; streak SRM lock).
- **`add-infantry-ba-damage-adapter`** — Infantry and Battle Armor combat shape (no per-location armor, platoon damage, swarm/leg-attack rules).
- **Aerospace combat handlers** — atmosphere/space movement, capital weapons, naval rules.
- **Specials** — TAG / iNarc / AMS / aimed shots / called shots / triple-strength myomer / MASC / supercharger heat / chameleon LPS / null-sig / void-sig / stealth armor.

## Dependencies

- **Builds on**: PR #514 (BV prewarm + `MAX_TURNS=100`) which is in CI at the time of authoring. P0's determinism work expands if PR #514 lands with regressions.
- **Reuses unchanged**: `src/utils/gameplay/hitLocation.ts` (already implements 2d6 location tables), `src/utils/gameplay/criticalHitResolution/resolver.ts` (already implements full slot-selection + component-effect pipeline), `src/utils/gameplay/damage/location.ts` (transfer chain), `src/utils/gameplay/pilotingSkillRolls/resolution.ts` (PSR batch resolver).
- **External reference**: MegaMek source at `E:/Projects/megamek/` is used as a *golden oracle* for hit-location and critical threshold tables only. No code is ported — typed events are emitted instead of MegaMek's `Vector<Report>` string side-channel.

## Impact

- **Affected specs**:
  - `simulation-system` — MODIFIED: deterministic D6 roller injection; event emission contract; per-unit-state hydration from catalog
  - `combat-resolution` — MODIFIED: critical hit wiring; weapon attack event lifecycle; heat/ammo event lifecycle
  - `combat-analytics` — MODIFIED: MetricsCollector populates from event log

- **Affected code**:
  - `src/simulation/runner/phases/weaponAttack.ts` — event emission expansion
  - `src/simulation/runner/phases/postCombat.ts` — heat event emission
  - `src/simulation/runner/SimulationRunnerSupport.ts:132` — catalog hydration
  - `src/utils/gameplay/damage/resolve.ts:61` — critical hit return capture
  - `src/utils/gameplay/damage/critical.ts:14` — roller injection
  - `src/utils/gameplay/criticalHitResolution/resolver.ts` — wire into runner
  - `src/simulation/core/SeededD6Roller.ts` (NEW)
  - `src/simulation/metrics/MetricsCollector.ts` — populate stub fields
  - Test files: `src/simulation/__tests__/combat-fidelity-*.test.ts` (new)

- **Risk**: 7-10 day estimate. The `MAX_TURNS=10` ceiling masked engine non-determinism (PR #514 exposed it). P0's deterministic-roller infrastructure may surface deeper non-determinism (`Date.now`, `Set` / `Map` iteration order, object-identity comparisons) that requires its own audit pass before the test pyramid can claim "reproducible." If P0's audit reveals non-dice non-determinism, P0 expands by 1-2 days and pushes the rest right.

## Non-Goals

- No new BattleTech rule implementation beyond what's needed to wire existing utilities into the runner. The `criticalHitResolution/`, `hitLocation`, and `damage/` modules already implement TT rules — this change only connects them.
- No MegaMek code port. References for golden-oracle tables only.
- No catalog matrix expansion beyond Atlas AS7-D in this change.
- No infantry / battle armor / aerospace combat.
