# Tasks: Enhance Mobile Loadout Tray

## Status: Complete ✅

All tasks have been implemented and verified.

---

## Task 1: Mobile Status Bar Header ✅

**Status**: Complete

- [x] Create `MobileLoadoutHeader` component
- [x] Display compact stats: Weight, Slots, Heat, BV
- [x] Show equipment count badge
- [x] Implement expand/collapse toggle
- [x] Persist expanded state to localStorage

---

## Task 2: Mobile Equipment Row Component ✅

**Status**: Complete

- [x] Create `MobileEquipmentRow` component
- [x] Display equipment name with category color indicator
- [x] Show location, heat, crits, weight columns
- [x] Display weapon details (damage, range brackets, TC compatibility)
- [x] Show OmniMech pod/fixed badges
- [x] Compact row height (36px minimum)

---

## Task 3: Equipment List with Sections ✅

**Status**: Complete

- [x] Create `MobileLoadoutList` component
- [x] Implement Unassigned/Allocated section grouping
- [x] Add collapsible section headers with counts
- [x] Add category filter tabs
- [x] Add section-specific column headers
- [x] Implement "Clear All" functionality

---

## Task 4: Link Button for Unassigned Items ✅

**Status**: Complete

- [x] Add link icon (🔗) for unassigned equipment
- [x] Create location selection dropdown
- [x] Show available slots per location
- [x] Filter locations that can fit the equipment
- [x] Handle location restriction validation
- [x] Close dropdown on selection

---

## Task 5: Unlink Button for Allocated Items ✅

**Status**: Complete

- [x] Add breaking chain icon for allocated equipment
- [x] Implement two-tap confirmation
- [x] Call unassign handler on confirmation
- [x] Reset confirmation state on timeout

---

## Task 6: Remove Button with Confirmation ✅

**Status**: Complete

- [x] Add × icon for removable equipment
- [x] Implement two-tap confirmation
- [x] Ensure mutual exclusivity with unassign confirmation
- [x] Reset confirmation state on timeout

---

## Task 7: Exclusive Dropdown Behavior ✅

**Status**: Complete

- [x] Lift dropdown state to `MobileLoadoutList`
- [x] Track `openLocationMenuId` in parent
- [x] Pass controlled props to `MobileEquipmentRow`
- [x] Close other dropdowns when opening new one

---

## Task 8: Touch Target Optimization ✅

**Status**: Complete

- [x] Increase action column width to 36px
- [x] Make buttons fill full column area
- [x] Add hover/active background states
- [x] Use visible emoji/text icons instead of faint SVGs

---

## Task 9: Section Column Headers ✅

**Status**: Complete

- [x] Remove top-level header with scrollbar padding
- [x] Add `SectionColumnHeaders` inside each section
- [x] Reduce header height to compact 18px
- [x] Ensure perfect alignment with data rows

---

## Validation

- [x] TypeScript builds without errors
- [x] All components render correctly
- [x] Link dropdown shows correct locations
- [x] Unlink/remove confirmations work
- [x] Only one dropdown open at a time
- [x] Headers align with data rows
