# Tasks: Add BattleArmor Combat Behavior

## 1. Unit-Type Dispatch

- [x] 1.1 Route `resolveDamage()` to `battleArmorResolveDamage()` when target is `IBattleArmorUnit`
- [x] 1.2 Route attack declaration for BA to handle squad fire (each trooper contributes its weapons)
- [x] 1.3 Route physical-attack declaration for BA to include leg/swarm/vibroclaw options
- [x] 1.4 Skip mech-style critical hits on BA (no crit slots)

## 2. BA Squad Combat State

- [x] 2.1 Initialize `unit.combatState.squad.troopers` as array length `squadSize`
- [x] 2.2 Per-trooper fields: `alive`, `armorRemaining`, `equipmentDestroyed[]`
- [x] 2.3 Squad-wide fields: `swarmingUnitId?`, `legAttackCommitted?`, `mimeticActiveThisTurn`

## 3. Squad Damage Distribution

- [x] 3.1 On hit, roll cluster-hits table with cluster-size = squadSize
- [x] 3.2 Each hit lands on a random surviving trooper (seeded RNG)
- [x] 3.3 Damage to a trooper reduces `armorRemaining`; when ≤ 0 the trooper is killed and next hits bypass them
- [x] 3.4 When all troopers dead, emit `SquadEliminated`
- [x] 3.5 Emit `TrooperKilled` per casualty

## 4. Squad Fire Resolution

- [x] 4.1 When squad fires, number of attack dice = surviving troopers
- [x] 4.2 Weapon BV / damage scales with surviving count
- [x] 4.3 Heat exemption (BA has no heat)

## 5. Anti-Mech Leg Attack

- [x] 5.1 BA in base contact with a Mech may declare Leg Attack
- [x] 5.2 Roll 2d6 + BA piloting vs Mech piloting + 4 (TW)
- [x] 5.3 Success: damage to target leg = 4 × surviving troopers
- [x] 5.4 Failure: BA squad takes 1d6 damage (distributed)
- [x] 5.5 Emit `LegAttack` event with success/failure

## 6. Anti-Mech Swarm Attack

- [x] 6.1 BA with Magnetic Clamps in base contact may declare Swarm
- [x] 6.2 Roll 2d6 + BA piloting vs Mech piloting + 4
- [x] 6.3 Success: `swarmingUnitId` set; emit `SwarmAttached`
- [x] 6.4 Each subsequent turn: squad deals 1d6 + surviving troopers damage to random location on attached mech
- [x] 6.5 Attached mech may dismount: Piloting skill roll vs TN 8; success = BA takes 2d6 + dismounts; failure = nothing
- [x] 6.6 Attached mech may also damage attacker location at -1 penalty: sends 1 weapon back at self

## 7. Mimetic / Stealth Armor

- [x] 7.1 Mimetic: attacker +1 to-hit when squad is stationary (didn't move this turn)
- [x] 7.2 Basic Stealth: attacker +1 to-hit at any range
- [x] 7.3 Improved Stealth: attacker +2 short/medium, +3 long
- [x] 7.4 Prototype Stealth: TW rules (+1)
- [x] 7.5 Emit `MimeticBonus` / `StealthBonus` events for audit

## 8. Vibro-Claw Physical Attack

- [x] 8.1 BA with Vibro-Claws can declare Vibro-Claw Attack in physical phase
- [x] 8.2 Damage = 1 + (0.5 × surviving troopers) rounded up per claw
- [x] 8.3 Can target mech, vehicle, or ProtoMech

## 9. Per-Location Hit Distribution on BA

- [x] 9.1 No location on a trooper — armor is flat pool per trooper
- [x] 9.2 Cluster attacks treat squad as cluster table input (squadSize rolls against table)
- [x] 9.3 Area-effect weapons (Inferno) apply to all alive troopers equally
- [x] 9.4 Flamer damage doubles per TW anti-BA rule (2× per infantry-like unit)

## 10. AI Adaptations — DEFERRED

> Deferred to Wave 5 (bot AI orchestration). Same pattern Wave 3 used for vehicle/aerospace
> AI: combat behavior layer lands first, bot heuristics layer comes after GameEngine wiring.

- [ ] 10.1 Bot moves BA into melee range if Magnetic Clamps present
- [ ] 10.2 Bot avoids BA-on-BA engagements; uses ranged if no clamps
- [ ] 10.3 Bot prioritizes slow / immobilized mechs for swarm

## 11. Validation

- [ ] 11.1 `openspec validate add-battlearmor-combat-behavior --strict` — pre-existing repo-wide failures noted in task prompt; not addressed here
- [ ] 11.2 Simulation tests: BA squad vs single mech, mech vs BA squad, BA vs BA — DEFERRED (blocked on GameEngine wiring, same pattern as Wave 3)
- [x] 11.3 Unit tests for squad damage distribution, swarm/leg/vibroclaw flows
- [x] 11.4 Build + lint clean
