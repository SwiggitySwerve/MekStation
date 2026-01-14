# Proposal: Enhance Mobile Loadout Tray

## Change ID
`enhance-mobile-loadout-tray`

## Summary
Redesign the mobile equipment loadout tray to maximize information density, improve touch interactions, and provide quick equipment assignment functionality.

## Motivation
The existing mobile loadout view did not effectively use screen space for displaying equipment information. Users needed:
- A way to see equipment details (damage, range, heat, slots, weight) at a glance
- Quick actions to assign unassigned equipment to mech locations
- Quick actions to unassign allocated equipment
- Confirmation steps to prevent accidental modifications
- Better visual alignment between headers and data rows

## Scope

### In Scope
- Redesigned mobile loadout tray with expandable bottom sheet
- Two-state UI: collapsed status bar and expanded full-screen list
- Equipment rows with detailed weapon information (damage, ranges, TC compatibility)
- Link button for unassigned items with location dropdown
- Unlink button for allocated items with confirmation
- Remove button with confirmation
- Section-specific column headers (Unassigned/Allocated)
- Proper 36px touch targets for action buttons
- Single dropdown open at a time (exclusive menu state)

### Out of Scope
- Desktop loadout tray changes
- Equipment browser modifications
- Drag-and-drop assignment

## Impact

### User Experience
- Faster equipment management on mobile devices
- Clearer visibility of equipment stats
- Reduced accidental modifications via confirmation dialogs
- More intuitive quick-assign workflow

### Technical
- New `MobileLoadoutList` component
- New `MobileEquipmentRow` component
- New `MobileLoadoutHeader` component
- Updated `BottomSheetTray` to pass location availability
- State lifted to parent for exclusive dropdown behavior

## Dependencies
- Existing `customizer-responsive-layout` spec for responsive behavior
- Equipment registry for weapon data lookup

## Risks
- None identified - implementation complete and tested

## Related Specs
- `customizer-responsive-layout` - Parent spec for responsive customizer behavior
