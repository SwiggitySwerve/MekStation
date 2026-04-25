# Change: Add BattleArmor Construction

## Why

Battle Armor squads are the most common hostile infantry in contracts and appear in virtually every campaign. The existing `battle-armor-unit-system` spec declares chassis / weight class / manipulators but the construction pipeline does not enforce squad composition, ground/jump/VTOL movement, manipulator-mounted weapons, anti-mech attack equipment, or armor-per-trooper. This change completes BA construction so Phase 6 BV and combat can take a legally built squad.

## What Changes

- Add chassis configuration: Biped / Quad (with manipulator count implication)
- Add weight class selection: PA(L) / Light / Medium / Heavy / Assault with per-trooper mass thresholds
- Add squad size: 4 or 5 troopers (IS 4, Clan 5 standard; configurable)
- Add movement type: Ground (walk) / Jump / VTOL / UMU (underwater) — with per-weight-class MP cap
- Add ground MP allocation paying weight per MP beyond base 1
- Add armor per trooper (points), weight per point by armor type (Standard BA, Stealth, Mimetic, Reactive, Reflective, Fire-Resistant), max per weight class
- Add manipulator selection per arm (Biped only): Battle Claw / Battle Claw (Vibro) / Basic / Heavy / Mine Clearance / Cargo Lifter etc., each with weight and ability set
- Add weapon / equipment mounting with body/arm/leg slots; heavy weapons require specific weight class and manipulator type
- Add anti-mech equipment: Anti-Personnel weapon slots, Mechanical Jump Boosters, Magnetic Clamps for swarm attack, Partial Wing
- Add construction validation rule set `VAL-BA-*` covering weight class thresholds, trooper mass, movement MP cap, armor max, weapon weight class gate, chassis/manipulator compatibility
- Wire into BA store and customizer tabs

## Non-goals

- BA combat (swarm / leg / anti-mech damage table) — `add-battlearmor-combat-behavior`
- BV calculation — `add-battlearmor-battle-value`
- Pilot / warrior skill progression

## Dependencies

- **Requires**: existing `battle-armor-unit-system` spec stubs, `construction-services`, `armor-system`, `equipment-database`
- **Blocks**: `add-battlearmor-battle-value`, `add-battlearmor-combat-behavior`

## Ordering in Phase 6

Battle armor is third after vehicles and aerospace.

## Impact

- **Affected specs**: `battle-armor-unit-system` (ADDED — chassis / squad / movement / manipulator / equipment / armor / validation), `construction-rules-core` (MODIFIED — dispatch BA path), `validation-rules-master` (MODIFIED)
- **Affected code**: `src/stores/battlearmor/`, `src/utils/construction/battlearmor/`, `src/components/customizer/battlearmor/*`, `src/types/battlearmor/`
- **New files**: BA weight class table, manipulator catalog, BA armor table, BA anti-mech equipment list
