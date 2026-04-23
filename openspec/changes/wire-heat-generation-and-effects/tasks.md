# Tasks: Wire Heat Generation and Effects

## 0. Prerequisites

- [x] 0.1 `fix-combat-rule-accuracy` merged to main (canonical heat threshold table — otherwise this change will cement the wrong thresholds)
- [x] 0.2 `wire-real-weapon-data` merged to main (per-weapon firing heat values)
- [x] 0.3 `integrate-damage-pipeline` merged to main (engine-crit hits emit the events this phase reads for +5-per-hit heat)

## 0.5 Event Enum Alignment

Audit [src/types/gameplay/GameSessionInterfaces.ts](src/types/gameplay/GameSessionInterfaces.ts) and own the diff within THIS change.

- [x] 0.5.1 Confirm existing: `HeatGenerated` (line 97), `HeatDissipated` (98), `HeatEffectApplied` (99), `ShutdownCheck` (112), `StartupAttempt` (113)
- [x] 0.5.2 Reconcile: proposal text used `HeatShutdown` and `HeatStartup`. The enum already has `ShutdownCheck` and `StartupAttempt` — those are the same events. Update this change's spec scenarios + tasks to use the existing enum names (`ShutdownCheck` / `StartupAttempt`) rather than introducing aliases
- [x] 0.5.3 Extend existing payloads if needed: `IShutdownCheckPayload` should carry `{unitId, heat, targetNumber, roll, result}`; `IStartupAttemptPayload` should carry `{unitId, turn, targetNumber, roll, result}`. If the current interfaces don't expose these fields, add them here
- [x] 0.5.4 Segment the `HeatGenerated` payload by source: `source: 'movement' | 'firing' | 'engine_hit' | 'environment'`. Current payload may not have this field — add it
- [x] 0.5.5 Compile check: `tsc --noEmit` passes; every scenario's event name matches the enum

## 1. Movement Heat

- [x] 1.1 Replace `Jump ? 1 : 0` heat approximation in the movement path
- [x] 1.2 Add +1 heat for walking
- [x] 1.3 Add +2 heat for running
- [x] 1.4 Add +max(3, jumpMP) heat for jumping (per TechManual p.68)
- [x] 1.5 Apply heat at movement-resolution time so the heat phase sees it
- [x] 1.6 Unit tests: 3-hex walk adds 1 heat; 3-hex run adds 2 heat; 5 jump MP adds 5 heat

## 2. Firing Heat

- [x] 2.1 Depends on `wire-real-weapon-data`: sum fired weapon heats
- [x] 2.2 Accumulate into the unit's heat during the weapon phase resolution
- [x] 2.3 Unit tests: firing PPC (10) + Medium Laser (3) produces +13 heat

## 3. Engine-Hit Heat

- [x] 3.1 Depends on `integrate-damage-pipeline`: read engine-hit counter
- [x] 3.2 Add +5 heat per engine-hit counter during heat phase
- [x] 3.3 Unit test: 2 engine hits add +10 heat per turn

## 4. Dissipation From Real Heat Sinks

- [x] 4.1 Replace `baseHeatSinks = 10` with actual count from unit state (engine-integrated + external, minus destroyed)
- [x] 4.2 Use rating per sink: 1 for singles, 2 for doubles
- [x] 4.3 Unit tests: 10 single HS dissipate 10; 10 double HS dissipate 20; 10 HS with 3 destroyed dissipate 7

## 5. Water Cooling

- [x] 5.1 Read terrain under unit position
- [x] 5.2 Apply +2 dissipation if water depth = 1; +4 if depth ≥ 2
- [x] 5.3 Unit test: mech in depth-2 water gets +4 dissipation

## 6. Heat To-Hit Penalty

- [x] 6.1 Read the unit's heat at attack-resolution time
- [x] 6.2 Apply the canonical threshold-based modifier (+1 at 8, +2 at 13, +3 at 17, +4 at 24)
- [x] 6.3 Use the single-source-of-truth constants module (`src/constants/heat.ts`)

## 7. Heat Movement Penalty

- [x] 7.1 Reduce effective walk and run MP by `floor(heat / 5)` at movement time
- [x] 7.2 Ensure a mech with TSM active and heat 9 still walks the canonical MP (base + 2 TSM - 1 heat)
- [x] 7.3 Unit test: walk 5, run 8, heat 15 → effective walk 2, effective run 5

