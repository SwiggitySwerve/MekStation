# Change: Add Infantry Combat Behavior

## Why

Conventional infantry take damage via platoon attrition (troopers lost per hit) rather than through a location / structure chain, and their own attacks apply damage using the TW damage divisor table (anti-infantry weapons double damage vs infantry, many weapons halve). The Phase 1 damage pipeline knows none of this. This change teaches the engine how to damage an infantry platoon, how the platoon returns fire using primary/secondary weapon-per-squad math, and how field gun firing works.

## What Changes

- Add platoon combat state: surviving troopers, morale, field-gun-operational flag, pinned flag, anti-mech attack committed flag
- Add infantry damage pipeline: incoming damage × damage divisor (per TW weapon table vs infantry) → troopers killed = damage (after modifiers) / trooperArmorValue
- Add platoon firing resolution: attacks hit single target; weapon damage scales with surviving troopers; damage divisor for target type (infantry vs mech) applied
- Add field gun firing: field gun fires as a mech-scale weapon at mech-scale damage (one shot per turn)
- Add anti-infantry weapons: flamer, machine gun, burst-fire weapons apply doubled damage
- Add morale rule: when platoon < 25% strength, platoon must make a morale check; fail → pinned (no firing) or routed (flee)
- Add pinned state: skip firing and movement next phase
- Add infantry leg / swarm attack (if anti-mech trained) — simplified version of BA leg attack
- Add cover bonus: infantry in woods / buildings / hull-down gets to-hit penalty for attacker (−1 woods, −2 buildings, −3 hardened)
- Add field gun crew damage: when field gun is hit, lose 1 crew per 2 damage
- Emit events: `InfantryCasualties`, `InfantryMoraleCheck`, `InfantryPinned`, `InfantryRouted`, `FieldGunFired`, `FieldGunDestroyed`

## Non-goals

- Urban fighting rules (room-by-room)
- Cavalry / mounted rules (beyond Motorized/Mechanized)
- Civilian infantry (non-combatants)

## Dependencies

- **Requires**: `add-infantry-construction`, `add-infantry-battle-value`, `integrate-damage-pipeline`, `wire-heat-generation-and-effects`
- **Blocks**: full combined-arms play

## Impact

- **Affected specs**: `combat-resolution` (MODIFIED — infantry path), `damage-system` (MODIFIED — damage divisor + trooper attrition), `infantry-unit-system` (ADDED — combat state + morale)
- **Affected code**: `src/utils/gameplay/infantryDamage.ts` (new), `src/utils/gameplay/infantryMorale.ts` (new), `src/utils/gameplay/fieldGunFire.ts` (new), `src/engine/GameEngine.ts` (dispatch)
- **New events**: `InfantryCasualties`, `InfantryMoraleCheck`, `InfantryPinned`, `InfantryRouted`, `FieldGunFired`, `FieldGunDestroyed`
