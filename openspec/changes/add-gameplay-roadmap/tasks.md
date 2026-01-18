# Tasks: Gameplay Roadmap

## Phase 1 - Build & Share MVP

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

## Phase 2 - Organize & Collaborate

### Force Organization
- [ ] `add-force-management` - Lance/Star/Level II organization
- [ ] `add-pilot-mech-card` - Combined pilot + unit display

## Phase 3 - Gameplay Simulation

### Core Systems
- [ ] `add-game-session-core` - Game state, turn structure, persistence
- [ ] `add-hex-grid-system` - Hex map rendering, movement, LOS

### Combat
- [ ] `add-combat-resolution` - Attack resolution, damage application
- [ ] `add-encounter-system` - Scenario setup, victory conditions

### UI
- [ ] `add-gameplay-ui` - Game controls, action panels, status displays

## Implementation Status

| Phase | Proposal | Status | Notes |
|-------|----------|--------|-------|
| 1 | `add-multi-unit-type-support` | **Archived** | BLK parsing, 13 unit type handlers |
| 1 | `add-vehicle-customizer` | **Archived** | Tab integration, store registry |
| 1 | `add-aerospace-customizer` | **Archived** | Store registry, routing. Validation pending. |
| 1 | `add-personnel-customizer` | **Archived** | Store registries for BA/Inf/Proto. UI tabs pending. |
| 1 | `add-vault-sharing` | **Archived** | Export/import with signatures |
| 1 | `add-unit-export-integration` | **Archived** | BlkExportService. UI, record sheets pending. |
| 1 | `add-pilot-system` | **Archived** | Full pilot system. Tests pending. |
| 1 | `add-unit-card-view` | **Archived** | Unit card components (2026-01-18) |
| 2 | `add-force-management` | Pending | Proposal created |
| 2 | `add-pilot-mech-card` | Pending | Proposal created |
| 3 | `add-game-session-core` | Pending | Proposal created |
| 3 | `add-hex-grid-system` | Pending | Proposal created |
| 3 | `add-combat-resolution` | Pending | Proposal created |
| 3 | `add-encounter-system` | Pending | Proposal created |
| 3 | `add-gameplay-ui` | Pending | Proposal created |

**Phase 1 Status: 8/8 archived - COMPLETE**

### PRs Merged (2026-01-18)
- PR #95: Aerospace & Personnel Customizer Integration
- PR #96: BlkExportService Implementation  
- PR #97: Pilot Navigation Addition
