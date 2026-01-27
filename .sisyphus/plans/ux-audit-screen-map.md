# UX Audit Screen Decomposition — MekStation

> Companion document to `.sisyphus/plans/ux-audit.md`
> This maps every screen to its full set of capturable sub-states for the Playwright audit suite.

---

## Capture Manifest Structure

For each screen, states are classified as:
- **PRIMARY**: Must capture at all 4 viewports (375, 768, 1024, 1280)
- **SECONDARY**: Capture at phone (375) + desktop (1280) only
- **DIALOG**: Capture at phone (375) + desktop (1280) when triggered from parent screen

---

## 1. Home & Global

### ROUTE: `/`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Loaded | PRIMARY | Dashboard with navigation cards | `home_{vp}` |
| Pre-servicesReady | SECONDARY | What users see before IndexedDB/equipment registry init | `home_{vp}_pre-ready` |

### ROUTE: `/settings`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Default (Appearance expanded) | PRIMARY | First section open on load | `settings_{vp}_default` |
| Customizer section expanded | SECONDARY | Armor diagram mode preview | `settings_{vp}_customizer` |
| P2P Sync section expanded | SECONDARY | Connection status, room code, peers | `settings_{vp}_p2p-sync` |
| Vault & Sharing expanded | SECONDARY | Identity configuration | `settings_{vp}_vault` |
| Accessibility expanded | SECONDARY | High contrast, reduce motion toggles | `settings_{vp}_accessibility` |
| Unsaved appearance changes | SECONDARY | Save/Revert buttons visible | `settings_{vp}_unsaved` |

**Dialogs from Settings:**
| Dialog | Trigger | Screenshot Name |
|--------|---------|-----------------|
| RoomCodeDialog | Click Create/Join Room in P2P section | `dialog_room-code_{vp}` |

### ROUTE: `/contacts`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Loaded | PRIMARY | Contact information | `contacts_{vp}` |

---

## 2. Compendium

### ROUTE: `/compendium`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Loaded | PRIMARY | Hub with hero cards, quick reference, rules grid | `compendium-hub_{vp}` |
| Search active | SECONDARY | Filtered rule sections | `compendium-hub_{vp}_search` |
| No results | SECONDARY | Empty state from search | `compendium-hub_{vp}_no-results` |

### ROUTE: `/compendium/units`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Populated | PRIMARY | Unit list with data | `compendium-units_{vp}_populated` |
| Empty/No results | PRIMARY | No matches for filter | `compendium-units_{vp}_empty` |
| Filtered (by era) | SECONDARY | Active filter chips visible | `compendium-units_{vp}_filtered` |

### ROUTE: `/compendium/units/[id]`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Loaded | PRIMARY | Full unit detail with stats, equipment | `compendium-unit-detail_{vp}` |
| Loading | SECONDARY | Skeleton/spinner state | `compendium-unit-detail_{vp}_loading` |

### ROUTE: `/compendium/equipment`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Populated | PRIMARY | Equipment list with data | `compendium-equipment_{vp}_populated` |
| Empty/No results | PRIMARY | No matches | `compendium-equipment_{vp}_empty` |
| Filtered (by category) | SECONDARY | Category filter active | `compendium-equipment_{vp}_filtered` |

### ROUTE: `/compendium/equipment/[id]`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Loaded | PRIMARY | Equipment detail with stats | `compendium-equip-detail_{vp}` |

### ROUTE: `/compendium/rules`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Default | PRIMARY | All rule sections | `compendium-rules_{vp}` |
| Section expanded | SECONDARY | One section showing detailed rules | `compendium-rules_{vp}_expanded` |

### ROUTE: `/compendium/rules/[id]`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Loaded | PRIMARY | Rule detail | `compendium-rule-detail_{vp}` |

---

## 3. Unit Management

### ROUTE: `/units`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Populated | PRIMARY | My units list with data | `my-units_{vp}_populated` |
| Empty | PRIMARY | No saved units | `my-units_{vp}_empty` |

---

## 4. Unit Customizer

### ROUTE: `/customizer` (no unit loaded)
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Empty/Welcome | PRIMARY | No unit loaded, shows selector or welcome | `customizer_{vp}_empty` |

