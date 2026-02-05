# Change: Add Gameplay System Roadmap

## Why

MekStation currently focuses on unit construction. Users want to expand into pilot creation, sharing builds with others, organizing forces, and eventually gameplay simulation. This roadmap prioritizes a **Build → Share → Play** approach, delivering value incrementally.

## What Changes

- Establish a phased implementation plan following Build → Share → Play
- Prioritize sharing and collaboration features before gameplay simulation
- Define dependencies between feature proposals
- Include multi-unit type support (vehicles, aerospace, infantry) in the roadmap

## Philosophy: Build → Share → Play

**Build**: Expand construction capabilities (more unit types, pilot creation)
**Share**: Enable sharing builds and setups with others (vault sharing)
**Play**: Add gameplay simulation (combat, phases, tracking)

This ensures users get value from construction and sharing before we tackle the complex gameplay systems.

## Roadmap Overview

### Phase 1: Build & Share MVP (COMPLETE)

| Proposal                      | Description                                       | Status   |
| ----------------------------- | ------------------------------------------------- | -------- |
| `add-multi-unit-type-support` | Vehicles, aerospace, infantry construction        | Archived |
| `add-pilot-system`            | Pilot creation, skills, progression               | Archived |
| `add-vault-sharing`           | File-based export/import with signatures          | Archived |
| `add-unit-card-view`          | Quick reference sheet for unit stats/capabilities | Archived |

### Phase 2: Organize & Collaborate (COMPLETE)

| Proposal               | Description                                    | Status           |
| ---------------------- | ---------------------------------------------- | ---------------- |
| `add-force-management` | Force roster, pilot-mech assignment, hierarchy | Archived (49/50) |
| `add-pilot-mech-card`  | Combined pilot+mech "character sheet" view     | Archived (36/40) |

### Phase 3: Gameplay Core (COMPLETE)

| Proposal                | Description                    | Status           |
| ----------------------- | ------------------------------ | ---------------- |
| `add-game-session-core` | Event sourcing, turns, phases  | Archived (32/48) |
| `add-hex-grid-system`   | Positioning, movement, facing  | Archived (35/41) |
| `add-combat-resolution` | Attacks, damage, critical hits | Archived (42/52) |

Note: DB/API layers deferred - MVP uses in-memory state.

### Phase 4: Gameplay Integration (COMPLETE)

| Proposal               | Description                        | Status      |
| ---------------------- | ---------------------------------- | ----------- |
| `add-encounter-system` | Scenario setup, victory conditions | Implemented |
| `add-gameplay-ui`      | Map, record sheet, action controls | Implemented |

### Phase 5: Advanced Features (FUTURE)

| Proposal                  | Description                             | Dependencies            |
| ------------------------- | --------------------------------------- | ----------------------- |
| `add-vault-sharing` (P2P) | Real-time sync                          | Vault Phase 2           |
| `add-campaign-system`     | Multi-mission arcs, persistent state    | Encounter system        |
| `add-multiplayer-support` | Real-time multiplayer sessions          | Vault P2P, Game session |
| `add-awards-system`       | Medals, achievements, pilot decorations | Pilot system            |
| `add-repair-system`       | Post-battle damage, repair costs        | Game session            |

## Implementation Order

```
Phase 1 - Build & Share MVP (COMPLETE):
├── add-multi-unit-type-support [DONE]
├── add-pilot-system [DONE]
├── add-vault-sharing [DONE]
└── add-unit-card-view [DONE]

Phase 2 - Organize & Collaborate (COMPLETE):
├── add-force-management [DONE]
└── add-pilot-mech-card [DONE]

Phase 3 - Gameplay Core (COMPLETE):
├── add-game-session-core [DONE - in-memory MVP]
├── add-hex-grid-system [DONE - logic complete]
└── add-combat-resolution [DONE - core mechanics]

Phase 4 - Gameplay Integration (COMPLETE):
├── add-encounter-system [DONE]
└── add-gameplay-ui [DONE]

Phase 5 - Advanced (FUTURE):
├── add-vault-sharing P2P sync
├── add-campaign-system
├── add-multiplayer-support
└── add-awards-system, add-repair-system
```

## MVP Milestones

### MVP 1: "Build & Share" (COMPLETE)

- [x] Construct vehicles, aerospace, infantry (not just mechs)
- [x] Create and customize pilots with skills/abilities
- [x] Export units/pilots as shareable files
- [x] Import shared units/pilots from others
- [x] View unit stats in quick reference card

### MVP 2: "Organize" (COMPLETE)

- [x] Organize units and pilots into forces/lances
- [x] View combined pilot+mech character sheets

### MVP 3: "Play Core" (COMPLETE)

- [x] Event-sourced game state with turn/phase structure
- [x] Hex-based movement and positioning calculations
- [x] Combat resolution with damage tracking and critical hits

### MVP 4: "Play Complete" (COMPLETE)

- [x] Scenario/encounter setup with victory conditions
- [x] Full gameplay UI (hex map, record sheet, action controls)
- [x] 1v1 BattleMech duel with complete turn cycle
- [x] Event log and replay capability

## Impact

- Affected specs: Creates 10+ new capability specifications
- Affected code: New `src/sharing/`, `src/gameplay/` directories
- New pages: `/pilots`, `/forces`, `/sharing`, `/gameplay/games`
- Database: New tables for pilots, forces, sharing, games, events

## Success Criteria

- [x] Phase 1: Users can build diverse units, create pilots, share builds
- [x] Phase 2: Users can organize forces and view pilot+mech cards
- [x] Phase 3: Core gameplay logic complete (events, hex math, combat)
- [x] Phase 4: Users can simulate 1v1 combat with full UI
- [x] Each phase delivers standalone value before next phase starts
