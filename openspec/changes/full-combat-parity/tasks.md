## 0. Critical Bug Fixes

- [x] 0.1 Fix target prone modifier in `toHit.ts` — reverse values: adjacent target prone SHALL be -2 (easier), ranged target prone SHALL be +1 (harder). Ref: `calculateProneModifier()` lines 238-256
- [x] 0.2 Fix TMM formula in `toHit.ts` — replace `ceil(hexesMoved/5)` with canonical bracket table: 0-2→+0, 3-4→+1, 5-6→+2, 7-9→+3, 10-17→+4, 18-24→+5, 25+→+6. Ref: `calculateTMM()`
- [x] 0.3 Fix heat to-hit thresholds in `toHit.ts` — delete local `HEAT_THRESHOLDS` (5/8/13 are wrong), use canonical: +1@8, +2@13, +3@17, +4@24. Ref: heat-overflow-effects spec
- [x] 0.4 Fix consciousness check off-by-one in `damage.ts:461` — change `>` to `>=`
- [x] 0.5 Fix Weapon Specialist SPA modifier from -1 to -2 in `SpecialAbilities.ts:35`. Ref: spa-combat-integration spec
- [x] 0.6 Fix Sniper SPA mechanic — change from -1 at medium range to halving all positive range modifiers. Ref: spa-combat-integration spec
- [x] 0.7 Fix Jumping Jack SPA — change from piloting roll modifier to attacker jump movement modifier (+1 instead of +3). Ref: spa-combat-integration spec
- [x] 0.8 Fix life support `hitsToDestroy` from 1 to 2 in `CriticalHitSystem.ts`. Ref: critical-hit-system spec
- [x] 0.9 Reconcile duplicate cluster tables in `clusterWeapons.ts` — keep single authoritative copy matching MegaMek values
- [x] 0.10 Add missing cluster table columns for sizes 3, 7, 8, 9, 12. Ref: weapon-system spec
- [x] 0.11 Write tests for all Phase 0 fixes — verify each fix against MegaMek canonical values

## 1. Wire Real Weapon Data into Game Engine

- [x] 1.1 Replace hardcoded `damage = 5` in `gameSession.ts:resolveAttack()` (line 478) with actual weapon damage from `IWeaponData`
- [x] 1.2 Replace hardcoded `damage = 5` in `GameEngine.ts` auto-resolve with actual weapon damage
- [x] 1.3 Replace hardcoded `heat: 3` weapon heat with actual weapon heat values from `IWeaponData`
- [x] 1.4 Replace hardcoded range brackets `(3, 6, 9)` with per-weapon `shortRange`/`mediumRange`/`longRange` from `IWeaponData`
- [x] 1.5 Replace hardcoded `weapons.length * 10` heat generation in `resolveHeatPhase()` (line 585) with sum of actual weapon heat values
- [x] 1.6 Replace hardcoded `baseHeatSinks = 10` in `resolveHeatPhase()` (line 607) with actual unit heat sink count
- [x] 1.7 Wire `heat.ts:getWaterCoolingBonus()` into heat dissipation based on unit terrain position
- [x] 1.8 Fix movement heat calculation — replace current logic with walk=1, run=2, jump=max(3, jumpMP used)
- [x] 1.9 Make `hitLocation.ts` accept injectable `DiceRoller` parameter — replace `Math.random()` with seeded random
- [x] 1.10 Pass `IWeaponAttack` data through from attack declaration to resolution so damage/heat/range are available
- [x] 1.11 Write integration tests — verify weapon damage, heat, and range flow from declaration through resolution

## 2. Firing Arc Calculation

- [x] 2.1 Create `src/utils/gameplay/firingArc.ts` — implement `calculateFiringArc(attackerPos, targetPos, targetFacing)` returning `FiringArc` enum
- [x] 2.2 Implement hex coordinate math: determine relative hex direction from attacker to target, map against target facing to derive arc (front ±1, left +2, rear +3, right -2)
- [x] 2.3 Replace hardcoded `FiringArc.Front` in `resolveAttack()` (line 474) with computed firing arc
- [x] 2.4 Replace hardcoded `FiringArc.Front` in `GameEngine.ts` with computed firing arc
- [x] 2.5 Implement torso twist modifier — extend front arc by 1 hex-side in twist direction
- [x] 2.6 Write unit tests for all 4 arc directions with various hex positions and facings
- [x] 2.7 Write unit tests for torso twist arc extension