### ROUTE: `/customizer/[unitId]/structure`
> Capture for: BattleMech, Vehicle, Aerospace (×3)
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Loaded (BattleMech) | PRIMARY | Tonnage, engine, gyro, armor type selectors | `customizer-structure-mech_{vp}` |
| Loaded (Vehicle) | PRIMARY | Vehicle structure configuration | `customizer-structure-vehicle_{vp}` |
| Loaded (Aerospace) | PRIMARY | Aerospace structure configuration | `customizer-structure-aero_{vp}` |
| Validation error | SECONDARY | Red validation feedback visible | `customizer-structure-mech_{vp}_error` |

### ROUTE: `/customizer/[unitId]/armor`
> Capture for: BattleMech, Vehicle, Aerospace (×3) × 2 diagram modes
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Grid mode (BattleMech) | PRIMARY | Schematic armor diagram | `customizer-armor-mech_{vp}_grid` |
| Silhouette mode (BattleMech) | PRIMARY | SVG mech outline diagram | `customizer-armor-mech_{vp}_silhouette` |
| Auto-distribute active | SECONDARY | Auto-distribution toggle on | `customizer-armor-mech_{vp}_auto` |
| Vehicle armor | PRIMARY | Vehicle armor layout | `customizer-armor-vehicle_{vp}` |
| Aerospace armor | PRIMARY | Aerospace armor layout | `customizer-armor-aero_{vp}` |

### ROUTE: `/customizer/[unitId]/equipment`
> Capture for: BattleMech, Vehicle, Aerospace (×3)
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Browser open (BattleMech) | PRIMARY | Equipment browser with search + loadout | `customizer-equip-mech_{vp}` |
| Browser filtered | SECONDARY | Category filter active | `customizer-equip-mech_{vp}_filtered` |
| Equipment selected | SECONDARY | Equipment detail panel visible | `customizer-equip-mech_{vp}_selected` |
| Vehicle equipment | PRIMARY | Vehicle equipment layout | `customizer-equip-vehicle_{vp}` |
| Aerospace equipment | PRIMARY | Aerospace equipment layout | `customizer-equip-aero_{vp}` |

### ROUTE: `/customizer/[unitId]/criticals`
> Capture for: BattleMech, Vehicle, Aerospace (×3)
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Loaded (BattleMech) | PRIMARY | 78-slot critical grid | `customizer-crits-mech_{vp}` |
| Drag in progress | SECONDARY | Component being dragged (if capturable) | `customizer-crits-mech_{vp}_dragging` |
| Validation error | SECONDARY | Red/yellow slot warnings | `customizer-crits-mech_{vp}_error` |
| Vehicle criticals | PRIMARY | Vehicle critical layout | `customizer-crits-vehicle_{vp}` |
| Aerospace criticals | PRIMARY | Aerospace critical layout | `customizer-crits-aero_{vp}` |

### ROUTE: `/customizer/[unitId]/preview`
> Capture for: BattleMech, Vehicle, Aerospace (×3)
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Loaded (BattleMech) | PRIMARY | Record sheet + stats summary | `customizer-preview-mech_{vp}` |
| Vehicle preview | PRIMARY | Vehicle preview | `customizer-preview-vehicle_{vp}` |
| Aerospace preview | PRIMARY | Aerospace preview | `customizer-preview-aero_{vp}` |

**Dialogs from Customizer:**
| Dialog | Trigger | Screenshot Name |
|--------|---------|-----------------|
| SaveUnitDialog | Click Save | `dialog_save-unit_{vp}` |
| UnitLoadDialog | Click Load | `dialog_load-unit_{vp}` |
| VersionHistoryDialog | Click History | `dialog_version-history_{vp}` |
| UnsavedChangesDialog | Navigate away with changes | `dialog_unsaved-changes_{vp}` |
| ResetConfirmationDialog | Click Reset | `dialog_reset-confirm_{vp}` |
| OverwriteConfirmDialog | Save over existing | `dialog_overwrite-confirm_{vp}` |
| ImportUnitDialog | Click Import | `dialog_import-unit_{vp}` |
| ExportDialog | Click Export | `dialog_export_{vp}` |

