# Change: Add Infantry Construction

## Why

Conventional infantry platoons show up in virtually every ground engagement as objective holders, field-gun crews, and garrison units. The existing `infantry-unit-system` spec describes platoon composition and primary/secondary weapons, but the construction pipeline does not enforce platoon strength, motive type, armor kit, field gun integration, or per-trooper weapon table math. This change completes infantry construction so Phase 6 BV and combat have a legal platoon to work with.

## What Changes

- Add platoon composition: number of squads × troopers per squad per TW table
- Add motive type: Foot / Jump / Motorized / Mechanized (Tracked/Wheeled/Hover/VTOL)
- Add armor kit (Standard / Flak / Camo / Snow / Environmental Sealing) with mass per trooper
- Add primary / secondary weapon selection from infantry weapon table; primary applies to all troopers, secondary applies to every N troopers per pattern
- Add range multipliers (short/medium/long) from weapon table — consumed in combat
- Add field gun integration: platoon may crew one field gun (deck-mounted large weapon) from the allowed list; mech-scale weapon mounted on a towed cart, crew penalty while operating
- Add ammunition allocation: per-trooper rounds, plus field-gun ammo
- Add anti-mech training flag: enables leg/swarm attacks at combat time
- Add construction validation rule set `VAL-INF-*` covering platoon strength, motive compatibility, armor kit validity, primary weapon legality by motive, field gun rules, ammo availability
- Wire into infantry store and customizer tabs

## Non-goals

- Infantry combat (damage, morale, field gun firing) — `add-infantry-combat-behavior`
- BV calculation — `add-infantry-battle-value`
- Support vehicle transport (carrying capacity) — future

## Dependencies

- **Requires**: existing `infantry-unit-system` spec stubs, `construction-services`, `equipment-database`
- **Blocks**: `add-infantry-battle-value`, `add-infantry-combat-behavior`

## Ordering in Phase 6

Infantry is fourth after vehicles, aerospace, and battlearmor.

## Impact

- **Affected specs**: `infantry-unit-system` (ADDED — platoon / motive / armor / weapons / field gun / validation), `construction-rules-core` (MODIFIED — dispatch infantry path), `validation-rules-master` (MODIFIED)
- **Affected code**: `src/stores/infantry/`, `src/utils/construction/infantry/`, `src/components/customizer/infantry/*`, `src/types/infantry/`
- **New files**: infantry weapon table, armor kit table, field gun compatibility list, infantry motive table
