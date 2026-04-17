# Change: Add BattleArmor Combat Behavior

## Why

Battle armor behaves materially differently from mechs and vehicles in combat: squad damage distributes across troopers one-at-a-time, each trooper has its own armor pool, and BA can attack mechs through anti-mech / swarm / leg / vibroclaw moves unique to the type. The existing combat engine does not handle squad-per-unit state, squad damage distribution, or BA-vs-mech interactions. This change adds BA combat behavior on top of the Phase 1 damage pipeline, mirroring the way `add-vehicle-combat-behavior` did it for vehicles.

## What Changes

- Add BA squad combat state: per-trooper damage pool, per-trooper alive flag, squad anti-mech attach state (swarming unit id, leg-attack target)
- Add BA hit-location table: hits distribute across troopers by cluster-hits table (similar to missiles)
- Add trooper damage pipeline: each hit reduces one trooper's armor; excess kills the trooper (trooper removed from combat state)
- Add anti-mech attack: leg attack (rolled against Mech, succeeds → damage to mech leg + BA takes return damage), swarm attack (attaches to mech, deals 2d6 damage per turn until dismounted)
- Add swarm dismount actions for attached mech: Piloting skill roll to dismount, successful → BA takes fall damage; can also shoot own location with own AP weapons
- Add vibro-claw melee bonus to physical attacks
- Add squad fire resolution: each trooper fires independently; weapons sum into squad attack; number of dice = number of surviving troopers
- Add mimetic armor to-hit penalty (+1 to hit when stationary)
- Add stealth armor to-hit penalty (+1 to hit + blocks targeting computer locks)
- Emit BA-specific events: `SwarmAttached`, `SwarmDamage`, `SwarmDismounted`, `LegAttack`, `TrooperKilled`, `SquadEliminated`

## Non-goals

- Field guns (infantry) — handled in `add-infantry-combat-behavior`
- Support vehicles carrying BA — will be handled in future transport-rules change
- Manei Domini / Exo-specific rules

## Dependencies

- **Requires**: `add-battlearmor-construction`, `add-battlearmor-battle-value`, `integrate-damage-pipeline`, `wire-heat-generation-and-effects` (BA doesn't heat, but shares event bus)
- **Blocks**: fully combined-arms combat

## Impact

- **Affected specs**: `combat-resolution` (MODIFIED — BA path), `damage-system` (MODIFIED — squad damage distribution), `critical-hit-system` (MODIFIED — no crits on BA, but swarm damage routes differently), `hit-location-tables` (ADDED — BA trooper distribution table), `battle-armor-unit-system` (ADDED — combat state)
- **Affected code**: `src/utils/gameplay/battleArmorDamage.ts` (new), `src/utils/gameplay/battleArmorSwarm.ts` (new), `src/utils/gameplay/battleArmorLegAttack.ts` (new), `src/engine/GameEngine.ts` (dispatch)
- **New events**: `SwarmAttached`, `SwarmDamage`, `SwarmDismounted`, `LegAttack`, `TrooperKilled`, `SquadEliminated`, `MimeticBonus`, `StealthBonus`
