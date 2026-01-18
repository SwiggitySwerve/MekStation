# Change: Add Pilot-Mech Card (Character Sheet)

## Why

Players need a combined view of their pilot and assigned mech — the "character sheet" for gameplay. This shows the pilot's skills, abilities, and career alongside the mech's capabilities, providing a complete picture of what they're bringing to an encounter.

## What Changes

- Add combined Pilot-Mech Card component
- Show pilot identity, skills, abilities, career stats
- Show assigned mech summary (unit card embedded)
- Show calculated modifiers (effective to-hit, etc.)
- Add quick actions for the combined unit

## Dependencies

- **Requires**: `add-pilot-system`, `add-force-management`, `add-unit-card-view`
- **Required By**: `add-gameplay-ui`, `add-encounter-system`

## Character Sheet Layout

```
┌─────────────────────────────────────────────────────────────┐
│ "HAMMER" - Marcus Chen                          [Veteran]   │
│ Kell Hounds • 15 missions • 7 kills • 450 XP               │
├─────────────────────────────────────────────────────────────┤
│ PILOT SKILLS              │ ABILITIES                       │
│ Gunnery:  3               │ • Weapon Specialist (AC)        │
│ Piloting: 4               │ • Iron Will                     │
│ Wounds:   0/6             │                                 │
├─────────────────────────────────────────────────────────────┤
│ ASSIGNED MECH: Atlas AS7-D                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Embedded Unit Card - Standard Variant]                 │ │
│ │ 100 tons • BV: 1,897 • Walk 3 / Run 5 / Jump 0         │ │
│ │ Weapons: AC/20, LRM 20, 2x ML, SRM 6                   │ │
│ │ Heat: 23 gen / 20 diss                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ EFFECTIVE STATS                                             │
│ Base To-Hit: 3 (Gunnery)                                   │
│ AC Weapons:  2 (Weapon Specialist -1)                      │
│ Consciousness: 5+ (Iron Will bonus)                        │
├─────────────────────────────────────────────────────────────┤
│ [Export] [Share] [Edit Pilot] [Change Mech] [To Encounter] │
└─────────────────────────────────────────────────────────────┘
```

## Use Cases

| Context | Behavior |
|---------|----------|
| Force roster | Show all pilot-mech cards in force |
| Pre-game review | Review your characters before encounter |
| Share with GM | GM can see player character sheets |
| During gameplay | Reference during combat |

## Impact

- Affected specs: None (new capability)
- New specs: `pilot-mech-card`
- Affected code: New `src/components/pilot-mech-card/` directory
- New pages: None (component used in force roster, encounter setup)
