# Change: Add Combat Resolution System

## Why

Gameplay requires attack declaration, to-hit calculation with modifiers, hit location determination, and damage application. This proposal implements the combat resolution pipeline per BattleTech Introductory rules.

## What Changes

- Add attack declaration and validation
- Add to-hit number calculation with all modifiers
- Add attack resolution (hit/miss determination)
- Add hit location tables
- Add damage application (armor, structure, criticals)
- Add pilot damage handling

## Dependencies

- **Requires**: `add-game-session-core` (attack events), `add-hex-grid-system` (range/arc)
- **Required By**: `add-gameplay-ui`, `add-encounter-system`

## Combat Pipeline

```
1. Declaration
   └── Select weapon(s), select target, validate range/arc/ammo

2. To-Hit Calculation
   ├── Base (gunnery skill)
   ├── + Range modifier
   ├── + Target movement modifier
   ├── + Attacker movement modifier
   ├── + Heat modifier
   ├── + Other modifiers (partial cover, etc.)
   └── = Final to-hit number

3. Resolution
   └── Roll 2d6, compare to to-hit number

4. Hit Location
   └── Roll 2d6, consult hit location table per arc

5. Damage Application
   ├── Reduce armor at location
   ├── If armor depleted, damage structure
   ├── If structure damaged, roll for criticals
   └── If location destroyed, handle destruction
```

## Impact

- Affected specs: None (new capability)
- New specs: `combat-resolution`
- Affected code: New `src/gameplay/combat/` directory
- No database changes (damage state in game events)
