# Tasks: Implement Physical Attack Phase

## 0. Prerequisites

- [ ] 0.1 `fix-combat-rule-accuracy` merged (correct piloting, consciousness, and TMM math)
- [ ] 0.2 `integrate-damage-pipeline` merged (physical damage uses the same `resolveDamage` path as weapon hits)
- [ ] 0.3 `wire-firing-arc-resolution` merged (physical attacks read arc for hit-location table — this is especially important for kick resolution)
- [ ] 0.4 `wire-piloting-skill-rolls` merged (PSR triggers for hit/miss cascade into the queue this phase enqueues to)

## 1. Phase Skeleton

- [ ] 1.1 Replace the empty `GamePhase.PhysicalAttack` body in `GameEngine.phases.ts` with a full resolution function
- [ ] 1.2 Add a declaration step where each eligible unit may declare a physical attack
- [ ] 1.3 Add a restriction-validation step that rejects invalid declarations
- [ ] 1.4 Add a to-hit resolution step
- [ ] 1.5 Add a damage + PSR-trigger step
- [ ] 1.6 Advance phase after all physical attacks resolve

## 2. Declaration

- [ ] 2.1 Define `IPhysicalAttackDeclaration { attackerId, targetId, attackType, limb? }`
- [ ] 2.2 Support types: `Punch`, `Kick`, `Club`, `Charge`, `DFA`, `Push`
- [ ] 2.3 `limb` is required for Punch and Kick (which arm/leg)
- [ ] 2.4 Emit `PhysicalAttackDeclared` event

## 3. Restriction Validation (`physicalAttacks/restrictions.ts`)

- [ ] 3.1 An arm that fired a weapon this turn SHALL NOT punch
- [ ] 3.2 A leg that took a hip crit SHALL NOT kick
- [ ] 3.3 Punch requires lower arm + hand actuator intact (or at least one present)
- [ ] 3.4 Kick requires upper leg + foot actuator intact
- [ ] 3.5 Same limb SHALL NOT both kick and punch this turn
- [ ] 3.6 DFA requires the attacker jumped this turn
- [ ] 3.7 Charge requires the attacker ran this turn
- [ ] 3.8 Reject with `PhysicalAttackInvalid` and reason enum

## 4. Punch Resolution

- [ ] 4.1 To-hit base = piloting skill
- [ ] 4.2 Add actuator-damage modifiers (shoulder +4 if damaged; upper arm +1; lower arm +1)
- [ ] 4.3 Add target-movement modifier (TMM)
- [ ] 4.4 No range modifier (adjacent-only)
- [ ] 4.5 Damage = `ceil(attacker.weight / 10)`
- [ ] 4.6 Roll 1d6 on the punch hit-location table to select location
- [ ] 4.7 Feed damage through `resolveDamage`
- [ ] 4.8 Queue `PhysicalAttackTarget` PSR for the target (on hit)

## 5. Kick Resolution

- [ ] 5.1 To-hit base = piloting skill - 2
- [ ] 5.2 Add leg actuator modifiers (upper leg +1; lower leg +1; foot +1)
- [ ] 5.3 Add TMM
- [ ] 5.4 Damage = `floor(attacker.weight / 5)`
- [ ] 5.5 Roll 1d6 on the kick hit-location table
- [ ] 5.6 On hit: queue PSR for target (`PhysicalAttackTarget`)
- [ ] 5.7 On miss: queue PSR for attacker (`KickMiss`)

## 6. Charge Resolution

- [ ] 6.1 To-hit base = piloting skill + attacker-movement modifier
- [ ] 6.2 Damage to target = `ceil(attacker.weight / 10) × (hexesMoved - 1)` (min 1 cluster of 5)
- [ ] 6.3 Damage to attacker = `ceil(target.weight / 10)`
- [ ] 6.4 Both damages split into 5-point clusters
- [ ] 6.5 Roll hit-location for each cluster
- [ ] 6.6 On hit: queue PSR for both attacker and target
- [ ] 6.7 On miss: queue `MissedCharge` PSR for attacker

## 7. DFA Resolution

- [ ] 7.1 To-hit base = piloting skill
- [ ] 7.2 Damage to target = `ceil(attacker.weight / 10) × 3`
- [ ] 7.3 Damage to attacker legs = `ceil(attacker.weight / 5)` split among legs
- [ ] 7.4 5-point clusters for both
- [ ] 7.5 On hit: queue PSR for target; attacker fall roll per rules
- [ ] 7.6 On miss: queue `MissedDFA` PSR for attacker; attacker falls via `fallMechanics`

