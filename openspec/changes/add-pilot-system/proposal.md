# Change: Add Pilot System

## Why

Gameplay requires pilots to crew units. Pilots have skills that affect combat (gunnery, piloting), can be wounded, gain experience, and progress through a career. This proposal establishes the pilot system as a foundational component for the gameplay system.

## What Changes

- Add Pilot entity with identity, skills, career tracking
- Add pilot creation wizard (templates, custom, random)
- Add XP-based skill progression system
- Add special abilities that modify gameplay
- Add statblock pilots for quick NPC generation
- Add pilot persistence to database

## Dependencies

- **Requires**: None (new foundation capability)
- **Required By**: `add-game-session-core`, `add-force-management`

## Pilot Model Overview

```
Pilot
├── Identity (name, callsign, affiliation, portrait)
├── Combat Skills (gunnery 1-8, piloting 1-8)
├── Wounds (0-6, affects consciousness)
├── Career (missions, kills, XP, rank)
├── Abilities (special traits earned through XP)
└── History (injuries, mechs piloted, notable events)
```

## Pilot Types

| Type | Purpose | Persistence |
|------|---------|-------------|
| Persistent | Player characters, important NPCs | Full database storage |
| Statblock | Quick NPCs, simulation testing | Inline definition, no storage |

## Impact

- Affected specs: None (new capability)
- New specs: `pilot-system`
- Affected code: New `src/gameplay/pilots/` directory
- Database: New `pilots` table
- New pages: `/gameplay/pilots`, `/gameplay/pilots/create`, `/gameplay/pilots/[id]`