## 3. Wire Damage Pipeline

- [x] 3.1 Connect `damage.ts:resolveDamage()` into `gameSession.ts:resolveAttack()` — replace flat damage subtraction with full armor→structure→transfer pipeline
- [x] 3.2 Emit correct `DamageApplied` events with actual armor/structure values from `resolveDamage()` result
- [x] 3.3 Implement damage transfer chain in `applyDamageApplied()` reducer — arm damage transfers to side torso, side torso to CT
- [x] 3.4 Implement side torso destruction cascading to arm destruction — when side torso IS reaches 0, corresponding arm is destroyed
- [x] 3.5 Implement head-capping rule — max 3 damage to head from single standard weapon per hit
- [x] 3.6 Track `damageThisPhase` on `IUnitGameState` — accumulate damage per unit per phase for 20+ damage PSR trigger
- [x] 3.7 Connect `damage.ts` into `SimulationRunner.ts` — replace `applySimpleDamage()` with shared CombatResolver pipeline
- [x] 3.8 Write tests for full damage pipeline: armor absorption, structure penetration, transfer, side torso cascade, head cap

## 4. Extend IUnitGameState

- [x] 4.1 Add `IComponentDamageState` interface to `GameSessionInterfaces.ts` — engineHits, gyroHits, sensorHits, lifeSupport, cockpitHit, actuators (8 types), weaponsDestroyed, heatSinksDestroyed, jumpJetsDestroyed
- [x] 4.2 Add new fields to `IUnitGameState`: `componentDamage`, `prone`, `shutdown`, `ammoState`, `pendingPSRs`, `damageThisPhase`, `weaponsFiredThisTurn`
- [x] 4.3 Set default values in `createInitialUnitState()` — `prone: false`, `shutdown: false`, empty component damage, etc.
- [x] 4.4 Add new `GameEventType` values: `CriticalHitResolved`, `PSRTriggered`, `PSRResolved`, `UnitFell`, `PhysicalAttackDeclared`, `PhysicalAttackResolved`, `ShutdownCheck`, `StartupAttempt`, `AmmoConsumed`
- [x] 4.5 Add event payload interfaces for each new event type
- [x] 4.6 Add `applyEvent()` reducer cases for all new event types in `gameState.ts`
- [x] 4.7 Write tests for backward compatibility — existing saved games/replays still load with default values for new fields

## 5. Critical Hit Resolution

- [x] 5.1 Create `src/utils/gameplay/criticalHitResolution.ts` — pure function module
- [x] 5.2 Implement `rollCriticalHits(diceRoller)` — 2d6: 2-7=0 crits, 8-9=1, 10-11=2, 12=location-dependent
- [x] 5.3 Implement roll-of-12 location handling — limb: blown off, head: destroyed, torso: 3 crits
- [x] 5.4 Implement `selectCriticalSlot(unitState, location, diceRoller)` — random from occupied non-destroyed slots
- [x] 5.5 Build critical slot manifest from unit construction data at game start — map slots to component types per location
- [x] 5.6 Implement engine critical effects — +5 heat per hit, 3rd hit = destruction, emit events
- [x] 5.7 Implement gyro critical effects — +3 PSR modifier per hit, immediate PSR on hit, 2nd hit = automatic fall/destruction
- [x] 5.8 Implement cockpit critical effects — pilot killed
- [x] 5.9 Implement sensor critical effects — +1/+2 to-hit penalty
- [x] 5.10 Implement actuator critical effects for all 8 types: shoulder (cannot punch), upper arm (+2/halve damage), lower arm (+2/halve damage), hand (+1), hip (cannot kick), upper leg (+2/halve damage), lower leg (+2/halve damage), foot (+1)
- [x] 5.11 Implement weapon critical effects — mark weapon destroyed, remove from available weapons
- [x] 5.12 Implement heat sink critical effects — reduce total dissipation by 1 (single) or 2 (double)
- [x] 5.13 Implement jump jet critical effects — reduce max jump MP by 1
- [x] 5.14 Wire critical hit resolution into damage pipeline — trigger when internal structure exposed
- [x] 5.15 Implement Through-Armor Critical (TAC) processing — trigger on hit location roll of 2
- [x] 5.16 Write comprehensive tests for each component type's critical effects

