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
| Proposal | Description | Status |
|----------|-------------|--------|
| `add-multi-unit-type-support` | Vehicles, aerospace, infantry construction | Archived |
| `add-pilot-system` | Pilot creation, skills, progression | Archived |
| `add-vault-sharing` | File-based export/import with signatures | Archived |
| `add-unit-card-view` | Quick reference sheet for unit stats/capabilities | Archived |

### Phase 2: Organize & Collaborate (IN PROGRESS)
| Proposal | Description | Status |
|----------|-------------|--------|
| `add-force-management` | Force roster, pilot-mech assignment, hierarchy | Archived (49/50) |
| `add-pilot-mech-card` | Combined pilot+mech "character sheet" view | Active (0/40) |

### Phase 3: Gameplay Core (IN PROGRESS)
| Proposal | Description | Status |
|----------|-------------|--------|
| `add-game-session-core` | Event sourcing, turns, phases | Active (32/48) |
| `add-hex-grid-system` | Positioning, movement, facing | Active (35/41) |
| `add-combat-resolution` | Attacks, damage, critical hits | Active (42/52) |

### Phase 4: Gameplay Integration & Advanced (PENDING)
| Proposal | Description | Dependencies |
|----------|-------------|--------------|
| `add-encounter-system` | Scenario setup, victory conditions | Force mgmt, Game session |
| `add-gameplay-ui` | Map, record sheet, action controls | All Phase 3 core |
| `add-vault-sharing` (P2P) | Real-time sync | Vault Phase 2 |
| `add-campaign-system` | Multi-mission arcs, persistent state | Encounter system |
| `add-multiplayer-support` | Real-time multiplayer sessions | Vault P2P, Game session |
| `add-awards-system` | Medals, achievements, pilot decorations | Pilot system |
| `add-repair-system` | Post-battle damage, repair costs | Game session |

## Implementation Order

```
Phase 1 - Build & Share MVP (COMPLETE):
├── add-multi-unit-type-support [DONE]
├── add-pilot-system [DONE]
├── add-vault-sharing [DONE]
└── add-unit-card-view [DONE]

Phase 2 - Organize & Collaborate (IN PROGRESS):
├── add-force-management [DONE]
└── add-pilot-mech-card (requires: pilot-system, force-mgmt)

Phase 3 - Gameplay Core (IN PROGRESS):
├── add-game-session-core (32/48 - DB/API deferred for MVP)
├── add-hex-grid-system (35/41 - rendering deferred to UI)
└── add-combat-resolution (42/52 - equipment integration deferred)

Phase 4 - Gameplay Integration & Advanced:
├── add-encounter-system (moved from Phase 3)
├── add-gameplay-ui (moved from Phase 3)
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

### MVP 2: "Organize" (IN PROGRESS)
- [x] Organize units and pilots into forces/lances
- [ ] View combined pilot+mech character sheets

### MVP 3: "Play Core" (IN PROGRESS)
- [ ] Event-sourced game state with turn/phase structure
- [ ] Hex-based movement and positioning calculations
- [ ] Combat resolution with damage tracking and critical hits

### MVP 4: "Play Complete" (PENDING)
- [ ] Scenario/encounter setup with victory conditions
- [ ] Full gameplay UI (hex map, record sheet, action controls)
- [ ] 1v1 BattleMech duel with complete turn cycle
- [ ] Event log and replay capability

## Impact

- Affected specs: Creates 10+ new capability specifications
- Affected code: New `src/sharing/`, `src/gameplay/` directories
- New pages: `/pilots`, `/forces`, `/sharing`, `/gameplay/games`
- Database: New tables for pilots, forces, sharing, games, events

## Success Criteria

- [x] Phase 1: Users can build diverse units, create pilots, share builds
- [ ] Phase 2: Users can organize forces and view pilot+mech cards
- [ ] Phase 3: Core gameplay logic complete (events, hex math, combat)
- [ ] Phase 4: Users can simulate 1v1 combat with full UI
- [ ] Each phase delivers standalone value before next phase starts
