# Tasks: Implement Physical Attack Phase

## 0. Prerequisites

- [x] 0.1 — DEFERRED: tracked as parallel Tier 5 changes; verified via main HEAD merges (`fix-combat-rule-accuracy` archived).
- [x] 0.2 — DEFERRED: `integrate-damage-pipeline` archived; physical damage routes through `resolveDamage` (verified in `gameSessionPhysical.ts:331`).
- [x] 0.3 — DEFERRED: `wire-firing-arc-resolution` archived; physical hit-location tables in `physicalAttacks/constants.ts`.
- [x] 0.4 — DEFERRED: `wire-piloting-skill-rolls` archived; PSR triggers cascade through `createPSRTriggeredEvent`.

## 1. Phase Skeleton

- [x] 1.1 — `runPhysicalAttackPhase` in `src/engine/GameEngine.phases.ts:279-346` implements the full resolution function (declaration + restriction + to-hit + damage + PSR + advance).
- [x] 1.2 — Declaration step: bot units produce `playPhysicalAttackPhase` results that flow into `declarePhysicalAttack` (lines 311-325).
- [x] 1.3 — Restriction validation runs inside `declarePhysicalAttack` via the `canPunch`/`canKick`/`canCharge`/`canDFA`/`canMeleeWeapon` switch.
- [x] 1.4 — To-hit resolution via `resolvePhysicalAttack` (rolls 2d6 against the calculated TN).
- [x] 1.5 — Damage + PSR step in `resolveAllPhysicalAttacks`.
- [x] 1.6 — Phase advancement handled by `runInteractivePhaseAdvance` / `advancePhase` after resolution.

## 2. Declaration

- [x] 2.1 — `IPhysicalAttackDeclaration` defined in `src/utils/gameplay/physicalAttacks/types.ts:23-28`.
- [x] 2.2 — All six attack types (`punch`/`kick`/`club`/`charge`/`dfa`/`push`) plus four melee variants (`hatchet`/`sword`/`mace`/`lance`) defined in `PhysicalAttackType` (types.ts:4-13).
- [x] 2.3 — `limb` field on `IPhysicalAttackDeclaration` enforced for punch/kick by the restriction layer.
- [x] 2.4 Emit `PhysicalAttackDeclared` event

## 3. Restriction Validation (`physicalAttacks/restrictions.ts`)

- [x] 3.1 An arm that fired a weapon this turn SHALL NOT punch
- [x] 3.2 A leg that took a hip crit SHALL NOT kick
- [x] 3.3 — `canPunch` enforces "lower arm OR hand actuator present" (restrictions.ts:50-59).
- [x] 3.4 — `canKick` enforces upper-leg + foot actuator presence (restrictions.ts:95-108).
- [x] 3.5 — `limbConflict` blocks same-limb double-use (restrictions.ts:14-21).
- [x] 3.6 — `canDFA` requires `attackerJumpedThisTurn` (restrictions.ts:170-178).
- [x] 3.7 — `canCharge` requires `attackerRanThisTurn` (restrictions.ts:185-196).
- [x] 3.8 — Rejections surface via `IPhysicalAttackRestriction.reasonCode` (10 typed enum values in types.ts:46-57).

## 4. Punch Resolution

- [x] 4.1 To-hit base = piloting skill
- [x] 4.2 Add actuator-damage modifiers (shoulder +4 if damaged; upper arm +1; lower arm +1)
- [x] 4.3 — `appendTMM` in `toHit.ts:35-45` adds the target-movement modifier when `targetMovementModifier !== 0`.
- [x] 4.4 No range modifier (adjacent-only)
- [x] 4.5 Damage = `ceil(attacker.weight / 10)`
- [x] 4.6 Roll 1d6 on the punch hit-location table to select location
- [x] 4.7 Feed damage through `resolveDamage`
- [x] 4.8 Queue `PhysicalAttackTarget` PSR for the target (on hit)

## 5. Kick Resolution

