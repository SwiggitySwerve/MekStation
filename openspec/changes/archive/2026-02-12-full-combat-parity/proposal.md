## Why

MekStation's combat system is at approximately 15-20% parity with MegaMek. The game engine has hardcoded `damage = 5` for all weapons, always uses `FiringArc.Front`, and bypasses the sophisticated `damage.ts` module entirely. Critical hits never resolve, physical attacks don't exist, piloting skill rolls are unimplemented, and the heat system has three contradicting threshold tables — all wrong. The target prone modifier is reversed, the TMM formula diverges from the canonical bracket table, and 16 pilot SPAs are defined but none are wired into combat. Until these gaps are addressed, MekStation cannot deliver meaningful BattleMech combat simulation.

## What Changes

### Phase 0: Critical Bug Fixes

- **BREAKING**: Fix target prone modifier (currently reversed: adjacent=+1/range=-2, should be adjacent=-2/range=+1)
- **BREAKING**: Fix TMM formula — replace `ceil(hexesMoved/5)` with canonical bracket table (3-4→+1, 5-6→+2, 7-9→+3, 10-17→+4, 18-24→+5, 25+→+6)
- **BREAKING**: Unify heat threshold system — delete wrong `toHit.ts` thresholds (5/8/13), adopt MegaMek canonical: 8→+1, 13→+2, 17→+3, 24→+4
- Fix consciousness check off-by-one (`>` should be `>=` in `damage.ts:461`)
- Fix Weapon Specialist SPA value (-1 should be -2)
- Fix Sniper SPA mechanic (should halve all range mods, not just -1 at medium)
- Fix Jumping Jack SPA (should affect attacker to-hit, not piloting roll)
- Reconcile duplicate cluster tables (two copies with different wrong values)
- Fix life support `hitsToDestroy` (should be 2, not 1)

### Phase 1: Wire Real Weapon Data into Game Engine

- Replace all `damage: 5` hardcoding with actual weapon damage values from `IWeaponData`
- Replace all `heat: 3` hardcoding with actual weapon heat values
- Replace hardcoded range brackets `(3, 6, 9)` with actual per-weapon ranges
- Compute firing arc from attacker position relative to target facing (replace `FiringArc.Front`)
- Wire actual heat sink count into dissipation (replace `baseHeatSinks = 10`)
- Wire actual weapon heat into heat generation (replace `weapons.length * 10`)
- Fix movement heat (replace `Jump ? 1 : 0` with walk=1/run=2/jump=max(3,jumpMP))
- Wire water cooling bonus into heat dissipation
- Make `hitLocation.ts` accept a seeded random source (replace `Math.random()`)

### Phase 2: Wire Damage Pipeline

- Connect `damage.ts` `resolveDamage()` into `gameSession.ts` attack resolution
- Connect `damage.ts` into `SimulationRunner.ts` (replace `applySimpleDamage()`)
- Use computed firing arc for hit location determination
- Enable armor→structure→transfer→pilot damage pipeline
- Implement side torso destruction cascading to arm destruction
- Implement 20+ phase damage PSR trigger
- Implement head-capping rule (max 3 damage to head from single standard weapon)

### Phase 3: Critical Hit Resolution

- Implement critical slot selection (random from occupied non-destroyed slots)
- Implement critical effects by component type: engine (+5 heat, 3 hits=destruction), gyro (+3 piloting, 2 hits=fall/destruction), cockpit (pilot killed), sensors (+1/+2 to-hit), actuators (7 distinct types with different penalties), weapons (destroyed), heat sinks (reduced dissipation), jump jets (reduced MP), ammo (explosion)
- Wire Through-Armor Critical (TAC) processing when `isCritical` flag is set
- Make roll of 12 location-dependent (limb=blown off, head=blown off, torso=3 crits)
- Differentiate actuator types (shoulder, upper arm, lower arm, hand, hip, upper leg, lower leg, foot)

### Phase 4: Ammo System Integration

- Implement ammo consumption per weapon firing
- Implement ammo explosion from critical hits (rounds × damage applied to IS)
- Implement CASE mechanics (limits explosion to single location, no transfer)
- Implement CASE II (1 point transferred, no pilot damage)
- Implement heat-induced ammo explosion checks (heat ≥19, roll vs threshold table)
- Implement Gauss rifle explosion on critical hit (20 damage)
- Handle Clan omnimech default CASE

### Phase 5: Heat System Overhaul

- Consolidate to single source of truth for heat effects
- Implement canonical heat-to-hit penalties: cumulative +1 at heat 8, 13, 17, 24
- Implement heat movement penalties: `floor(heat/5)` MP reduction
- Implement shutdown checks: heat ≥14, roll 2d6 vs `4+floor((heat-14)/4)*2`
- Implement automatic shutdown at heat 30+
- Implement startup rolls
- Implement engine hit heat (+5 per critical)
- Implement pilot heat damage (1 at heat 15-24, 2 at heat 25+ with life support damage)