---

## 5. Gameplay — Pilots

### ROUTE: `/gameplay/pilots`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Populated | PRIMARY | Pilot roster grid with cards | `pilots_{vp}_populated` |
| Empty | PRIMARY | No pilots exist | `pilots_{vp}_empty` |
| Filtered | SECONDARY | Search active with results | `pilots_{vp}_filtered` |

**Pilot card sub-states** (capture within populated view):
- Active pilot card (emerald status)
- KIA/Retired card (reduced opacity)

### ROUTE: `/gameplay/pilots/create`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Closed (info card) | PRIMARY | "Open Creation Wizard" button visible | `pilot-create_{vp}_closed` |
| Step 1: Mode Selection | PRIMARY | Template/Custom/Random/Statblock options | `pilot-create_{vp}_step1-mode` |
| Step 2: Identity | PRIMARY | Name, callsign, background fields | `pilot-create_{vp}_step2-identity` |
| Step 3a: Skills (Template) | PRIMARY | Experience level selector | `pilot-create_{vp}_step3-template` |
| Step 3b: Skills (Custom) | SECONDARY | Point-buy allocation with cost tracker | `pilot-create_{vp}_step3-custom` |
| Step 3c: Skills (Random) | SECONDARY | Generated random skills display | `pilot-create_{vp}_step3-random` |
| Step 4: Review | PRIMARY | Full pilot summary before creation | `pilot-create_{vp}_step4-review` |

### ROUTE: `/gameplay/pilots/[id]`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Loaded | PRIMARY | Pilot detail with skills, history | `pilot-detail_{vp}` |
| Not found | SECONDARY | Invalid pilot ID | `pilot-detail_{vp}_not-found` |

---

## 6. Gameplay — Forces

### ROUTE: `/gameplay/forces`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Populated | PRIMARY | Force roster grid | `forces_{vp}_populated` |
| Empty | PRIMARY | No forces | `forces_{vp}_empty` |

### ROUTE: `/gameplay/forces/create`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Form | PRIMARY | Force creation form fields | `force-create_{vp}` |
| Validation error | SECONDARY | Error state on form | `force-create_{vp}_error` |

### ROUTE: `/gameplay/forces/[id]`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Overview tab | PRIMARY | Force stats, units, pilots | `force-detail_{vp}_overview` |
| Units tab | SECONDARY | Unit roster with assignment | `force-detail_{vp}_units` |
| Personnel tab | SECONDARY | Pilot roster with assignment | `force-detail_{vp}_personnel` |
| History tab | SECONDARY | Event timeline for force | `force-detail_{vp}_history` |
| Not found | SECONDARY | Invalid force ID | `force-detail_{vp}_not-found` |

---

## 7. Gameplay — Encounters

### ROUTE: `/gameplay/encounters`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Populated | PRIMARY | Encounter cards with status badges | `encounters_{vp}_populated` |
| Empty | PRIMARY | No encounters | `encounters_{vp}_empty` |

### ROUTE: `/gameplay/encounters/create`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Step 1: Details | PRIMARY | Name, description fields | `encounter-create_{vp}_step1` |
| Step 2: Template | PRIMARY | Scenario template picker | `encounter-create_{vp}_step2` |
| Step 3: Forces | PRIMARY | Force selection for player + opponent | `encounter-create_{vp}_step3` |
| Step 4: Review | PRIMARY | Full encounter summary | `encounter-create_{vp}_step4` |

### ROUTE: `/gameplay/encounters/[id]`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Overview tab | PRIMARY | Encounter summary, forces, objectives | `encounter-detail_{vp}_overview` |
| Map tab | SECONDARY | Map preset, terrain display | `encounter-detail_{vp}_map` |
| Modifiers tab | SECONDARY | Battle modifiers list | `encounter-detail_{vp}_modifiers` |
| History tab | SECONDARY | Event timeline | `encounter-detail_{vp}_history` |
| Ready state | SECONDARY | "Start Battle" enabled | `encounter-detail_{vp}_ready` |
| Incomplete state | SECONDARY | "Start Battle" disabled (missing forces) | `encounter-detail_{vp}_incomplete` |

