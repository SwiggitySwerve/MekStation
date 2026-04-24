# Change: Add Vehicle Combat Behavior

## Why

Phase 1 combat is mech-centric — hit locations, heat tracking, and damage pipeline assume `IBattleMech`. Vehicles on the battlefield today either fall through the pipeline unchanged or silently fail. This change teaches the combat engine how a vehicle takes damage (motive hits, not critical slots), how its hit locations work (6-section vehicle table, not 11-section mech table), how its firing arcs are computed (per-side arcs, not based on torso twist), and how VTOL / Hover / Hydrofoil motion introduces its own damage effects.

## What Changes

- Add vehicle hit-location table per attack direction (Front / Side / Rear)
- Add motive-damage table: damage to Front/Side/Rear with structure exposure triggers a Motive Damage roll per TW
- Add motive-damage effects: minor (−1 cruise MP), moderate (−2), heavy (−3), immobilized
- Add vehicle critical hit system (weapon / ammo / engine / crew / cargo / fuel / turret-lock)
- Add vehicle-specific firing arcs: Front (60° front arc), Left/Right Side (120° each), Rear (60°); Turret ignores chassis facing
- Add VTOL-specific rules: rotor hits reduce altitude / trigger crash, mast mount fixed arc
- Add Hover / Hydrofoil motive-hit aggravation (bog-down / sinking on water terrain)
- Wire `resolveDamage` and `resolveCriticalHits` to route to the vehicle variants when target is a vehicle
- Emit vehicle-specific events: `MotiveDamage`, `TurretLocked`, `VehicleCrewStunned`, `VehicleImmobilized`
- Extend game engine AI bot to understand vehicle movement legality (no reverse jump, no pivot in place for wheeled, etc.)

## Non-goals

- DropShip / warship combat — separate system
- Motive-type terrain pathing (bogging down in swamp, etc.) — handled by `terrain-system` follow-up
- Aerospace combat — covered by `add-aerospace-combat-behavior`
- Infantry / BA combat — separate changes

## Dependencies

- **Requires**: `add-vehicle-construction` (legal unit with motive/turret data), `add-vehicle-battle-value` (AI prioritization), `integrate-damage-pipeline` (A4 damage pipeline), `wire-heat-generation-and-effects` (vehicles don't heat like mechs but must be exempt)
- **Blocks**: full combined-arms play

## Impact

- **Affected specs**: `combat-resolution` (MODIFIED — route by unit type), `damage-system` (MODIFIED — vehicle transfer chain), `critical-hit-system` (MODIFIED — vehicle crit table), `hit-location-tables` (ADDED — vehicle front/side/rear tables), `firing-arc-calculation` (MODIFIED — vehicle arcs), `vehicle-unit-system` (ADDED — motive-damage state)
- **Affected code**: `src/utils/gameplay/vehicleDamage.ts` (new), `src/utils/gameplay/vehicleHitLocation.ts` (new), `src/utils/gameplay/motiveDamage.ts` (new), `src/utils/gameplay/vehicleCriticalHitResolution.ts` (new), `src/utils/gameplay/firingArc.ts` (extend), `src/engine/GameEngine.ts` (type-dispatch damage/crit)
- **New events**: `MotiveDamaged`, `MotivePenaltyApplied`, `VehicleImmobilized`, `TurretLocked`, `VehicleCrewStunned`