### Phase 6: Piloting Skill Rolls (PSR) & Fall Mechanics

- Implement PSR resolution (2d6 ≥ piloting skill + modifiers)
- Implement 26 PSR triggers: 20+ damage, leg/hip/gyro damage, physical attack hits, kick/DFA/charge miss, terrain, skidding, water, MASC/supercharger failure, shutdown, getting up
- Implement PSR modifiers: gyro damage (+3 per hit), pilot wounds (+1 per), actuator damage, terrain
- Implement fall damage: `round(tonnage/10) × (fallHeight+1)` in 5-point clusters
- Implement fall direction (D6 for facing), prone state tracking
- Implement pilot damage from falls (1 per fall)
- Implement standing up (costs walking MP, requires PSR)

### Phase 7: Physical Attack System

- Add physical attack phase after weapon attack phase
- Implement punch: to-hit=piloting+actuator mods, damage=`ceil(tonnage/10)`, 1d6 punch table
- Implement kick: to-hit=piloting-2+actuator mods, damage=`floor(tonnage/5)`, 1d6 kick table
- Implement charge: to-hit=piloting+movement mods, damage=`ceil(tonnage/10)×(hexesMoved-1)`
- Implement DFA: to-hit=piloting, target damage=`ceil(tonnage/10)×3`, attacker leg damage=`ceil(tonnage/5)`
- Implement push: to-hit=piloting-1, no damage, displace target
- Implement melee weapons: hatchet (-1, tonnage/5), sword (-2, tonnage/10+1), mace (+1, tonnage×2/5)
- Wire PSR triggers for physical attack hit/miss

### Phase 8: To-Hit Modifier Completion

- Add pilot wound penalties (+1 per wound)
- Add secondary target tracking and penalty (+1 front arc, +2 rear arc)
- Add targeting computer modifier (-1)
- Add sensor damage modifier (+1/+2 per hit)
- Add actuator damage modifiers (shoulder +4, upper/lower arm +1 each)
- Add indirect fire / LRM spotter mechanics
- Add attacker prone modifier (+2)
- Wire terrain modifiers into `calculateToHit()` (function exists but not called)
- Add called shots (+3)
- Add ECM/ECCM system
- Add night/weather modifiers
- Add stealth armor modifiers

### Phase 9: Pilot SPAs & Mech Quirks

- Fix 4 SPAs with wrong values/mechanics (Weapon Specialist, Sniper, Jumping Jack, Evasive)
- Wire existing 16 SPAs into combat pipeline (currently none affect combat)
- Add ~35 missing official SPAs: Blood Stalker, Gunnery Specialist, Range Master, Dodge Maneuver, Melee Specialist/Master, Environmental Specialist, Forward Observer, Edge trigger system
- Wire existing parsed quirks into combat (quirks are parsed from MTF/BLK but only used for maintenance)
- Wire targeting quirks: Improved/Poor Targeting (±1 per range bracket)
- Wire piloting quirks: Easy/Hard to Pilot (±1), Stable (-1), Unbalanced (+1)
- Wire initiative quirks: Command Mech (+1), Battle Computer (+2)
- Wire weapon quirks: Accurate/Inaccurate (±1 to-hit), Stable Weapon (-1 running penalty)
- Add weapon quirk parsing from MTF/BLK (currently absent)
- Extend `IAttackerState` and `ITargetState` with abilities/quirks fields

### Phase 10: Special Weapon Mechanics

- Fix Ultra AC (model as independent shots, not cluster; add jam on roll of 2)
- Fix Rotary AC (1-6 independent shots, not cluster; add jam)
- Add LB-X slug/cluster mode toggle
- Implement AMS (reduce incoming missile hits)
- Implement Artemis IV/V (+2 to cluster roll)
- Implement Narc/iNarc target marking (+2 missile attacks)
- Implement TAG designation for semi-guided LRMs
- Add MRM -1 column modifier for cluster
- Add missing cluster table columns (3, 7, 8, 9, 12)

## Capabilities

### New Capabilities

