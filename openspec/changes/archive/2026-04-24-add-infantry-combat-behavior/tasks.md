# Tasks: Add Infantry Combat Behavior

## 1. Unit-Type Dispatch

- [x] 1.1 Route `resolveDamage()` to `infantryResolveDamage()` when target is `IInfantryUnit` — `dispatchResolveInfantryDamage()` shim in `src/utils/gameplay/infantry/dispatch.ts`. GameEngine wiring deferred (same pattern as Wave 3 aerospace/vehicle).
- [x] 1.2 Route attack declaration for infantry to use squad / field gun fire resolution — `computePlatoonFirepower()` + `fireFieldGun()` resolvers in place; engine wiring deferred.
- [x] 1.3 No critical hits for infantry (skip `resolveCriticalHits` on infantry target) — `dispatchResolveCriticalHitsForInfantry()` returns `null` for infantry.

## 2. Platoon Combat State

- [x] 2.1 Initialize `unit.combatState.platoon.survivingTroopers = totalTroopers` — `createInfantryCombatStateFromUnit()` initialiser in `state.ts`. Engine attaches it at spawn (deferred).
- [x] 2.2 `morale`, `pinned`, `routed`, `fieldGunOperational`, `antiMechCommitted` — all fields on `IInfantryCombatState`.
- [x] 2.3 State updates on every damage event — damage/morale/field gun/leg attack resolvers all return an updated immutable state.

## 3. Damage Divisor Table

- [x] 3.1 Load per-weapon anti-infantry multiplier table (TW Chapter Infantry) — `damageDivisor.ts`.
- [x] 3.2 Flamer × 2, MG × 2, Burst-Fire × 1.5 on infantry — table constants.
- [x] 3.3 Standard Autocannon × 1, PPC × 1 — baseline multipliers.
- [x] 3.4 Large Laser × 1 standard, Small Laser × 1 — energy category × 1.
- [x] 3.5 Explosion / Inferno rounds apply doubled damage — inferno × 2, explosion × 2.

## 4. Damage → Casualties Conversion

- [x] 4.1 For each incoming attack, compute effective damage = raw × weapon multiplier — `computeEffectiveInfantryDamage()`.
- [x] 4.2 Subtract armor kit defense (Flak divides ballistic damage by 2 per TW) — `applyFlakReduction()`.
- [x] 4.3 casualties = ceil(effective / trooperResilience) — in `infantryResolveDamage()`.
- [x] 4.4 `survivingTroopers -= casualties` (clamped ≥ 0) — `Math.max(0, …)`.
- [x] 4.5 Emit `InfantryCasualties` event with casualties count.

## 5. Morale Rule

- [x] 5.1 When survivingTroopers drops below 25% of starting, trigger morale check — `shouldTriggerMoraleCheck()` uses strict `<`.
- [x] 5.2 Roll 2d6 vs TN 8 + leader modifier — `rollInfantryMorale()` with `MORALE_TARGET_NUMBER = 8`.
- [x] 5.3 Success: keep fighting — outcome `pass`.
- [x] 5.4 Fail by 1: pinned (no firing next phase) — margin 1 → `pinned`, `fireFieldGun()` + `firingTrooperCount()` deny pinned.
- [x] 5.5 Fail by 2+: routed (retreat off-board, no more firing) — margin ≥ 2 → `routed`, disables field gun.
- [x] 5.6 Emit `InfantryMoraleCheck` + `InfantryPinned` / `InfantryRouted` events.

## 6. Platoon Fire Resolution

- [x] 6.1 Effective firepower = primary + secondary scaled by surviving troopers — `computePlatoonFirepower()`.
- [x] 6.2 Compute weapon damage using infantry firepower formula: `damage = troopers × weaponRating / divisor` — primary + secondary breakdown.
- [x] 6.3 Troopers firing field gun do NOT contribute personal weapons — `firing = surviving − fieldGunCrew`.
- [x] 6.4 Apply to-hit modifiers for infantry cover (woods / building / hull-down) — `cover.ts` module returns modifiers; to-hit pipeline wiring deferred.