## 8. Push Resolution

- [ ] 8.1 To-hit base = piloting skill - 1
- [ ] 8.2 No damage
- [ ] 8.3 On hit: displace target 1 hex in the attacker's facing direction
- [ ] 8.4 Queue PSR for target (`PhysicalAttackTarget`)
- [ ] 8.5 If destination hex is invalid (off map / blocked), push fails with fall per rules

## 9. Club / Melee Weapons

- [ ] 9.1 Hatchet: damage = `floor(weight / 5)`, to-hit modifier per `physical-weapons-system`
- [ ] 9.2 Sword: damage = `floor(weight / 10) + 1`, to-hit -2
- [ ] 9.3 Mace: damage = `floor(weight / 4)`, to-hit +1
- [ ] 9.4 Lance: damage = `floor(weight / 5)`, doubled when charging
- [ ] 9.5 Requires intact lower arm + hand actuators
- [ ] 9.6 Feed through damage pipeline

## 10. Hit Location Tables (1d6)

- [ ] 10.1 Punch table (1d6): 1=LA, 2=LT, 3=CT, 4=RT, 5=RA, 6=Head (per TechManual)
- [ ] 10.2 Kick table (1d6): 1=RL, 2=RL, 3=LL, 4=LL, 5=RL, 6=LL (legs only per TechManual)
- [ ] 10.3 Tables in `hitLocation.ts` with seeded RNG

## 11. Bot Integration (phase driver + minimal behavior)

- [ ] 11.1 Add `BotPlayer.playPhysicalAttackPhase(unit, enemies, state)`
      that returns either a `IPhysicalAttackDeclaration` or `null`
      (skip) per bot-controlled unit. This mirrors the existing
      `playMovementPhase` / `playAttackPhase` contract in
      [src/engine/InteractiveSession.ts:255,290](src/engine/InteractiveSession.ts)
- [ ] 11.2 In `GameEngine.phases.ts`'s new Physical phase body, iterate
      bot-controlled units and append each returned declaration as a
      `PhysicalAttackDeclared` event before entering the resolution
      step. Without this, AI units never punch/kick during an
      `InteractiveSession` hot-seat or human-vs-AI match — the
      original Phase 1 roadmap gap
- [ ] 11.3 Bot decision logic (minimum viable): - declare a kick when adjacent to a prone or lower-BV target
      with legs still eligible per restrictions - declare a punch when adjacent and arms eligible and no
      friendlier option - SHALL NOT DFA or charge in this change (deferred to Lane C
      retreat/aggression spec) - SHALL use injected `SeededRandom` for any tie-breaking
- [ ] 11.4 Bot SHALL NOT crash the phase on empty-eligibility edge
      cases (no adjacent enemies, all limbs destroyed, etc.) — return
      `null` and advance cleanly
- [ ] 11.5 Unit test: two bot mechs adjacent to human mechs declare
      punches; phase resolves; damage applied; PSRs queued
- [ ] 11.6 Replay test: identical seed + identical board produces
      identical bot physical declarations

## 12. Per-Change Smoke Test

- [ ] 12.1 Fixture: 2 mechs adjacent, attacker intact, target at full armor, in Physical Attack phase
- [ ] 12.2 Action: attacker declares a Punch (Right Arm) via `PhysicalAttackDeclared`
- [ ] 12.3 Assert event stream in order: `PhysicalAttackDeclared { attackerId, targetId, attackType: 'Punch', limb: 'RightArm' }` → `PhysicalAttackResolved` (hit or miss) → on hit: `DamageApplied` → `PSRTriggered { triggerId: 'PhysicalAttackTarget' }`
- [ ] 12.4 Restriction fixture: attacker's right arm fired an LRM this turn. Declaring Punch (Right Arm) SHALL emit `AttackInvalid { reason: 'WeaponFiredThisTurn' }` and NOT emit `PhysicalAttackResolved`
- [ ] 12.5 Replay: same seed reproduces identical declare/resolve outcome

## 13. Validation

- [ ] 13.1 `openspec validate implement-physical-attack-phase --strict`
- [ ] 13.2 End-to-end test: punch from adjacent → hit → damage applied → target PSR queued
- [ ] 13.3 Kick miss test: attacker queues PSR; resolution next step may cause attacker fall
- [ ] 13.4 DFA hit test: attacker takes leg damage, target takes ×3 damage, both take PSR
- [ ] 13.5 Restriction test: arm that fired weapon cannot punch (rejected)
- [ ] 13.6 Build + lint clean