## 6. Ammo System

- [x] 6.1 Create `src/utils/gameplay/ammoTracking.ts` — ammo bin state management
- [x] 6.2 Define `IAmmoSlotState` interface — binId, weaponType, location, remainingRounds, maxRounds, isExplosive
- [x] 6.3 Initialize ammo bin state from unit construction data at game start
- [x] 6.4 Implement `consumeAmmo(ammoState, weaponType, rounds)` — decrement rounds, emit `AmmoConsumed` event
- [x] 6.5 Implement weapon firing restriction — prevent firing weapons with 0 remaining ammo
- [x] 6.6 Implement ammo explosion from critical hit — damage = remainingRounds × damagePerRound, applied to IS at bin location
- [x] 6.7 Implement CASE protection — limit explosion to single location, no transfer, no pilot damage
- [x] 6.8 Implement CASE II protection — only 1 point transfers, no pilot damage
- [x] 6.9 Implement no-CASE behavior — damage transfers normally, pilot takes 1 damage
- [x] 6.10 Implement Clan omnimech default CASE in side torsos
- [x] 6.11 Implement Gauss rifle explosion on critical — 20 damage, no ammo dependency
- [x] 6.12 Wire ammo consumption into attack resolution — consume rounds when weapon fires
- [x] 6.13 Write tests for ammo tracking, consumption, explosion with/without CASE

## 7. Heat System Overhaul

- [x] 7.1 Consolidate heat thresholds into single source `constants/heat.ts` — delete wrong tables from `toHit.ts` and `HeatManagement.ts`
- [x] 7.2 Implement canonical to-hit penalties: cumulative +1 at heat 8, 13, 17, 24
- [x] 7.3 Implement heat movement penalties: `floor(heat/5)` MP reduction, apply in movement validation
- [x] 7.4 Implement shutdown checks in `resolveHeatPhase()` — heat ≥14, roll 2d6 vs `4+floor((heat-14)/4)*2`
- [x] 7.5 Implement automatic shutdown at heat ≥30 — no roll, immediate shutdown
- [x] 7.6 Implement shutdown state effects — unit cannot move/fire/act, can be targeted normally
- [x] 7.7 Implement PSR at TN 3 on shutdown (fall risk)
- [x] 7.8 Implement startup rolls at beginning of turn — same TN formula as shutdown
- [x] 7.9 Implement engine hit heat generation — +5 heat per engine critical hit per turn
- [x] 7.10 Implement heat-induced ammo explosion checks — heat ≥19: TN4, ≥23: TN6, ≥28: TN8, roll 2d6 ≥ TN to avoid
- [x] 7.11 Implement pilot heat damage — 1 point at heat 15-24, 2 points at heat 25+, requires life support damage
- [x] 7.12 Implement Hot Dog SPA interaction — +3 to shutdown threshold
- [x] 7.13 Write tests for all heat thresholds, shutdown/startup, ammo explosion checks, pilot damage

## 8. Piloting Skill Rolls & Fall Mechanics

