# Tasks: Add Infantry Combat Behavior

## 1. Unit-Type Dispatch

- [ ] 1.1 Route `resolveDamage()` to `infantryResolveDamage()` when target is `IInfantryUnit`
- [ ] 1.2 Route attack declaration for infantry to use squad / field gun fire resolution
- [ ] 1.3 No critical hits for infantry (skip `resolveCriticalHits` on infantry target)

## 2. Platoon Combat State

- [ ] 2.1 Initialize `unit.combatState.platoon.survivingTroopers = totalTroopers`
- [ ] 2.2 `morale`, `pinned`, `routed`, `fieldGunOperational`, `antiMechCommitted`
- [ ] 2.3 State updates on every damage event

## 3. Damage Divisor Table

- [ ] 3.1 Load per-weapon anti-infantry multiplier table (TW Chapter Infantry)
- [ ] 3.2 Flamer × 2, MG × 2, Burst-Fire × 1.5 on infantry
- [ ] 3.3 Standard Autocannon × 1, PPC × 1 (effective damage divided by infantry divisor tool)
- [ ] 3.4 Large Laser × 1 standard, Small Laser × 1
- [ ] 3.5 Explosion / Inferno rounds apply doubled damage

## 4. Damage → Casualties Conversion

- [ ] 4.1 For each incoming attack, compute effective damage = raw × weapon multiplier
- [ ] 4.2 Subtract armor kit defense (Flak divides ballistic damage by 2 per TW)
- [ ] 4.3 casualties = ceil(effective / trooperResilience)
- [ ] 4.4 `survivingTroopers -= casualties` (clamped ≥ 0)
- [ ] 4.5 Emit `InfantryCasualties` event with casualties count

## 5. Morale Rule

- [ ] 5.1 When survivingTroopers drops below 25% of starting, trigger morale check
- [ ] 5.2 Roll 2d6 vs TN 8 + leader modifier
- [ ] 5.3 Success: keep fighting
- [ ] 5.4 Fail by 1: pinned (no firing next phase)
- [ ] 5.5 Fail by 2+: routed (retreat off-board, no more firing)
- [ ] 5.6 Emit `InfantryMoraleCheck` + `InfantryPinned` / `InfantryRouted` events

## 6. Platoon Fire Resolution

- [ ] 6.1 Effective firepower = primary + secondary scaled by surviving troopers
- [ ] 6.2 Compute weapon damage using infantry firepower formula: `damage = troopers × weaponRating / divisor`
- [ ] 6.3 Troopers firing field gun do NOT contribute personal weapons
- [ ] 6.4 Apply to-hit modifiers for infantry cover (woods / building / hull-down)

## 7. Field Gun Firing

- [ ] 7.1 Field gun fires as a single mech-scale weapon at its listed BV/damage/range
- [ ] 7.2 One shot per turn (field guns cannot continuous-fire without reloading)
- [ ] 7.3 Ammo tracked; 0 ammo → cannot fire
- [ ] 7.4 When platoon is pinned or routed, field gun cannot fire
- [ ] 7.5 Emit `FieldGunFired` with target, damage, and range

## 8. Field Gun Damage

- [ ] 8.1 When the field gun's hex is attacked, crew take damage alongside platoon
- [ ] 8.2 Every 2 damage past kit absorption kills 1 field gun crew
- [ ] 8.3 If all field gun crew are dead, field gun is destroyed
- [ ] 8.4 Emit `FieldGunDestroyed` event

## 9. Anti-Mech Leg / Swarm (Simplified)

- [ ] 9.1 Anti-mech trained platoons may declare Leg Attack at adjacency
- [ ] 9.2 Roll 2d6 + platoon piloting vs mech piloting + 4
- [ ] 9.3 Success: target leg takes damage = survivingTroopers × 2
- [ ] 9.4 Failure: platoon takes 1d6 damage (distribute via casualties table)
- [ ] 9.5 No full swarm rule for Phase 6 (BA handles swarm; infantry leg attack is lighter)

## 10. Cover and Terrain Modifiers

- [ ] 10.1 Woods: attacker +1 to-hit against infantry target
- [ ] 10.2 Light building: attacker +2; heavy building: +3; hardened: +4
- [ ] 10.3 Hull-down terrain: +1
- [ ] 10.4 Pass modifiers through the `to-hit-resolution` layer

## 11. AI Adaptations

- [ ] 11.1 Bot avoids charging infantry with mechs (mechs may get legged)
- [ ] 11.2 Bot pushes infantry into cover
- [ ] 11.3 Bot avoids pinned units for target priority

## 12. Validation

- [ ] 12.1 `openspec validate add-infantry-combat-behavior --strict`
- [ ] 12.2 Unit tests: damage divisor application, morale check, field gun firing, anti-mech leg attack
- [ ] 12.3 Simulation: mech vs Foot platoon scenarios
- [ ] 12.4 Build + lint clean
