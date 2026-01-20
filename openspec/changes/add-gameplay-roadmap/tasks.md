# Tasks: Gameplay Roadmap

## Phase 1 - Build & Share MVP (COMPLETE)

### Unit Customizers
- [x] `add-multi-unit-type-support` - Foundation for all unit types (archived 2026-01-18)
- [x] `add-vehicle-customizer` - Vehicle customizer UI integration (archived 2026-01-18)
- [x] `add-aerospace-customizer` - Aerospace/fighter customizer (archived 2026-01-18)
- [x] `add-personnel-customizer` - Infantry & Battle Armor customizer (archived 2026-01-18)

### Sharing & Export
- [x] `add-vault-sharing` - File export/import with signatures (archived 2026-01-18)
- [x] `add-unit-export-integration` - MTF/BLK export from customizer (archived 2026-01-18)

### Pilots & Display
- [x] `add-pilot-system` - Pilot creation, skills, abilities (archived 2026-01-18)
- [x] `add-unit-card-view` - Quick reference unit cards (archived 2026-01-18)

**Phase 1 Status: 8/8 archived - COMPLETE**

## Phase 2 - Organize & Collaborate (IN PROGRESS)

### Force Organization
- [x] `add-force-management` - Lance/Star/Level II organization (archived 2026-01-18, 49/50 tasks)
- [ ] `add-pilot-mech-card` - Combined pilot + unit display (0/40 tasks)

**Phase 2 Status: 1/2 complete**

## Phase 3 - Gameplay Core (IN PROGRESS)

### Core Systems
- [ ] `add-game-session-core` - Game state, turn structure, persistence (32/48 tasks)
- [ ] `add-hex-grid-system` - Hex math, movement, LOS calculations (35/41 tasks)
- [ ] `add-combat-resolution` - Attack resolution, damage application (42/52 tasks)

**Phase 3 Status: Core logic ~75% complete. DB/Service/API layers deferred for MVP (uses in-memory).**

### Deferred from Phase 3
The following were moved to Phase 4 due to dependencies on Phase 3 core completion:
- `add-encounter-system` - Requires force-management + game-session-core
- `add-gameplay-ui` - Requires all Phase 3 core systems

## Phase 4 - Integration & Advanced (PENDING)

### Gameplay Integration (moved from Phase 3)
- [ ] `add-encounter-system` - Scenario setup, victory conditions, OpFor generation
- [ ] `add-gameplay-ui` - Hex map renderer, record sheet, action controls, phase UI

### Advanced Features (original Phase 4)
- [ ] `add-vault-sharing` Phase 3 - P2P real-time sync
- [ ] `add-campaign-system` - Multi-mission arcs, persistent state
- [ ] `add-multiplayer-support` - Real-time multiplayer sessions
- [ ] `add-awards-system` - Medals, achievements, pilot decorations
- [ ] `add-repair-system` - Post-battle damage, repair costs

## Implementation Status

| Phase | Proposal | Status | Notes |
|-------|----------|--------|-------|
| 1 | `add-multi-unit-type-support` | **Archived** | BLK parsing, 13 unit type handlers |
| 1 | `add-vehicle-customizer` | **Archived** | Tab integration, store registry |
| 1 | `add-aerospace-customizer` | **Archived** | Store registry, routing |
| 1 | `add-personnel-customizer` | **Archived** | Store registries for BA/Inf/Proto |
| 1 | `add-vault-sharing` | **Archived** | Export/import with signatures |
| 1 | `add-unit-export-integration` | **Archived** | BlkExportService |
| 1 | `add-pilot-system` | **Archived** | Full pilot system |
| 1 | `add-unit-card-view` | **Archived** | Unit card components |
| 2 | `add-force-management` | **Archived** | 49/50 tasks (E2E deferred) |
| 2 | `add-pilot-mech-card` | Active | 0/40 tasks |
| 3 | `add-game-session-core` | Active | 32/48 tasks (DB/API deferred) |
| 3 | `add-hex-grid-system` | Active | 35/41 tasks (rendering deferred) |
| 3 | `add-combat-resolution` | Active | 42/52 tasks (equipment integration deferred) |
| 4 | `add-encounter-system` | **Deferred** | Moved from Phase 3, 0/59 tasks |
| 4 | `add-gameplay-ui` | **Deferred** | Moved from Phase 3, 0/90 tasks |

## Milestones

### MVP 1: "Build & Share" - COMPLETE
- [x] Construct vehicles, aerospace, infantry (not just mechs)
- [x] Create and customize pilots with skills/abilities
- [x] Export units/pilots as shareable files
- [x] Import shared units/pilots from others
- [x] View unit stats in quick reference card

### MVP 2: "Organize" - IN PROGRESS
- [x] Organize units and pilots into forces/lances
- [ ] View combined pilot+mech character sheets

### MVP 3: "Play Core" - IN PROGRESS
- [ ] Event-sourced game state with turn/phase structure
- [ ] Hex-based movement and positioning calculations
- [ ] Combat resolution with damage tracking

### MVP 4: "Play Complete" - PENDING
- [ ] Scenario/encounter setup with victory conditions
- [ ] Full gameplay UI (hex map, record sheet, action controls)
- [ ] 1v1 BattleMech duel with complete turn cycle

## PRs Merged
- PR #95: Aerospace & Personnel Customizer Integration (2026-01-18)
- PR #96: BlkExportService Implementation (2026-01-18)
- PR #97: Pilot Navigation Addition (2026-01-18)
