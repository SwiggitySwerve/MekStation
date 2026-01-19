# Change: Add Encounter System

## Why

Users need to configure and launch game sessions with specific forces, maps, and victory conditions. This proposal establishes encounter setup, scenario templates, and OpFor generation for quick play.

## What Changes

- Add Encounter entity with configuration
- Add scenario template system
- Add victory condition definitions
- Add OpFor (opposing force) quick generation
- Add encounter launch flow

## Dependencies

- **Requires**: `add-force-management` (forces to play), `add-game-session-core` (game to launch)
- **Required By**: None (end of Phase 3)

## Encounter Model

```
Encounter
├── id, name, description
├── player force (Force reference)
├── opponent force (Force reference or OpFor config)
├── map configuration (size, terrain preset)
├── victory conditions
├── rules options (intro/standard, optional rules)
└── status (draft, ready, launched)

OpFor Config (quick enemy generation)
├── targetBV (match or percentage of player)
├── era filter
├── faction filter
├── unit type filter
└── pilot skill template
```

## Impact

- Affected specs: None (new capability)
- New specs: `encounter-system`
- Affected code: New `src/gameplay/encounters/` directory
- Database: New `encounters` table
- New pages: `/gameplay/encounters`, `/gameplay/encounters/create`, `/gameplay/encounters/[id]`