- [x] 8.1 Create `src/utils/gameplay/pilotingSkillRolls.ts` — PSR resolution and trigger management
- [x] 8.2 Implement `resolvePSR(pilotingSkill, modifiers, diceRoller)` — 2d6 ≥ target = success, return `IPSRResult`
- [x] 8.3 Define `IPendingPSR` interface — entityId, reason, additionalModifier, triggerSource
- [x] 8.4 Implement PSR modifier stacking: gyro hits (+3 each), pilot wounds (+1 each), actuator damage (varies)
- [x] 8.5 Implement 20+ phase damage PSR trigger — check `damageThisPhase` at end of weapon attack phase
- [x] 8.6 Implement component damage PSR triggers — leg/hip actuator destroyed, gyro hit
- [x] 8.7 Implement physical attack PSR triggers — kicked/charged/DFA'd/pushed → target PSR
- [x] 8.8 Implement physical attack miss PSR triggers — kick miss → attacker PSR, DFA miss → attacker PSR(+4)
- [x] 8.9 Implement shutdown PSR — PSR at TN 3 on reactor shutdown
- [x] 8.10 Implement terrain PSR triggers — entering rubble, rough terrain while running, water entry/exit
- [x] 8.11 Create `src/utils/gameplay/fallMechanics.ts` — fall damage and prone management
- [x] 8.12 Implement fall damage: `ceil(weight/10) × (fallHeight+1)` applied in 5-point clusters to random hit locations
- [x] 8.13 Implement fall direction: D6 for new facing (0=front, 1-2=right, 3=rear, 4-5=left)
- [x] 8.14 Implement prone state: set `prone: true` on `IUnitGameState`, change facing per fall direction
- [x] 8.15 Implement pilot damage from fall: 1 point per fall, consciousness check
- [x] 8.16 Implement standing up: costs full walking MP, requires PSR, add to movement phase
- [x] 8.17 Implement first-failure-clears rule: first PSR failure causes fall, clear remaining PSRs for that entity
- [x] 8.18 Wire PSR resolution into end-of-phase processing — resolve all pending PSRs after weapon/physical phases
- [x] 8.19 Write tests for PSR resolution, all trigger types, fall damage, prone state, standing up

## 9. Physical Attack System

- [ ] 9.1 Create `src/utils/gameplay/physicalAttacks.ts` — physical attack calculations
- [ ] 9.2 Activate `GamePhase.PhysicalAttack` in phase sequence — add between WeaponAttack and Heat in `advancePhase()`
- [ ] 9.3 Implement punch attack: to-hit = piloting + actuator mods, damage = `ceil(weight/10)`, 1d6 punch hit table
- [ ] 9.4 Implement punch restrictions — cannot punch if arm fired weapon this turn, shoulder destroyed = impossible, requires arm
- [ ] 9.5 Implement kick attack: to-hit = piloting - 2 + actuator mods, damage = `floor(weight/5)`, 1d6 kick hit table
- [ ] 9.6 Implement kick target PSR on hit, attacker PSR on miss
- [ ] 9.7 Implement kick restrictions — cannot kick while prone, requires both legs, hip destroyed = impossible
- [ ] 9.8 Implement charge attack: to-hit = piloting + movement mods + skill differential, damage = `ceil(weight/10) × (hexesMoved-1)`
- [ ] 9.9 Implement charge — both attacker and target take damage, both make PSR
- [ ] 9.10 Implement DFA: to-hit = piloting + jump mods, target damage = `ceil(weight/10) × 3`, attacker leg damage = `ceil(weight/5)` per leg
- [ ] 9.11 Implement DFA — both make PSR, attacker PSR +4 on miss
- [ ] 9.12 Implement push attack: to-hit = piloting - 1, no damage, displace target 1 hex, target PSR
- [ ] 9.13 Implement melee weapon attacks: hatchet (-1, weight/5), sword (-2, weight/10+1), mace (+1, weight×2/5) with actuator requirements
- [ ] 9.14 Implement TSM double damage for weight-based physical attacks when heat 9+
- [ ] 9.15 Implement underwater halving for physical attack damage
- [ ] 9.16 Add physical attack AI decision logic to `BotPlayer` and `SimulationRunner`
- [ ] 9.17 Wire `PhysicalAttackDeclared`/`PhysicalAttackResolved` events and reducers
- [ ] 9.18 Write tests for all physical attack types: damage, to-hit, restrictions, PSR triggers

## 10. To-Hit Modifier Completion

