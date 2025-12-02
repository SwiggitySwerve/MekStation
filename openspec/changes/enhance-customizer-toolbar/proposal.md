# Proposal: Enhance Customizer Toolbar

## Change ID
`enhance-customizer-toolbar`

## Summary
Update the customizer tab bar to match MegaMekLab UI conventions with document/folder icons for new/load actions, and specify the complete tab switching, saving, loading, and naming behavior.

## Motivation

### Current State
- Tab bar has a "New" button with plus icon and text label
- No dedicated "Load" button in the tab bar (only in empty state)
- Save flow is partially implemented but lacks complete specification
- Unit naming (Chassis + Variant) flow is implemented but not formally specified

### Desired State
- Document icon for creating new units (matches MegaMekLab)
- Folder icon for loading units from library (matches MegaMekLab)
- Complete specification of save/load/naming flows for multi-user self-hosted scenarios

## Scope

### In Scope
1. **Toolbar Icon Updates**
   - Replace "New" button with document icon (no text)
   - Add folder icon button for unit loading
   - Compact, icon-based toolbar matching MegaMekLab style

2. **Unit Naming Specification**
   - Chassis + Variant naming format
   - Canonical unit name protection (cannot overwrite official units)
   - Custom unit conflict resolution (prompt to overwrite or rename)

3. **Save Flow Specification**
   - SaveUnitDialog behavior and validation
   - Integration with unsaved changes warning

4. **Load Flow Specification**
   - Unit search/browse popup
   - Loading units into new tabs

5. **Overview Tab Basic Information**
   - Chassis, Clan Name, Model fields (MegaMekLab format)
   - MUL ID and Year fields
   - Tech Level dropdown (Introductory, Standard, Advanced, Experimental)

### Out of Scope
- Full implementation of Tech Level filtering (placeholder only)
- Changes to other section tabs (Structure/Armor, Equipment, etc.)
- Export/import formats
- Server-side storage (remains IndexedDB for custom units)

## Impact Assessment

### Files Affected
| File | Change Type | Description |
|------|-------------|-------------|
| `TabBar.tsx` | MODIFIED | Replace New button with icons, add Load icon |
| `MultiUnitTabs.tsx` | MODIFIED | Add load dialog trigger |
| `UnitLoadDialog.tsx` | ADDED | Unit search/browse popup |
| `OverviewTab.tsx` | MODIFIED | Update Basic Info to MegaMekLab format |
| `unitState.ts` | MODIFIED | Add chassis/model/variant/year fields |

### Breaking Changes
None - visual update only

### Dependencies
- Existing `UnitNameValidator` service
- Existing `SaveUnitDialog` component
- Existing unit services (`CanonicalUnitService`, `CustomUnitService`)

## Alternatives Considered

1. **Keep text labels on buttons**
   - Rejected: Doesn't match MegaMekLab convention
   - Toolbar becomes too wide with many tabs

2. **Combine new/load into single menu**
   - Rejected: Less discoverable than separate icons
   - MegaMekLab uses separate icons

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Icons not intuitive | Add tooltips; document icon universally means "new document" |
| Load dialog complexity | Reuse existing unit browser patterns |

## Success Criteria
- [ ] Document icon creates new unit via existing modal
- [ ] Folder icon opens unit load dialog
- [ ] All toolbar actions accessible via keyboard shortcuts
- [ ] Unsaved changes protection works for all tab operations