---

## 8. Gameplay — Campaigns

### ROUTE: `/gameplay/campaigns`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Populated | PRIMARY | Campaign list with cards | `campaigns_{vp}_populated` |
| Empty | PRIMARY | No campaigns | `campaigns_{vp}_empty` |

### ROUTE: `/gameplay/campaigns/create`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Form | PRIMARY | Campaign creation fields | `campaign-create_{vp}` |

### ROUTE: `/gameplay/campaigns/[id]`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Dashboard (default) | PRIMARY | Stats, quick actions, campaign info | `campaign-detail_{vp}_dashboard` |
| Day report visible | SECONDARY | DayReportPanel after advancement | `campaign-detail_{vp}_day-report` |

### ROUTE: `/gameplay/campaigns/[id]/forces`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Loaded (with forces) | PRIMARY | Hierarchical force tree | `campaign-forces_{vp}_populated` |
| Empty | SECONDARY | No forces assigned | `campaign-forces_{vp}_empty` |
| Node expanded | SECONDARY | Child forces visible | `campaign-forces_{vp}_expanded` |

### ROUTE: `/gameplay/campaigns/[id]/missions`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Populated | PRIMARY | Mission list with status | `campaign-missions_{vp}_populated` |
| Empty | SECONDARY | No missions | `campaign-missions_{vp}_empty` |

### ROUTE: `/gameplay/campaigns/[id]/personnel`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Populated | PRIMARY | Personnel roster | `campaign-personnel_{vp}_populated` |
| Empty | SECONDARY | No personnel | `campaign-personnel_{vp}_empty` |
| Filtered | SECONDARY | Status filter active | `campaign-personnel_{vp}_filtered` |

---

## 9. Gameplay — Quick Game

### ROUTE: `/gameplay/quick`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Welcome | PRIMARY | Landing with feature overview + "Start" button | `quickgame_{vp}_welcome` |
| Step 1: Select Units | PRIMARY | Unit browser, add to force, pilot skill levels | `quickgame_{vp}_step1-units` |
| Step 1: Units selected | SECONDARY | Force populated with units + BV display | `quickgame_{vp}_step1-selected` |
| Step 2: Configure | PRIMARY | Difficulty slider, faction, biome, modifiers | `quickgame_{vp}_step2-config` |
| Step 3: Review | PRIMARY | Both forces, BV comparison bar, victory conditions | `quickgame_{vp}_step3-review` |
| Playing: Active turn | PRIMARY | Turn/phase display, unit status cards, force comparison | `quickgame_{vp}_playing` |
| Playing: Unit destroyed | SECONDARY | Destroyed unit card state | `quickgame_{vp}_playing-destroyed` |
| Results | PRIMARY | Battle summary, winner determination | `quickgame_{vp}_results` |

**Dialogs from Quick Game:**
| Dialog | Trigger | Screenshot Name |
|--------|---------|-----------------|
| End Game Modal | Click "End Game" during play | `dialog_end-game_{vp}` |
| GenerateScenarioModal | Click generate during config | `dialog_generate-scenario_{vp}` |

---

## 10. Gameplay — Games & Replay

### ROUTE: `/gameplay/games`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Populated | PRIMARY | Game history list | `games_{vp}_populated` |
| Empty | PRIMARY | No games played | `games_{vp}_empty` |

### ROUTE: `/gameplay/games/[id]`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Loaded | PRIMARY | Game detail with results | `game-detail_{vp}` |

### ROUTE: `/gameplay/games/[id]/replay`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Loaded (paused) | PRIMARY | Replay paused at beginning | `replay_{vp}_paused` |
| Playing | SECONDARY | Replay in progress | `replay_{vp}_playing` |
| Event selected | SECONDARY | Event overlay displayed | `replay_{vp}_event-selected` |

---

## 11. Gameplay — Repair

