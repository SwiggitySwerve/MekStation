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
   - Two-column layout: Basic Information (left), Chassis (right)
   - Chassis, Clan Name, Model fields stacked vertically
   - MUL ID (text field, supports numbers and hyphens, defaults to "-1")
   - Year field (defaults to 3145 - Dark Age era)
   - Tech Level dropdown (Introductory, Standard, Advanced, Experimental)
   - MUL ID, Year, Tech Level in compact 3-column row at bottom

### Out of Scope

- Full implementation of Tech Level filtering (placeholder only)
- Changes to other section tabs (Structure/Armor, Equipment, etc.)
- Export/import formats
- Server-side storage (remains IndexedDB for custom units)

## Impact Assessment

### Files Affected

| File                 | Change Type | Description                                                                          |
| -------------------- | ----------- | ------------------------------------------------------------------------------------ |
| `TabBar.tsx`         | MODIFIED    | Replace New button with document/folder icons, add tooltips with shortcuts           |
| `MultiUnitTabs.tsx`  | MODIFIED    | Add load dialog trigger, keyboard shortcuts (Ctrl+N, Ctrl+O)                         |
| `UnitLoadDialog.tsx` | ADDED       | Unit search/browse popup with filters                                                |
| `OverviewTab.tsx`    | MODIFIED    | Two-column layout with Basic Info (left) and Chassis (right), compact bottom row     |
| `unitState.ts`       | MODIFIED    | Add chassis, clanName, model, mulId (string), year (3145 default), rulesLevel fields |
| `useUnitStore.ts`    | MODIFIED    | Add setter actions for new identity fields                                           |

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

| Risk                   | Mitigation                                                   |
| ---------------------- | ------------------------------------------------------------ |
| Icons not intuitive    | Add tooltips; document icon universally means "new document" |
| Load dialog complexity | Reuse existing unit browser patterns                         |

## Success Criteria

- [x] Document icon creates new unit via existing modal
- [x] Folder icon opens unit load dialog
- [x] All toolbar actions accessible via keyboard shortcuts (Ctrl+N, Ctrl+O)
- [x] Unsaved changes protection works for all tab operations
- [x] Overview tab shows two-column layout with Basic Info and Chassis panels
- [x] Identity fields (Chassis, Clan Name, Model, MUL ID, Year, Tech Level) are editable
- [x] Tab name updates when Chassis or Model changes
- [x] MUL ID accepts text input (numbers and hyphens)
- [x] Year defaults to 3145, Tech Level defaults to Standard
