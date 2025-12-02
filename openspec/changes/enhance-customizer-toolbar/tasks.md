# Tasks: Enhance Customizer Toolbar

## Task List

### Phase 1: Toolbar UI Updates

- [ ] **1.1** Update `TabBar.tsx` to use document icon for new unit
  - Replace "New" button with document icon (no text label)
  - Icon: document with plus, or blank document
  - Maintain tooltip "Create New Unit"
  - Verify: Icon renders, tooltip shows on hover

- [ ] **1.2** Add folder icon button for loading units
  - Add folder/open icon button next to document icon
  - Tooltip: "Load Unit from Library"
  - Wire to `onLoadUnit` callback prop
  - Verify: Button renders, click triggers callback

- [ ] **1.3** Style toolbar buttons consistently
  - Both icons same size (w-5 h-5)
  - Same hover/active states as current
  - Slight gap between icons
  - Verify: Visual consistency, hover states work

### Phase 2: Unit Load Dialog

- [ ] **2.1** Create `UnitLoadDialog.tsx` component
  - Modal with search input
  - List of canonical + custom units
  - Tech base / era / weight class filters
  - Verify: Dialog opens, search filters results

- [ ] **2.2** Integrate unit search service
  - Use existing `CanonicalUnitService.getIndex()`
  - Use existing `CustomUnitService.list()`
  - Combine and display in sorted list
  - Verify: Units from both sources appear

- [ ] **2.3** Implement unit selection
  - Click unit to select
  - "Load" button to confirm
  - Creates new tab with loaded unit
  - Verify: Selected unit opens in new tab

- [ ] **2.4** Wire dialog to MultiUnitTabs
  - Add state for load dialog visibility
  - Pass callback from TabBar
  - Verify: End-to-end load flow works

### Phase 3: Overview Tab Basic Info

- [ ] **3.1** Add identity fields to unit state
  - Add `chassis`, `clanName`, `model`, `mulId`, `year` fields
  - Add `techLevel` enum field (Introductory/Standard/Advanced/Experimental)
  - Update persistence to include new fields
  - Verify: State updates correctly, persists to localStorage

- [ ] **3.2** Update OverviewTab Basic Info panel
  - Replace current Name/Tonnage/Motive with MegaMekLab layout
  - Add Chassis input field
  - Add Clan Name input field (optional)
  - Add Model input field
  - Add MUL ID field (read-only, -1 for custom)
  - Add Year input field
  - Verify: Fields display and are editable

- [ ] **3.3** Add Tech Level dropdown
  - Add dropdown below Year field
  - Options: Introductory, Standard, Advanced, Experimental
  - Default to Standard
  - Store in unit state (placeholder - no filtering yet)
  - Verify: Selection persists

- [ ] **3.4** Wire tab name to Chassis + Model
  - Tab name derives from "{Chassis} {Model}"
  - Update on Chassis or Model change
  - Verify: Tab name updates live

### Phase 4: Spec Updates

- [ ] **4.1** Update multi-unit-tabs spec
  - Add toolbar icon requirements
  - Add load dialog requirements
  - Verify: `openspec validate` passes

- [ ] **4.2** Archive change and update specs
  - Run `openspec archive enhance-customizer-toolbar`
  - Verify: Main specs updated

### Phase 5: Polish

- [ ] **5.1** Add keyboard shortcuts
  - Ctrl+N for new unit
  - Ctrl+O for load unit
  - Verify: Shortcuts work globally in customizer

- [ ] **5.2** Update empty state
  - Use same document/folder icons
  - Consistent with toolbar
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

- [ ] All unit tests pass
- [ ] Build succeeds with no TypeScript errors
- [ ] `openspec validate enhance-customizer-toolbar --strict` passes
- [ ] Manual testing of new/load flows
- [ ] Unsaved changes protection verified

