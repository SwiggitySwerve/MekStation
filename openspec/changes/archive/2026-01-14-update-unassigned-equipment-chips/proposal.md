# Change: Update Unassigned Equipment Chips

## Why

The Critical Slots tab uses inline vertical equipment chips to display unassigned equipment. The original implementation had issues:
1. Chips used category-based colors that didn't match the SlotRow colors below
2. Chip width was inconsistent and used flex/responsive sizing
3. Text styling didn't match SlotRow appearance
4. No reusable component existed for vertical slot display

The goal is to make unassigned equipment chips look like SlotRow components rotated 90 degrees - identical styling, just vertical orientation.

## What Changes

### New VerticalSlotChip Component
- Created `src/components/customizer/critical-slots/VerticalSlotChip.tsx`
- Fixed width of 26px (matches SlotRow height exactly)
- Uses same color logic as SlotRow: `classifyEquipment()` + `getEquipmentColors()`
- Text rotated via `writing-mode: vertical-rl` + `transform: rotate(180deg)`
- No flex expansion: inline styles with `flexShrink: 0`, `padding: 0`
- Selection state with `ring-2 ring-accent`

### Equipment Name Abbreviations Utility
- Created `src/utils/equipmentNameAbbreviations.ts`
- Common BattleTech abbreviations: (Clan) → (C), Extended Range → ER, etc.
- Used for compact display in space-constrained UI

### Integration
- CriticalSlotsTab uses VerticalSlotChip for unassigned equipment display
- BottomSheetTray uses VerticalSlotChip for consistency across mobile views
- Horizontal scrolling container with gap-1 spacing

## Impact

- Affected specs: `critical-slots-display`
- New files:
  - `src/components/customizer/critical-slots/VerticalSlotChip.tsx`
  - `src/utils/equipmentNameAbbreviations.ts`
- Modified files:
  - `src/components/customizer/tabs/CriticalSlotsTab.tsx`
  - `src/components/customizer/equipment/BottomSheetTray.tsx`