- [x] 10.1 Add pilot wound penalties to `calculateToHit()` — +1 per wound from `IAttackerState.pilotWounds`
- [x] 10.2 Implement secondary target tracking and penalty — +1 front arc, +2 other arcs. Ref: secondary-target-tracking spec
- [x] 10.3 Add targeting computer modifier — -1 to-hit when `IAttackerState.targetingComputer` is true
- [x] 10.4 Add sensor damage modifier — +1 per sensor hit from `IAttackerState.sensorHits`
- [x] 10.5 Add actuator damage to-hit modifiers — shoulder +4, upper arm +1, lower arm +1 (cumulative)
- [x] 10.6 Add attacker prone modifier — +2 to-hit when attacker is prone
- [x] 10.7 Wire terrain modifiers into `calculateToHit()` — woods +1/+2 target-in-terrain, partial cover +1
- [x] 10.8 Add minimum range penalty — +1 per hex below weapon minimum range
- [x] 10.9 Add indirect fire modifier — +1 base, +1 if spotter walked. Ref: indirect-fire-system spec
- [x] 10.10 Add called shot modifier — +3 to-hit for called shots
- [x] 10.11 Extend `IAttackerState` with optional fields: `pilotWounds`, `sensorHits`, `actuatorDamage`, `targetingComputer`, `prone`, `secondaryTarget`
- [x] 10.12 Extend `ITargetState` with optional fields: `unitQuirks`, terrain data
- [x] 10.13 Write tests for each new modifier — verify values match MegaMek canonical

## 11. Pilot SPAs Combat Integration

- [x] 11.1 Add `abilities: readonly string[]` field to `IAttackerState` and `ITargetState`
- [x] 11.2 Create `src/utils/gameplay/spaModifiers.ts` — SPA combat effect calculator
- [x] 11.3 Implement gunnery SPA modifiers: Weapon Specialist (-2), Gunnery Specialist (-1/+1 by category), Blood Stalker (-1 designated/+2 others), Cluster Hitter (+1 column)
- [x] 11.4 Implement range SPA modifiers: Range Master (zeroes one bracket), Sniper (halves all range mods)
- [x] 11.5 Implement Multi-Tasker SPA — -1 to secondary target penalty
- [x] 11.6 Implement piloting SPA modifiers: Jumping Jack (+1 instead of +3 for jump attack), Melee Specialist (-1 physical to-hit)
- [x] 11.7 Implement defensive SPA modifiers: Dodge Maneuver (+2 to-hit when dodging — requires dodge action)
- [x] 11.8 Implement misc SPA modifiers: Tactical Genius (+1 initiative), Pain Resistance (ignore first wound penalty), Iron Man (-2 consciousness)
- [x] 11.9 Implement Edge trigger system — replace simple reroll with 6 specific mek triggers (head hit, TAC, KO, explosion, MASC, overheat)
- [x] 11.10 Wire `spaModifiers.ts` into `calculateToHit()` pipeline
- [x] 11.11 Add ~35 official SPAs to SPA catalog with correct MegaMek values
- [x] 11.12 Write tests for each SPA combat effect

## 12. Mech Quirks Combat Integration

- [ ] 12.1 Add `unitQuirks: readonly string[]` and `weaponQuirks: Record<string, readonly string[]>` to `IAttackerState`/`ITargetState`
- [ ] 12.2 Create `src/utils/gameplay/quirkModifiers.ts` — quirk combat effect calculator
- [ ] 12.3 Implement targeting quirks: Improved Targeting Short/Medium/Long (-1 at bracket), Poor Targeting (+1)
- [ ] 12.4 Implement defensive quirks: Distracting (+1 enemy to-hit), Low Profile (partial cover effect)
- [ ] 12.5 Implement piloting quirks: Easy to Pilot (-1 PSR terrain), Stable (-1 PSR), Hard to Pilot (+1 PSR), Unbalanced (+1 PSR terrain), Cramped Cockpit (+1 piloting)
- [ ] 12.6 Implement physical quirks: Battle Fist (+1 punch damage), No Arms (cannot punch), Low Arms (elevation restriction)
- [ ] 12.7 Implement initiative quirks: Command Mech (+1), Battle Computer (+2, not cumulative with Command Mech)
- [ ] 12.8 Implement combat quirks: Sensor Ghosts (+1 own attacks), Multi-Trac (eliminates front-arc secondary penalty)
- [ ] 12.9 Implement crit quirks: Rugged 1/2 (crit resistance), Protected Actuators (+1 enemy crit roll), Exposed Actuators (-1)
- [ ] 12.10 Implement weapon quirks: Accurate (-1), Inaccurate (+1), Stable Weapon (-1 running penalty), Improved/Poor/No Cooling (heat modifiers)
- [ ] 12.11 Add weapon quirk parsing from MTF/BLK files — per-weapon quirk storage
- [ ] 12.12 Wire `quirkModifiers.ts` into `calculateToHit()`, PSR resolution, initiative, and physical attack pipelines
- [ ] 12.13 Write tests for each quirk combat effect