### ROUTE: `/gameplay/repair`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Populated (All tab) | PRIMARY | Repair queue with unit cards | `repair_{vp}_all` |
| Empty | PRIMARY | No repair jobs | `repair_{vp}_empty` |
| Pending tab | SECONDARY | Filtered to pending repairs | `repair_{vp}_pending` |
| In Progress tab | SECONDARY | Filtered to active repairs | `repair_{vp}_in-progress` |
| Unit selected | PRIMARY | Detail panel with cost breakdown + repair items | `repair_{vp}_selected` |

---

## 12. Comparison

### ROUTE: `/compare`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Empty (0 units) | PRIMARY | Search bar, no comparison table | `compare_{vp}_empty` |
| Search active | SECONDARY | Dropdown with matching units | `compare_{vp}_search` |
| 1 unit | SECONDARY | Single column comparison | `compare_{vp}_1-unit` |
| 2 units | PRIMARY | Side-by-side comparison | `compare_{vp}_2-units` |
| 4 units (max) | PRIMARY | Full comparison table, search disabled | `compare_{vp}_4-units` |

---

## 13. Audit & Timeline

### ROUTE: `/audit/timeline`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Loaded | PRIMARY | Event list with filters | `timeline_{vp}_loaded` |
| Filters active | SECONDARY | Category/date range filters applied | `timeline_{vp}_filtered` |
| Advanced query visible | SECONDARY | QueryBuilder panel expanded | `timeline_{vp}_advanced-query` |
| Event selected | SECONDARY | Event detail panel visible | `timeline_{vp}_event-selected` |
| No results | SECONDARY | Empty state from filters | `timeline_{vp}_no-results` |

---

## 14. Sharing & Vault

### ROUTE: `/share`
| State | Type | Description | Screenshot Name |
|-------|------|-------------|-----------------|
| Populated | PRIMARY | Share links table with actions | `share_{vp}_populated` |
| Empty | PRIMARY | No share links | `share_{vp}_empty` |
| Delete confirmation | SECONDARY | Inline confirm/cancel buttons visible | `share_{vp}_delete-confirm` |
| Copy success | SECONDARY | Checkmark shown after copy | `share_{vp}_copy-success` |

**Dialogs from Share/Vault:**
| Dialog | Trigger | Screenshot Name |
|--------|---------|-----------------|
| ShareDialog | Click "Create Share Link" | `dialog_share_{vp}` |
| ImportDialog | Click Import | `dialog_import_{vp}` |
| ExportDialog | Click Export | `dialog_export_{vp}` |
| ConflictResolutionDialog | Import with conflicts | `dialog_conflict_{vp}` |

---

## 15. App Shell & Navigation (Global)

These are captured AS PART OF other screen captures but warrant specific attention:

| Element | States | Viewport Focus |
|---------|--------|---------------|
| Sidebar | Expanded (256px), Collapsed (icons), Hidden (mobile) | All 4 |
| TopBar | Full labels (desktop), Icons-only (tablet), Hamburger (mobile) | 768, 1024 transition |
| BottomNavBar | Visible (mobile only) | 375 only |
| Breadcrumbs | Present/absent per route | All 4 |

---

## Screenshot Count Estimate

| Category | PRIMARY captures | SECONDARY captures | Dialog captures |
|----------|-----------------|-------------------|-----------------|
| Home & Global | 8 | 14 | 2 |
| Compendium | 24 | 16 | 0 |
| Unit Management | 8 | 0 | 0 |
| Customizer | 60 | 28 | 16 |
| Pilots | 32 | 10 | 0 |
| Forces | 16 | 10 | 0 |
| Encounters | 24 | 16 | 0 |
| Campaigns | 24 | 14 | 0 |
| Quick Game | 28 | 10 | 4 |
| Games & Replay | 12 | 6 | 0 |
| Repair | 12 | 6 | 0 |
| Comparison | 12 | 6 | 0 |
| Audit/Timeline | 4 | 10 | 0 |
| Share/Vault | 8 | 6 | 8 |
| **TOTALS** | **~272** | **~152** | **~30** |

**Grand total: ~454 captures** (PRIMARY at 4 viewports + SECONDARY at 2 viewports + DIALOG at 2 viewports)

Touch-target overlay mode adds ~30 additional captures (key mobile-interaction pages at 375px only).

**Estimated total: ~485 screenshots**
