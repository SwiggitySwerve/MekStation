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

### Phase 1: Build & Share MVP
| Proposal | Description | Dependencies | Priority |
|----------|-------------|--------------|----------|
| `add-multi-unit-types` | Vehicles, aerospace, infantry construction | None | High |
| `add-pilot-system` | Pilot creation, skills, progression | None | High |
| `add-vault-sharing` (Phase 1) | File-based export/import with signatures | None | High |
| `add-unit-card-view` | Quick reference sheet for unit stats/capabilities | None | Medium |

### Phase 2: Organize & Collaborate
| Proposal | Description | Dependencies | Priority |
|----------|-------------|--------------|----------|
| `add-force-management` | Force roster, pilot-mech assignment, hierarchy | Pilot system | High |
| `add-vault-sharing` (Phase 2) | Link sharing, permissions, optional relay | Vault Phase 1 | High |
| `add-pilot-mech-card` | Combined pilot+mech "character sheet" view | Pilot system, Force mgmt | Medium |

### Phase 3: Gameplay Simulation
| Proposal | Description | Dependencies | Priority |
|----------|-------------|--------------|----------|
| `add-game-session-core` | Event sourcing, turns, phases | Pilot system | High |
| `add-hex-grid-system` | Positioning, movement, facing | None | High |
| `add-combat-resolution` | Attacks, damage, critical hits | Game session, Hex grid | High |
| `add-encounter-system` | Scenario setup, victory conditions | Force mgmt, Game session | Medium |
| `add-gameplay-ui` | Map, record sheet, action controls | All Phase 3 core | High |

### Phase 4: Advanced Features
| Proposal | Description | Dependencies | Priority |
|----------|-------------|--------------|----------|
| `add-vault-sharing` (Phase 3) | P2P real-time sync | Vault Phase 2 | Medium |
| `add-campaign-system` | Multi-mission arcs, persistent state | Encounter system | Medium |
| `add-multiplayer-support` | Real-time multiplayer sessions | Vault P2P, Game session | Low |
| `add-awards-system` | Medals, achievements, pilot decorations | Pilot system | Low |
| `add-repair-system` | Post-battle damage, repair costs | Game session | Low |

## Implementation Order

```
Phase 1 - Build & Share MVP (Parallel):
├── add-multi-unit-types
├── add-pilot-system
├── add-vault-sharing (file export/import)
└── add-unit-card-view

Phase 2 - Organize & Collaborate:
├── add-force-management (requires: pilot-system)
├── add-vault-sharing Phase 2 (requires: vault Phase 1)
└── add-pilot-mech-card (requires: pilot-system, force-mgmt)

Phase 3 - Gameplay Simulation:
├── add-game-session-core (requires: pilot-system)
├── add-hex-grid-system (parallel)
├── add-combat-resolution (requires: game-session, hex-grid)
├── add-encounter-system (requires: force-mgmt, game-session)
└── add-gameplay-ui (requires: all Phase 3 core)

Phase 4 - Advanced:
├── add-vault-sharing Phase 3 (P2P sync)
├── add-campaign-system
├── add-multiplayer-support
└── add-awards-system, add-repair-system
```

## MVP Milestones

### MVP 1: "Build & Share" (Phase 1 Complete)
- [ ] Construct vehicles, aerospace, infantry (not just mechs)
- [ ] Create and customize pilots with skills/abilities
- [ ] Export units/pilots as shareable files
- [ ] Import shared units/pilots from others
- [ ] View unit stats in quick reference card

### MVP 2: "Organize & Collaborate" (Phase 2 Complete)
- [ ] Organize units and pilots into forces/lances
- [ ] Share via links with read/write permissions
- [ ] View combined pilot+mech character sheets
- [ ] Collaborate on shared force rosters

### MVP 3: "Play" (Phase 3 Complete)
- [ ] 1v1 BattleMech duel with full turn cycle
- [ ] Hex-based movement and positioning
- [ ] Combat resolution with damage tracking
- [ ] Event log and replay capability

## Impact

- Affected specs: Creates 10+ new capability specifications
- Affected code: New `src/sharing/`, `src/gameplay/` directories
- New pages: `/pilots`, `/forces`, `/sharing`, `/gameplay/games`
- Database: New tables for pilots, forces, sharing, games, events

## Success Criteria

- [ ] Phase 1: Users can build diverse units, create pilots, share builds
- [ ] Phase 2: Users can organize forces and collaborate with permissions
- [ ] Phase 3: Users can simulate 1v1 combat with full rules
- [ ] Each phase delivers standalone value before next phase starts
