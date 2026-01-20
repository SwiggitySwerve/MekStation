# Change: Add Game Session Core

## Why

Gameplay requires a session management system that tracks game state, handles turn/phase progression, and maintains an audit trail of all actions. This proposal establishes the event-sourced game session architecture that enables replay, undo, and future multiplayer sync.

## What Changes

- Add GameSession entity with lifecycle management
- Add event sourcing architecture for game state
- Add turn/phase structure per BattleTech rules
- Add action lock mechanics (per-unit and simultaneous)
- Add game event persistence and replay

## Dependencies

- **Requires**: `add-pilot-system` (pilots participate in games)
- **Required By**: `add-combat-resolution`, `add-encounter-system`, `add-gameplay-ui`

## Turn Structure

```
Turn N
├── Initiative Phase (determine order)
├── Movement Phase (alternating per-unit lock)
├── Weapon Attack Phase (simultaneous planning → reveal)
├── Physical Attack Phase (simultaneous, future)
├── Heat Phase (calculate → dissipate → effects)
└── End Phase (cleanup, status, victory check)
```

## Event Sourcing Model

```
GameEvent
├── id, gameId, sequence, timestamp
├── phase, turn, actorId
├── type (movement_declared, attack_resolved, etc.)
├── payload (event-specific data)
└── result (outcome for resolved events)
```

## Impact

- Affected specs: None (new capability)
- New specs: `game-session-core`
- Affected code: New `src/gameplay/core/` directory
- Database: New `games`, `game_events` tables
- New pages: `/gameplay/games`, `/gameplay/games/[id]`, `/gameplay/games/[id]/replay`