- `critical-hit-resolution`: Full critical slot selection, effect application per component type, TAC processing, and cascade effects (engine/gyro/cockpit/sensors/actuators/weapons/ammo/heat sinks/jump jets)
- `piloting-skill-rolls`: PSR resolution mechanic, 26 trigger conditions, modifier stacking, automatic fall triggers
- `fall-mechanics`: Fall damage calculation, fall direction, prone state management, standing-up rules, pilot damage from falls
- `physical-attack-system`: Physical attack phase, punch/kick/charge/DFA/push attacks with damage formulas, hit location tables, actuator restrictions, melee weapons
- `ammo-tracking`: Ammo consumption per weapon firing, ammo bin state management, infinite-ammo prevention
- `ammo-explosion-system`: Critical-hit-triggered and heat-induced ammo explosions, CASE/CASE II protection, damage calculation and application
- `shutdown-startup-system`: Heat-induced shutdown checks, automatic shutdown at 30+ heat, startup rolls, shutdown state effects
- `firing-arc-calculation`: Compute attacker-relative firing arc from positions and facings, enable rear/side hit location tables
- `ecm-electronic-warfare`: ECM/ECCM effects on targeting, Artemis, Narc, C3 systems
- `indirect-fire-system`: LRM indirect fire mode, spotter mechanics, spotter movement penalties
- `environmental-combat-modifiers`: Night/weather/planetary condition combat modifiers
- `spa-combat-integration`: Wire pilot special abilities into to-hit, damage, PSR, heat, and initiative pipelines
- `quirk-combat-integration`: Wire unit quirks into to-hit, damage, PSR, heat, and initiative pipelines; add weapon quirk parsing
- `secondary-target-tracking`: Primary/secondary target designation, multi-target penalties

### Modified Capabilities

- `combat-resolution`: Fix hardcoded damage=5, wire real weapon data, connect damage.ts pipeline, add physical attack phase
- `damage-system`: Fix consciousness check, enable armor→structure→transfer chain, add head cap rule, add side torso→arm cascade, connect to game engine
- `critical-hit-system`: Activate dead-code types, add slot selection, differentiate actuator types, fix life support hitsToDestroy
- `heat-management-system`: Consolidate three contradicting systems, adopt MegaMek canonical thresholds, wire generation/dissipation, add movement penalties
- `heat-overflow-effects`: Add shutdown/startup mechanics, ammo explosion risk, pilot heat damage
- `movement-system`: Add heat MP reduction, terrain PSR triggers, prone/standing-up movement costs
- `simulation-system`: Replace `applySimpleDamage()` with full damage pipeline, add physical attack AI, add PSR resolution
- `weapon-system`: Add per-weapon range from actual data (not hardcoded), add cluster table corrections, fix UAC/RAC modeling
- `terrain-system`: Wire existing terrain modifiers into to-hit calculation (function exists but uncalled)
- `skills-system`: Fix SPA values (Weapon Specialist, Sniper, Jumping Jack), add official SPAs, wire into combat
- `physical-weapons-system`: Implement actual physical weapon damage formulas and to-hit calculations

## Impact

### Critical Files Requiring Modification

- `src/game/gameSession.ts` — Replace hardcoded damage/arc/heat, wire damage.ts pipeline
- `src/engine/GameEngine.ts` — Replace all hardcoded weapon values, add physical attack phase
- `src/utils/gameplay/toHit.ts` — Fix heat thresholds, fix prone, fix TMM, add ~50 modifiers, add SPA/quirk hooks
- `src/utils/gameplay/damage.ts` — Fix consciousness check, connect to game engine, add crit slot selection
- `src/utils/gameplay/hitLocation.ts` — Accept seeded random, implement punch/kick table stubs
- `src/types/validation/CriticalHitSystem.ts` — Differentiate actuators, fix life support, wire into game
- `src/constants/heat.ts` — Consolidate as single source of truth
- `src/types/validation/HeatManagement.ts` — Fix thresholds to match MegaMek canonical values
- `src/utils/gameplay/clusterWeapons.ts` — Fix values, add missing columns, fix UAC/RAC modeling
- `src/simulation/runner/SimulationRunner.ts` — Wire full damage pipeline, add physical attacks

### New Modules Required

- `src/utils/gameplay/criticalHitResolution.ts` — Slot selection, effect application
- `src/utils/gameplay/pilotingSkillRolls.ts` — PSR triggers, resolution, modifier stacking
- `src/utils/gameplay/fallMechanics.ts` — Fall damage, direction, prone management
- `src/utils/gameplay/physicalAttacks.ts` — Punch/kick/charge/DFA/push calculations
- `src/utils/gameplay/ammoTracking.ts` — Ammo consumption and explosion handling
- `src/utils/gameplay/firingArc.ts` — Arc calculation from positions/facings
- `src/utils/gameplay/spaModifiers.ts` — SPA combat effect calculations
- `src/utils/gameplay/quirkModifiers.ts` — Quirk combat effect calculations

### API/Interface Changes

- `IAttackerState` — Add `abilities`, `unitQuirks`, `weaponQuirks` fields
- `ITargetState` — Add `unitQuirks`, `prone` state tracking
- `IUnitGameState` — Add ammo tracking, component damage state, shutdown state, prone state
- `IWeaponAttack` — Use real weapon data instead of hardcoded values

### Dependencies

- No new external dependencies required
- All data already exists in MekStation's type system or MegaMek reference repos
- Cross-references MegaMek Java source at `E:\Projects\megamek\` for canonical values
