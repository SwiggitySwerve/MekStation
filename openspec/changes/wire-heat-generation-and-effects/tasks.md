# Tasks: Wire Heat Generation and Effects

## 1. Movement Heat

- [ ] 1.1 Replace `Jump ? 1 : 0` heat approximation in the movement path
- [ ] 1.2 Add +1 heat for walking
- [ ] 1.3 Add +2 heat for running
- [ ] 1.4 Add +max(3, jumpMP) heat for jumping (per TechManual p.68)
- [ ] 1.5 Apply heat at movement-resolution time so the heat phase sees it
- [ ] 1.6 Unit tests: 3-hex walk adds 1 heat; 3-hex run adds 2 heat; 5 jump MP adds 5 heat

## 2. Firing Heat

- [ ] 2.1 Depends on `wire-real-weapon-data`: sum fired weapon heats
- [ ] 2.2 Accumulate into the unit's heat during the weapon phase resolution
- [ ] 2.3 Unit tests: firing PPC (10) + Medium Laser (3) produces +13 heat

## 3. Engine-Hit Heat

- [ ] 3.1 Depends on `integrate-damage-pipeline`: read engine-hit counter
- [ ] 3.2 Add +5 heat per engine-hit counter during heat phase
- [ ] 3.3 Unit test: 2 engine hits add +10 heat per turn

## 4. Dissipation From Real Heat Sinks

- [ ] 4.1 Replace `baseHeatSinks = 10` with actual count from unit state (engine-integrated + external, minus destroyed)
- [ ] 4.2 Use rating per sink: 1 for singles, 2 for doubles
- [ ] 4.3 Unit tests: 10 single HS dissipate 10; 10 double HS dissipate 20; 10 HS with 3 destroyed dissipate 7

## 5. Water Cooling

- [ ] 5.1 Read terrain under unit position
- [ ] 5.2 Apply +2 dissipation if water depth = 1; +4 if depth ≥ 2
- [ ] 5.3 Unit test: mech in depth-2 water gets +4 dissipation

## 6. Heat To-Hit Penalty

- [ ] 6.1 Read the unit's heat at attack-resolution time
- [ ] 6.2 Apply the canonical threshold-based modifier (+1 at 8, +2 at 13, +3 at 17, +4 at 24)
- [ ] 6.3 Use the single-source-of-truth constants module (`src/constants/heat.ts`)

## 7. Heat Movement Penalty

- [ ] 7.1 Reduce effective walk and run MP by `floor(heat / 5)` at movement time
- [ ] 7.2 Ensure a mech with TSM active and heat 9 still walks the canonical MP (base + 2 TSM - 1 heat)
- [ ] 7.3 Unit test: walk 5, run 8, heat 15 → effective walk 2, effective run 5

## 8. Shutdown Check

- [ ] 8.1 At heat phase, if heat ≥ 14, roll 2d6 vs `4 + floor((heat - 14) / 4) * 2`
- [ ] 8.2 If failed, mark unit shut down (cannot act, heat dissipation continues)
- [ ] 8.3 Emit `HeatShutdown` event with the TN, roll, and heat level
- [ ] 8.4 Unit test: heat 14 TN 4; heat 18 TN 6; heat 22 TN 8; heat 26 TN 10

## 9. Automatic Shutdown

- [ ] 9.1 At heat ≥ 30, shut down automatically (no roll)
- [ ] 9.2 Emit `HeatShutdown` with reason `Automatic`

## 10. Startup Roll

- [ ] 10.1 On a shut-down unit, at the start of its turn, offer a startup roll if heat ≤ 29
- [ ] 10.2 Startup TN mirrors the shutdown TN at current heat
- [ ] 10.3 Emit `HeatStartup` on success

## 11. Ammo Explosion Risk

- [ ] 11.1 At heat ≥ 19, for each explosive ammo bin, roll 2d6 vs threshold (4 at 19, 6 at 23, 8 at 28)
- [ ] 11.2 On failure, explode the bin (damage = remainingRounds × weapon damage)
- [ ] 11.3 CASE / CASE II protection honored (coordinate with `integrate-damage-pipeline`)
- [ ] 11.4 Emit `AmmoExploded` event with the source = `HeatInduced`

## 12. Pilot Heat Damage

- [ ] 12.1 At heat 15-24: +1 pilot damage at heat-phase resolution
- [ ] 12.2 At heat 25+: +2 pilot damage (combined with life-support state → more severe if LS destroyed)
- [ ] 12.3 Emit `PilotHit` with source `Heat`

## 13. Event Payload

- [ ] 13.1 `HeatGenerated` event SHALL break down source contributions (movement, firing, engine, environment)
- [ ] 13.2 `HeatDissipated` event SHALL include base dissipation and water bonus
- [ ] 13.3 End-of-phase `unitState.heat` SHALL equal startHeat + generated - dissipated (clamped to 0 minimum)

## 14. Validation

- [ ] 14.1 `openspec validate wire-heat-generation-and-effects --strict`
- [ ] 14.2 Autonomous fuzzer: no mech ever has negative heat; no mech silently skips a shutdown check
- [ ] 14.3 End-to-end test: alpha-strike overheat sequence → shutdown at heat 20 → no-fire phase → cool-down startup
- [ ] 14.4 Build + lint clean