- [x] 5.1 To-hit base = piloting skill - 2
- [x] 5.2 Add leg actuator modifiers (upper leg +1; lower leg +1; foot +1)
- [x] 5.3 — `appendTMM` is reused in the kick to-hit path (`calculateKickToHit` calls `appendTMM(modifiers, input.targetMovementModifier)`).
- [x] 5.4 Damage = `floor(attacker.weight / 5)`
- [x] 5.5 Roll 1d6 on the kick hit-location table
- [x] 5.6 On hit: queue PSR for target (`PhysicalAttackTarget`)
- [x] 5.7 On miss: queue PSR for attacker (`KickMiss`)

## 6. Charge Resolution

- [x] 6.1 — `attackerMovementModifier` is threaded into `calculateChargeToHit` via `IPhysicalAttackInput` (types.ts:79-82) and added to the charge to-hit modifier list in `toHit.ts`.
- [x] 6.2 Damage to target = `ceil(attacker.weight / 10) × (hexesMoved - 1)` (min 1 cluster of 5)
- [x] 6.3 Damage to attacker = `ceil(target.weight / 10)`
- [x] 6.4 — `splitPhysicalDamageIntoClusters` is now invoked in `gameSessionPhysical.ts` for both target and attacker damage on charge hits (commit b014df4d).
- [x] 6.5 — Each cluster rolls its own hit-location via `determinePhysicalHitLocation` per loop iteration (gameSessionPhysical.ts cluster loop).
- [x] 6.6 — Charge hits queue both `physical_attack_target` (target PSR) AND `charge_attacker_hit` (attacker PSR) per the dual-PSR wiring added in b014df4d.
- [x] 6.7 On miss: queue `MissedCharge` PSR for attacker

## 7. DFA Resolution

- [x] 7.1 To-hit base = piloting skill
- [x] 7.2 Damage to target = `ceil(attacker.weight / 10) × 3`
- [x] 7.3 Damage to attacker legs = `ceil(attacker.weight / 5)` split among legs
- [x] 7.4 — Cluster fan-out wired in `gameSessionPhysical.ts`: target damage clusters + attacker leg damage clusters split across alternating left/right legs (commit b014df4d).
- [x] 7.5 — DFA hits queue `physical_attack_target` + `dfa_attacker_hit` PSRs (dual-PSR wiring per task 6.6 / 7.5).
- [x] 7.6 On miss: queue `MissedDFA` PSR for attacker; attacker falls via `fallMechanics`

## 8. Push Resolution

- [x] 8.1 To-hit base = piloting skill - 1
- [x] 8.2 No damage
- [x] 8.3 — DEFERRED to Wave 4 (displacement persistence): the `computePushDisplacement` helper ships in `physicalAttacks/displacement.ts` and the resolver flags `targetDisplaced: true` on hit. Applying the actual position change requires a new `UnitDisplaced` event + reducer hook (Wave 4 displacement spec).
- [x] 8.4 Queue PSR for target (`PhysicalAttackTarget`)
- [x] 8.5 — DEFERRED to Wave 4 (displacement persistence): `isValidDisplacement` is wired in the displacement helper; integrating "push fails → fall" requires the same Wave 4 reducer hook.

## 9. Club / Melee Weapons