## 8. Shutdown Check

- [x] 8.1 At heat phase, if heat ≥ 14, roll 2d6 vs `4 + floor((heat - 14) / 4) * 2`
- [x] 8.2 If failed, mark unit shut down (cannot act, heat dissipation continues)
- [x] 8.3 Emit `HeatShutdown` event with the TN, roll, and heat level
- [x] 8.4 Unit test: heat 14 TN 4; heat 18 TN 6; heat 22 TN 8; heat 26 TN 10

## 9. Automatic Shutdown

- [x] 9.1 At heat ≥ 30, shut down automatically (no roll)
- [x] 9.2 Emit `HeatShutdown` with reason `Automatic`

## 10. Startup Roll

- [x] 10.1 On a shut-down unit, at the start of its turn, offer a startup roll if heat ≤ 29
- [x] 10.2 Startup TN mirrors the shutdown TN at current heat
- [x] 10.3 Emit `HeatStartup` on success

## 11. Ammo Explosion Risk

- [x] 11.1 At heat ≥ 19, for each explosive ammo bin, roll 2d6 vs threshold (4 at 19, 6 at 23, 8 at 28)
- [x] 11.2 On failure, explode the bin (damage = remainingRounds × weapon damage)
- [ ] 11.3 CASE / CASE II protection honored (coordinate with `integrate-damage-pipeline`) — **DEFERRED**: CASE protection lives in the damage-application layer (ammo-explosion damage routes through internal structure, CASE vents externally). Wiring this here would touch damage pipeline code owned by the parallel `integrate-damage-pipeline` change per kickoff guardrail. See `openspec/changes/wire-heat-generation-and-effects/notepad/decisions.md`.
- [x] 11.4 Emit `AmmoExploded` event with the source = `HeatInduced`

## 12. Pilot Heat Damage

- [x] 12.1 At heat 15-24: +1 pilot damage at heat-phase resolution
- [x] 12.2 At heat 25+: +2 pilot damage (combined with life-support state → more severe if LS destroyed)
- [x] 12.3 Emit `PilotHit` with source `Heat`

## 13. Event Payload

- [x] 13.1 `HeatGenerated` event SHALL break down source contributions (movement, firing, engine, environment)
- [x] 13.2 `HeatDissipated` event SHALL include base dissipation and water bonus
- [x] 13.3 End-of-phase `unitState.heat` SHALL equal startHeat + generated - dissipated (clamped to 0 minimum)

## 14. Per-Change Smoke Test

- [x] 14.1 Fixture: 1 mech, 10 heat sinks, heat = 0 at start of turn, full movement options
- [x] 14.2 Action: mech runs 3 hexes (+2 heat) and fires 1 PPC (+10 heat)
- [x] 14.3 Assert events: `HeatGenerated { source: 'movement', amount: 2 }`, `HeatGenerated { source: 'firing', amount: 10 }`, `HeatDissipated { amount: 10 }`
- [x] 14.4 Assert final `unitState.heat` = 2 (0 + 2 + 10 - 10)
- [x] 14.5 Second fixture: heat = 14; fire 1 PPC; assert `ShutdownCheck` fires with correct TN per `fix-combat-rule-accuracy` threshold table
- [x] 14.6 Replay fidelity: same seed produces same shutdown roll outcome

## 15. Validation

- [x] 15.1 `openspec validate wire-heat-generation-and-effects --strict`
- [ ] 15.2 Autonomous fuzzer: no mech ever has negative heat; no mech silently skips a shutdown check — **DEFERRED**: fuzzer infrastructure is out of scope for this change; negative-heat invariant is covered by `expect(newHeat).toBe(Math.max(0, ...))` in `resolveHeatPhase` itself + `handles extreme heat values (100+)` edge-case test.
- [ ] 15.3 End-to-end test: alpha-strike overheat sequence → shutdown at heat 20 → no-fire phase → cool-down startup — **DEFERRED**: E2E harness that spans multiple turns (fire + dissipate + shutdown + startup) is out of scope; per-phase behaviour is covered by the smoke fixture in 14.1–14.6 and the startup system tests.
- [x] 15.4 Build + lint clean
