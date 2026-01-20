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

## Phase 2 - Organize & Collaborate (COMPLETE)

### Force Organization
- [x] `add-force-management` - Lance/Star/Level II organization (archived 2026-01-18, 49/50 tasks)
- [x] `add-pilot-mech-card` - Combined pilot + unit display (archived 2026-01-20, 36/40 tasks)

**Phase 2 Status: 2/2 complete - COMPLETE**

## Phase 3 - Gameplay Core (COMPLETE)

### Core Systems
- [x] `add-game-session-core` - Game state, turn structure, persistence (32/48 tasks - DB/API deferred)
- [x] `add-hex-grid-system` - Hex math, movement, LOS calculations (35/41 tasks - rendering in UI)
- [x] `add-combat-resolution` - Attack resolution, damage application (42/52 tasks - equipment deferred)

**Phase 3 Status: Core logic complete. DB/Service/API layers deferred for MVP (uses in-memory).**

## Phase 4 - Gameplay Integration (COMPLETE)

### Encounter System
- [x] `add-encounter-system` - Scenario setup, victory conditions, OpFor generation

Implemented components:
- Types: `IEncounter`, `IVictoryCondition`, `IOpForConfig`, `IMapConfiguration`
- Scenario templates: Duel, Skirmish, Battle, Custom
- Store: `useEncounterStore` with full CRUD, validation, launch
- Pages: encounters list, create wizard, detail view
- API routes: CRUD, validate, launch, clone, force assignment

### Gameplay UI
- [x] `add-gameplay-ui` - Hex map renderer, record sheet, action controls, phase UI

Implemented components:
- `GameplayLayout` - Split view (map + record sheet)
- `HexMapDisplay` - SVG hex grid with unit tokens, selection, movement/attack range
- `RecordSheetDisplay` - Armor diagram, structure, heat scale, weapons, pilot status
- `PhaseBanner` - Phase and turn display
- `ActionBar` - Context-sensitive action buttons
- `EventLogDisplay` - Game event history
- `HeatTracker`, `ArmorPip`, `AmmoCounter` - Sub-components with tests

**Phase 4 Status: COMPLETE - 351 tests passing**

## Phase 5 - Advanced Features (FUTURE)

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
| 2 | `add-pilot-mech-card` | **Archived** | 36/40 tasks (deferred items) |
| 3 | `add-game-session-core` | **Complete** | 32/48 tasks (DB/API deferred) |
| 3 | `add-hex-grid-system` | **Complete** | 35/41 tasks (UI in gameplay-ui) |
| 3 | `add-combat-resolution` | **Complete** | 42/52 tasks (equipment deferred) |
| 4 | `add-encounter-system` | **Complete** | Full implementation |
| 4 | `add-gameplay-ui` | **Complete** | Full implementation, 351 tests |

## Milestones

### MVP 1: "Build & Share" - COMPLETE
- [x] Construct vehicles, aerospace, infantry (not just mechs)
- [x] Create and customize pilots with skills/abilities
- [x] Export units/pilots as shareable files
- [x] Import shared units/pilots from others
- [x] View unit stats in quick reference card

### MVP 2: "Organize" - COMPLETE
- [x] Organize units and pilots into forces/lances
- [x] View combined pilot+mech character sheets

### MVP 3: "Play Core" - COMPLETE
- [x] Event-sourced game state with turn/phase structure
- [x] Hex-based movement and positioning calculations
- [x] Combat resolution with damage tracking

### MVP 4: "Play Complete" - COMPLETE
- [x] Scenario/encounter setup with victory conditions
- [x] Full gameplay UI (hex map, record sheet, action controls)
- [x] 1v1 BattleMech duel with complete turn cycle

## PRs Merged
- PR #95: Aerospace & Personnel Customizer Integration (2026-01-18)
- PR #96: BlkExportService Implementation (2026-01-18)
- PR #97: Pilot Navigation Addition (2026-01-18)
- PR #112: PilotMechCard Implementation (2026-01-20)
- PR #113: Archive add-pilot-mech-card (2026-01-20)
