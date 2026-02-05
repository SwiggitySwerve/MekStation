# Design: Gameplay System Architecture

## Context

MekStation is a BattleTech unit construction app. This design extends it to support gameplay tracking with an architecture that enables:

- Solo play (single player controls all units)
- Future multiplayer (synchronized game state)
- Audit trails (event sourcing for replay/undo)
- Progressive complexity (Introductory rules first, Standard rules later)

## Goals

- **Modular**: Each feature is independently useful
- **Event-Sourced**: All game state derived from immutable events
- **Extensible**: Easy to add new unit types, rules, phases
- **Offline-First**: Works without network; sync is additive

## Non-Goals

- Real-time combat animation
- AI opponents (Phase 4+)
- Full TotalWarfare rules in MVP

## Architecture Decisions

### Decision 1: Event Sourcing for Game State

**What**: Game state is never stored directly. Instead, all actions are stored as immutable events, and current state is computed by replaying events.

**Why**:

- Natural audit log (events ARE the log)
- Replay by replaying events to any point
- Undo by replaying to earlier state and branching
- Multiplayer sync by exchanging events

**Alternatives Considered**:

- Snapshot-based state: Simpler but loses history
- Hybrid (events + periodic snapshots): Added complexity, consider for Phase 4 if performance requires

### Decision 2: Unit Card Model

**What**: A Unit Card combines three layers:

1. **Mech Build** (static, from construction)
2. **Pilot** (persistent across games)
3. **Game State** (current session only)

**Why**: Separates concerns, allows same mech with different pilots, pilot career tracking.

### Decision 3: Phase-Based Turn Structure

**What**: BattleTech phases: Initiative → Movement → Weapon Attack → Physical Attack → Heat → End

**Why**: Matches tabletop rules, enables hybrid lock mechanics (alternating movement, simultaneous attacks).

### Decision 4: Hex Grid with Axial Coordinates

**What**: Use axial coordinate system (q, r) for hex positioning.

**Why**: Clean math for distance, neighbors, line-of-sight. Standard in hex game development.

## Module Boundaries

```
src/gameplay/
├── core/                 # Game session, events, state derivation
│   ├── events/          # Event types and handlers
│   ├── state/           # State computation from events
│   └── phases/          # Phase management
├── pilots/              # Pilot system
│   ├── creation/        # Generation wizards
│   ├── progression/     # XP, skills, abilities
│   └── persistence/     # Database operations
├── grid/                # Hex grid system
│   ├── coordinates/     # Axial math
│   ├── movement/        # Path finding, MP costs
│   └── terrain/         # Terrain types (Phase 3+)
├── combat/              # Combat resolution
│   ├── attacks/         # Declaration, modifiers
│   ├── resolution/      # Hit location, damage
│   └── effects/         # Critical hits, pilot damage
├── forces/              # Force management
│   ├── roster/          # Force CRUD
│   └── hierarchy/       # Parent/child relationships
├── encounters/          # Encounter system
│   ├── setup/           # Scenario configuration
│   └── objectives/      # Victory conditions
└── ui/                  # Gameplay UI components
    ├── map/             # Hex map renderer
    ├── record-sheet/    # Unit card display
    └── action-bar/      # Phase controls
```

## Data Flow

```
User Action
    ↓
Event Created (immutable)
    ↓
Event Stored (append-only log)
    ↓
State Recomputed (pure function of events)
    ↓
UI Updated (React re-render)
```

## Database Schema (High-Level)

```
pilots
├── id, name, callsign, affiliation
├── gunnery, piloting, wounds
├── xp, missions, kills
└── abilities (JSON)

forces
├── id, name, parent_id
└── pilot_assignments (JSON)

games
├── id, name, status, created_at
├── forces (JSON references)
└── map_config (JSON)

game_events
├── id, game_id, sequence
├── type, phase, turn
├── actor_id, payload (JSON)
└── timestamp
```

## Risks / Trade-offs

| Risk                                   | Mitigation                                     |
| -------------------------------------- | ---------------------------------------------- |
| Event replay gets slow with long games | Add snapshots at turn boundaries (Phase 4)     |
| Complex state derivation               | Start simple, add complexity incrementally     |
| Multiplayer sync conflicts             | Design events to be commutative where possible |

## Open Questions

- Should pilot abilities be hardcoded or data-driven (XML like MekHQ)?
- How to handle house rules / optional rules toggles?
- What's the maximum practical game length for event replay?
