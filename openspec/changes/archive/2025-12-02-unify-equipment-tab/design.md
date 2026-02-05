# Design: Unified Equipment Tab with Global Loadout Tray

## Context

The current equipment management is split across a placeholder Weapons tab and a functional Equipment tab. MekLab provides a proven UX pattern with a persistent loadout panel. Users need access to their current loadout while working on any tab (Structure, Armor, Criticals, etc.).

### Stakeholders

- Users who build BattleMechs and need efficient equipment browsing
- Users familiar with MekLab who expect similar workflows
- Users working on critical slot allocation who need loadout visibility

## Goals / Non-Goals

**Goals:**

- Single tab for all equipment management (weapons, ammo, electronics, misc)
- **Global loadout tray** available across ALL customizer tabs (not just Equipment)
- Maximize viewable equipment rows while maintaining filter controls
- Toggle-button categories for quick filtering (Energy, Ballistic, Missile, etc.)
- Categorized loadout display with collapsible sections
- Status bar showing weight/slots/heat remaining (global)
- Proper handling of structural slot components (Endo Steel, Ferro-Fibrous)

**Non-Goals:**

- Drag-and-drop from browser to loadout (use Add button)
- Equipment details popup/modal (defer to future enhancement)
- Custom column configuration (use predefined sensible columns)

## Layout Decision

### Selected: Global Right-Edge Tray + Full-Width Tabs

```
┌─────────────────────────────────────────────────────────────┬──────────────┐
│ [Multi-Unit Tabs: Atlas | Marauder | + ]                    │ [Loadout ▼]  │
├─────────────────────────────────────────────────────────────┤──────────────┤
│ [Section Tabs: Overview|Structure|Armor|Equipment|Crit|Fluf]│ Remove|RemAll│
├─────────────────────────────────────────────────────────────┤──────────────┤
│                                                             │ ▼ Energy (2) │
│              [Active Tab Content]                           │   PPC    7t  │
│                                                             │   ER PPC 7t  │
│  Equipment Tab:                                             │ ▼ Ammo (1)   │
│  ┌─────────────────────────────────────────────────────┐    │   AC/20  1t  │
│  │ Show: [Energy][Ballistic][Missile][Phys][Ammo][Oth] │    │              │
│  │ Hide: [Prototype][One-Shot][Unavailable]            │    │              │
│  │ Filter: [________________][X]                       │    │              │
│  ├─────────────────────────────────────────────────────┤    │              │
│  │ Name      |Dmg|Heat|Range |Weight|Crit| Action      │    │              │
│  │ AC/2      | 2 | 1  |8/16/24| 6.0 | 1  | [Add]       │    │              │
│  │ AC/5      | 5 | 1  |6/12/18| 8.0 | 4  | [Add]       │    │              │
│  └─────────────────────────────────────────────────────┘    │              │
├─────────────────────────────────────────────────────────────┴──────────────┤
│ Weight: 21.5/25t (3.5t rem) | Slots: 31/78 | Heat: 27/10                   │
└────────────────────────────────────────────────────────────────────────────┘
```

### Rationale

- **Global tray**: Loadout visible while working on Structure, Armor, or Criticals tabs
- **Right-edge position**: Matches MekLab, doesn't interfere with left-to-right reading
- **Buttons at top**: Remove/Remove All accessible without scrolling
- **Categorized groups**: Easy to find weapons vs ammo vs equipment
- **Global status bar**: Capacity info always visible, includes structural slots

## Component Architecture

### CustomizerContent (Modified)

- Renders global LoadoutTray as sibling to tab content
- Renders global StatusBar at bottom
- Manages tray expand/collapse state

### LoadoutTray (Modified from EquipmentTray)

- **Fixed header**: Title, item count, Remove, Remove All buttons
- **Categorized list**: Collapsible sections by equipment category
- **280px width** when expanded, toggle button when collapsed
- Excludes structural components (Endo Steel, Ferro-Fibrous)

### EquipmentTab (Simplified)

- Full-width equipment browser (no sidebar)
- CategoryToggleBar for filtering
- EquipmentTable with Add buttons

### StatusBar (New Global Component)

- Horizontal bar at bottom of customizer
- Shows: Weight, Slots (including structural), Heat
- Warning styling when over capacity

## Structural Slot Components

### Endo Steel

- **IS**: 14 slots spread across locations (unhittable)
- **Clan**: 7 slots spread across locations (unhittable)
- Selected in Structure tab, NOT shown in loadout tray
- Shown in Critical Slots display with distinct styling

### Ferro-Fibrous Armor

- **IS**: 14 slots spread across locations (unhittable)
- **Clan**: 7 slots spread across locations (unhittable)
- Selected in Armor tab, NOT shown in loadout tray
- Shown in Critical Slots display with distinct styling

### Slot Calculation

```
Total Slots Used = System Slots (engine, gyro, cockpit, etc.)
                 + Structural Slots (Endo Steel if selected)
                 + Armor Slots (Ferro-Fibrous if selected)
                 + Equipment Slots (user-added weapons, ammo, etc.)
```

## Decisions

1. **Global tray (right edge)**: Available on all tabs for constant context
2. **Buttons at top of tray**: No scrolling required to access Remove/Remove All
3. **Categorized with collapsible sections**: Organization without losing compactness
4. **280px tray width**: Room for category headers and equipment names
5. **Structural slots excluded from tray**: Managed by dedicated tabs, shown only in Criticals

## Risks / Trade-offs

- **Risk**: Global tray reduces content area on all tabs
  - Mitigation: Tray is collapsible, remembers state
- **Risk**: Small screens may not accommodate tray
  - Mitigation: Auto-collapse below 768px, overlay mode on mobile

## Open Questions

- Should tray auto-expand when adding equipment from browser?
- Should selecting equipment in tray highlight it in Critical Slots display?