## 13. Special Weapon Mechanics

- [ ] 13.1 Fix Ultra AC modeling — 2 independent to-hit rolls, independent hit locations, jam on natural 2
- [ ] 13.2 Fix Rotary AC modeling — 1-6 independent shots selected by pilot, independent to-hit/location, jam risk
- [ ] 13.3 Implement LB-X cluster/slug mode toggle — slug = standard AC, cluster = use cluster table for hits
- [ ] 13.4 Implement AMS — reduce incoming missile cluster hits, consume AMS ammo per intercept
- [ ] 13.5 Implement Artemis IV/V — +2 to cluster roll when equipped and linked to launcher
- [ ] 13.6 Implement Narc/iNarc beacon — +2 to missile attacks against marked target
- [ ] 13.7 Implement TAG designation — enables semi-guided LRM, standard LRM bonus
- [ ] 13.8 Implement MRM -1 cluster column modifier
- [ ] 13.9 Implement Streak SRM verification — confirm all-or-nothing behavior is correct
- [ ] 13.10 Write tests for each special weapon mechanic

## 14. ECM & Electronic Warfare

- [ ] 14.1 Create ECM bubble tracking — Guardian ECM 6-hex radius, Angel ECM, Clan ECM
- [ ] 14.2 Implement ECM effects — nullify Artemis, Narc, TAG, C3, active probes within bubble
- [ ] 14.3 Implement ECCM counter — one ECM counters another ECM
- [ ] 14.4 Implement stealth armor to-hit modifier — +1 medium, +2 long (requires Guardian ECM active)
- [ ] 14.5 Implement BAP/Beagle Active Probe counter — shorter range ECM countering
- [ ] 14.6 Write tests for ECM interactions

## 15. Indirect Fire

- [ ] 15.1 Implement LRM indirect fire mode — fire without LOS, requires spotter
- [ ] 15.2 Implement spotter mechanics — friendly unit with LOS to target, movement restriction (walking max)
- [ ] 15.3 Implement indirect fire to-hit penalty — +1 base, +1 if spotter walked
- [ ] 15.4 Implement semi-guided LRM with TAG designation
- [ ] 15.5 Write tests for indirect fire resolution

## 16. Environmental Modifiers

- [ ] 16.1 Implement light condition modifiers — night +2, dawn/dusk +1
- [ ] 16.2 Implement weather modifiers — rain +1/+2, fog +1/+2, snow +1
- [ ] 16.3 Implement wind effects — missile to-hit +1/+2, jump distance reduction
- [ ] 16.4 Implement gravity effects — scale fall damage and jump distance
- [ ] 16.5 Add environmental conditions to game configuration
- [ ] 16.6 Write tests for environmental modifier combinations

## 17. Simulation Runner Integration

- [ ] 17.1 Replace `SimulationRunner.applySimpleDamage()` with shared CombatResolver pipeline
- [ ] 17.2 Add physical attack AI decision logic to simulation — choose punch/kick/charge based on position and damage potential
- [ ] 17.3 Add PSR resolution to simulation loop — resolve pending PSRs at phase boundaries
- [ ] 17.4 Ensure all simulation randomness flows through `SeededRandom`
- [ ] 17.5 Verify simulation produces deterministic results with same seed
- [ ] 17.6 Write integration tests — full multi-turn simulation with all combat systems active

## 18. Final Validation

- [ ] 18.1 Run full test suite — ensure all existing tests still pass
- [ ] 18.2 Run LSP diagnostics on all modified files — zero errors
- [ ] 18.3 Verify build completes successfully
- [ ] 18.4 Run simulation comparison — same matchup with old vs new combat pipeline, verify results are more realistic
- [ ] 18.5 Spot-check 5 specific combat scenarios against MegaMek results for parity validation
