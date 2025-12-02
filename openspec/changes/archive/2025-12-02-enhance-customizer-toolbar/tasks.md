# Tasks: Enhance Customizer Toolbar

## Task List

### Phase 1: Toolbar UI Updates

- [x] **1.1** Update `TabBar.tsx` to use document icon for new unit
  - Replace "New" button with document icon (no text label)
  - Icon: document with plus, or blank document
  - Maintain tooltip "Create New Unit (Ctrl+N)"
  - Verify: Icon renders, tooltip shows on hover

- [x] **1.2** Add folder icon button for loading units
  - Add folder/open icon button next to document icon
  - Tooltip: "Load Unit from Library (Ctrl+O)"
  - Wire to `onLoadUnit` callback prop
  - Verify: Button renders, click triggers callback

- [x] **1.3** Style toolbar buttons consistently
  - Both icons same size (w-5 h-5)
  - Same hover/active states as current
  - Slight gap between icons
  - Verify: Visual consistency, hover states work

### Phase 2: Unit Load Dialog

- [x] **2.1** Create `UnitLoadDialog.tsx` component
  - Modal with search input
  - List of canonical + custom units
  - Tech base / era / weight class filters
  - Verify: Dialog opens, search filters results

- [x] **2.2** Integrate unit search service
  - Use existing `CanonicalUnitService.getIndex()`
  - Use existing `CustomUnitService.list()`
  - Combine and display in sorted list
  - Verify: Units from both sources appear

- [x] **2.3** Implement unit selection
  - Click unit to select
  - "Load" button to confirm
  - Creates new tab with loaded unit
  - Verify: Selected unit opens in new tab

- [x] **2.4** Wire dialog to MultiUnitTabs
  - Add state for load dialog visibility
  - Pass callback from TabBar
  - Verify: End-to-end load flow works

### Phase 3: Overview Tab Basic Info

- [x] **3.1** Add identity fields to unit state
  - Add `chassis`, `clanName`, `model`, `mulId`, `year`, `rulesLevel` fields to UnitState
  - `mulId` is a string field (supports numbers and hyphens, defaults to "-1")
  - `year` defaults to 3145 (Dark Age era)
  - `rulesLevel` uses existing RulesLevel enum (Introductory/Standard/Advanced/Experimental)
  - Add setter actions: setChassis, setClanName, setModel, setMulId, setYear, setRulesLevel
  - Verify: State updates correctly, persists to localStorage

- [x] **3.2** Update OverviewTab Basic Info panel
  - Two-column layout: Basic Information (left), Chassis (right)
  - Basic Information panel contains:
    - Chassis input field (full width)
    - Clan Name input field (optional, full width)
    - Model input field (full width)
    - Bottom row (3-column): MUL ID, Year, Tech Level
  - Chassis panel contains:
    - Tonnage with +/- buttons
    - Motive Type dropdown
  - MUL ID is a text field (accepts numbers and hyphens)
  - Verify: Fields display and are editable

- [x] **3.3** Add Tech Level dropdown
  - Part of 3-column bottom row in Basic Information
  - Options: Introductory, Standard, Advanced, Experimental
  - Default to Standard
  - Store in unit state (placeholder - no filtering yet)
  - Verify: Selection persists

- [x] **3.4** Wire tab name to Chassis + Model
  - Tab name derives from "{Chassis} {Model}"
  - Update on Chassis or Model change via updateTabName helper
  - Calls renameTab from TabManagerStore to sync tab display
  - Verify: Tab name updates live

### Phase 4: Spec Updates

- [x] **4.1** Update multi-unit-tabs spec
  - Created multi-unit-tabs/spec.md delta with toolbar icon requirements
  - Created multi-unit-tabs/spec.md delta with load dialog requirements
  - Updated overview-basic-info/spec.md with two-column layout details
  - Verify: `openspec validate enhance-customizer-toolbar --strict` passes ✓

- [x] **4.2** Archive change and update specs
  - Run `openspec archive enhance-customizer-toolbar --yes`
  - Verify: Main specs updated ✓

### Phase 5: Polish

- [x] **5.1** Add keyboard shortcuts
  - Ctrl+N for new unit (opens NewTabModal)
  - Ctrl+O for load unit (opens UnitLoadDialog)
  - Implemented in MultiUnitTabs useEffect
  - Verify: Shortcuts work globally in customizer

- [x] **5.2** Update empty state
  - Use same document/folder icons as toolbar
  - Consistent styling with toolbar buttons
  - Verify: Empty state matches toolbar style

## Dependencies

```
1.1 ──┬── 1.3
1.2 ──┘
       │
       ├── 2.4
       │
2.1 ── 2.2 ── 2.3 ──┘
       │
3.1 ── 3.2 ── 3.3 ── 3.4
       │
4.1 ── 4.2
       │
5.1 ── 5.2
```

## Validation Checklist

- [x] All unit tests pass
- [x] Build succeeds with no TypeScript errors
- [x] `openspec validate enhance-customizer-toolbar --strict` passes
- [x] Manual testing of new/load flows
- [x] Unsaved changes protection verified

## Implementation Notes

### Identity Fields in UnitState
- `chassis: string` - Base chassis name (e.g., "Atlas", "Timber Wolf")
- `clanName: string` - Alternate designation (optional, e.g., "Mad Cat" for Timber Wolf)
- `model: string` - Variant designation (e.g., "AS7-D", "Prime")
- `mulId: string` - Master Unit List ID, defaults to "-1" for custom units, accepts numbers and hyphens
- `year: number` - Introduction year, defaults to 3145 (Dark Age era)
- `rulesLevel: RulesLevel` - Uses existing enum from `@/types/enums/RulesLevel`

### Overview Tab Layout
Two-column grid on large screens:
- **Left column (Basic Information)**: Chassis, Clan Name, Model stacked vertically, then MUL ID/Year/Tech Level in 3-column row
- **Right column (Chassis)**: Tonnage with +/- buttons, Motive Type dropdown

### Tab Name Synchronization
When Chassis or Model changes in OverviewTab:
1. setChassis/setModel updates unit store (also updates derived `name` field)
2. updateTabName helper calls renameTab from TabManagerStore
3. TabBar re-renders with updated name from unit store