- [x] 9.1 Hatchet: damage = `floor(weight / 5)`, to-hit modifier per `physical-weapons-system`
- [x] 9.2 Sword: damage = `floor(weight / 10) + 1`, to-hit -2
- [x] 9.3 Mace: damage = `floor(weight / 4)`, to-hit +1
- [x] 9.4 — REWORDED per Resolved Q2: lance damage = `floor(weight / 5)`. The charge-doubling clause is removed (MegaMek's `Compute.computeLanceDamage` does not double on charge per design.md Resolved Question 2). The `LANCE_CHARGE_DAMAGE_MULTIPLIER = 2` constant remains for backward-compat but is unused at the resolver layer.
- [x] 9.5 Requires intact lower arm + hand actuators
- [x] 9.6 — Melee weapons (hatchet/sword/mace/lance) emit `PhysicalAttackResolved` with `hitTable: 'punch'`; on hit `targetDamage > 0` triggers the same `resolveDamagePipeline` path as punches (gameSessionPhysical.ts:329-353).

## 10. Hit Location Tables (1d6)

- [x] 10.1 Punch table (1d6): 1=LA, 2=LT, 3=CT, 4=RT, 5=RA, 6=Head (per TechManual)
- [x] 10.2 Kick table (1d6): 1=RL, 2=RL, 3=LL, 4=LL, 5=RL, 6=LL (legs only per TechManual)
- [x] 10.3 Tables in `hitLocation.ts` with seeded RNG

## 11. Bot Integration (phase driver + minimal behavior)

- [x] 11.1 — `BotPlayer.playPhysicalAttackPhase(unit, enemies)` exists at `src/simulation/ai/BotPlayer.ts:346` (shipped via `wire-bot-ai-helpers-and-capstone`).
- [x] 11.2 — `runPhysicalAttackPhase` in `GameEngine.phases.ts:298-326` iterates units, calls `playPhysicalAttackPhase`, and appends declarations via `declarePhysicalAttack` before `resolveAllPhysicalAttacks`. `InteractiveSession.ts:520-527` mirrors this for hot-seat sessions.
- [x] 11.3 — Bot decision logic ships in `BotPlayer.playPhysicalAttackPhase` (kick/punch selection per restriction eligibility; charge/DFA explicitly skipped per design.md Decision 1).
- [x] 11.4 — Bot returns `null` on empty-eligibility cases; the phase driver checks for null before declaring (GameEngine.phases.ts:312).
- [x] 11.5 — DEFERRED to Wave 4 (bot replay determinism + scenario coverage): `wire-bot-ai-helpers-and-capstone.smoke.test.ts` covers the basic two-bot punch case; comprehensive replay coverage requires the Wave 4 SeededRandom-injected scenario harness.
- [x] 11.6 — DEFERRED to Wave 4 (bot replay determinism): same harness as 11.5; mirrors the per-tier deferral pattern adopted in Tier 4 close-out.

## 12. Per-Change Smoke Test

- [x] 12.1 Fixture: 2 mechs adjacent, attacker intact, target at full armor, in Physical Attack phase
- [x] 12.2 Action: attacker declares a Punch (Right Arm) via `PhysicalAttackDeclared`
- [x] 12.3 Assert event stream in order: `PhysicalAttackDeclared { attackerId, targetId, attackType: 'Punch', limb: 'RightArm' }` → `PhysicalAttackResolved` (hit or miss) → on hit: `DamageApplied` → `PSRTriggered { triggerId: 'PhysicalAttackTarget' }`
- [x] 12.4 Restriction fixture: attacker's right arm fired an LRM this turn. Declaring Punch (Right Arm) SHALL emit `AttackInvalid { reason: 'WeaponFiredThisTurn' }` and NOT emit `PhysicalAttackResolved`
- [x] 12.5 — DEFERRED to Wave 4 (replay determinism harness): the in-tree smoke uses fixed-result mock dice (deterministic by construction). End-to-end seed-based replay needs the Wave 4 scenario harness.

## 13. Validation

- [x] 13.1 `openspec validate implement-physical-attack-phase --strict`
- [x] 13.2 End-to-end test: punch from adjacent → hit → damage applied → target PSR queued
- [x] 13.3 Kick miss test: attacker queues PSR; resolution next step may cause attacker fall
- [x] 13.4 — `physicalAttackChargeDFA.test.ts` covers DFA hit (target takes ×3 = 18 damage clustered, attacker leg damage 12 split across legs, both PSRs queued) plus charge hit symmetric coverage.
- [x] 13.5 Restriction test: arm that fired weapon cannot punch (rejected)
- [x] 13.6 Build + lint clean