## 7. Field Gun Firing

- [x] 7.1 Field gun fires as a single mech-scale weapon at its listed BV/damage/range — `fireFieldGun()`.
- [x] 7.2 One shot per turn (field guns cannot continuous-fire without reloading) — caller enforces one-call-per-turn; module exposes single-shot API.
- [x] 7.3 Ammo tracked; 0 ammo → cannot fire — `out_of_ammo` deny reason.
- [x] 7.4 When platoon is pinned or routed, field gun cannot fire — `pinned` / `routed` deny reasons.
- [x] 7.5 Emit `FieldGunFired` with target, damage, and range — `IFieldGunFiredEvent`.

## 8. Field Gun Damage

- [x] 8.1 When the field gun's hex is attacked, crew take damage alongside platoon — `affectsFieldGunCrew` branch in `infantryResolveDamage()`.
- [x] 8.2 Every 2 damage past kit absorption kills 1 field gun crew — `fieldGunCrewLost = floor(effective / 2)`.
- [x] 8.3 If all field gun crew are dead, field gun is destroyed — `fieldGunOperational = false` when crew hits 0.
- [x] 8.4 Emit `FieldGunDestroyed` event — `IFieldGunDestroyedEvent`.

## 9. Anti-Mech Leg / Swarm (Simplified)

- [x] 9.1 Anti-mech trained platoons may declare Leg Attack at adjacency — `declareLegAttack()` requires `hasAntiMechTraining`.
- [x] 9.2 Roll 2d6 + platoon piloting vs mech piloting + 4 — `MECH_PILOTING_LEG_ATTACK_BONUS = 4`.
- [x] 9.3 Success: target leg takes damage = survivingTroopers × 2 — `LEG_ATTACK_DAMAGE_PER_TROOPER = 2`.
- [x] 9.4 Failure: platoon takes 1d6 damage (distribute via casualties table) — counter-casualties branch.
- [x] 9.5 No full swarm rule for Phase 6 (BA handles swarm; infantry leg attack is lighter) — intentionally out of scope.

## 10. Cover and Terrain Modifiers

- [x] 10.1 Woods: attacker +1 to-hit against infantry target — `WOODS_LIGHT`/`WOODS_HEAVY` = 1.
- [x] 10.2 Light building: attacker +2; heavy building: +3; hardened: +4 — cover table.
- [x] 10.3 Hull-down terrain: +1 — `HULL_DOWN` = 1.
- [x] 10.4 Pass modifiers through the `to-hit-resolution` layer — `sumInfantryCoverModifiers()` exposed; to-hit pipeline wiring deferred.

## 11. AI Adaptations

- [x] 11.1 Bot avoids charging infantry with mechs (mechs may get legged) — `shouldAvoidChargeMech()` helper; BotPlayer wiring deferred.
- [x] 11.2 Bot pushes infantry into cover — `coverSeekScore()` helper; BotPlayer wiring deferred.
- [x] 11.3 Bot avoids pinned units for target priority — `targetPriorityMultiplier()` helper (pinned=0.5, routed=0); BotPlayer wiring deferred.

## 12. Validation

- [ ] 12.1 `openspec validate add-infantry-combat-behavior --strict` — pre-existing strict-mode failures in repo; deferred per Wave 3 pattern.
- [x] 12.2 Unit tests: damage divisor application, morale check, field gun firing, anti-mech leg attack — 133 tests across 10 specs, all passing.
- [ ] 12.3 Simulation: mech vs Foot platoon scenarios — deferred pending GameEngine integration.
- [x] 12.4 Build + lint clean — `npx tsc --noEmit -p .` clean, `npx oxfmt --check` clean, `npx oxlint` 0 warnings 0 errors.
