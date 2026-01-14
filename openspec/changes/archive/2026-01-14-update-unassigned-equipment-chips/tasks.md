# Tasks: Update Unassigned Equipment Chips

## 1. Create VerticalSlotChip Component

- [x] 1.1 Create `src/components/customizer/critical-slots/VerticalSlotChip.tsx`
- [x] 1.2 Define props interface: name, criticalSlots, isSelected, onClick
- [x] 1.3 Use `classifyEquipment()` from `@/utils/colors/equipmentColors` for color type
- [x] 1.4 Use `getEquipmentColors()` for bg/border/text classes (same as SlotRow)
- [x] 1.5 Set fixed width: 26px via inline style (matches SlotRow height)
- [x] 1.6 Set fixed height: 96px for vertical text display
- [x] 1.7 Apply `flexShrink: 0` and `padding: 0` to prevent auto-expansion
- [x] 1.8 Apply text rotation: `writing-mode: vertical-rl` + `transform: rotate(180deg)`
- [x] 1.9 Use 10px font size (matches SlotRow compact mode)
- [x] 1.10 Add selection ring: `ring-2 ring-accent` when isSelected
- [x] 1.11 Add hover brightness and active scale transition
- [x] 1.12 Memoize component with React.memo for performance

## 2. Create Equipment Name Abbreviations Utility

- [x] 2.1 Create `src/utils/equipmentNameAbbreviations.ts`
- [x] 2.2 Define ABBREVIATIONS array with regex patterns and replacements
- [x] 2.3 Include common abbreviations: (Clan)→(C), (Inner Sphere)→(IS), Extended Range→ER, etc.
- [x] 2.4 Export `abbreviateEquipmentName(name: string): string` function
- [x] 2.5 Apply abbreviations in order for consistent results

## 3. Integrate into CriticalSlotsTab

- [x] 3.1 Import VerticalSlotChip component
- [x] 3.2 Update `renderUnassignedChip` function to use VerticalSlotChip
- [x] 3.3 Pass name, criticalSlots, isSelected, onClick props
- [x] 3.4 Remove old inline chip styling code
- [x] 3.5 Remove unused imports (getCategoryColorsLegacy, EquipmentCategory)

## 4. Integrate into BottomSheetTray

- [x] 4.1 Import VerticalSlotChip component
- [x] 4.2 Update EquipmentChip function to use VerticalSlotChip
- [x] 4.3 Remove old inline chip styling code
- [x] 4.4 Remove unused imports (getCategoryColorsLegacy, abbreviateEquipmentName)

## 5. Update OpenSpec Documentation

- [x] 5.1 Add VerticalSlotChip Component requirement to spec
- [x] 5.2 Document fixed 26px width requirement with scenarios
- [x] 5.3 Document color logic matching SlotRow
- [x] 5.4 Document no auto-sizing constraint
- [x] 5.5 Validate spec with `openspec validate --strict`

## 6. Validation

- [x] 6.1 Verify build succeeds without errors
- [x] 6.2 Verify chip width visually matches SlotRow height
- [x] 6.3 Verify colors match SlotRow for same equipment names
- [x] 6.4 Test horizontal scrolling when many items are unassigned
- [x] 6.5 Test selection/deselection interaction works
- [x] 6.6 Test on mobile viewport sizes
