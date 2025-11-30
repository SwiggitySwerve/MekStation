# Tasks: Add Customizer UI Components

## 1. Foundation Components
- [ ] 1.1 Create color system utilities (`src/utils/colors/`)
- [ ] 1.2 Create Zustand unit store (`src/stores/unitStore.ts`)
- [ ] 1.3 Create `useUnit` hook for active unit context
- [ ] 1.4 Create base component directory structure

## 2. Multi-Unit Tab System
- [ ] 2.1 Implement `MultiUnitProvider` with Zustand integration
- [ ] 2.2 Implement `TabManager` component for tab bar
- [ ] 2.3 Implement `NewTabModal` with template/copy/import modes
- [ ] 2.4 Add tab persistence to localStorage
- [ ] 2.5 Add unsaved changes protection

## 3. Unit Info Banner
- [ ] 3.1 Implement `UnitInfoBanner` with three-section layout
- [ ] 3.2 Create `StatCell` component for individual stats
- [ ] 3.3 Add validation status indicator
- [ ] 3.4 Add reset and debug action buttons

## 4. Customizer Tabs Framework
- [ ] 4.1 Implement tab navigation component
- [ ] 4.2 Create tab component pattern with `readOnly` support
- [ ] 4.3 Implement Overview tab (placeholder)
- [ ] 4.4 Implement Structure tab (placeholder)
- [ ] 4.5 Implement Fluff tab (placeholder)

## 5. Armor Diagram
- [ ] 5.1 Create SVG mech silhouette component
- [ ] 5.2 Implement `ArmorDiagramDisplay` with click selection
- [ ] 5.3 Add real-time armor value overlays
- [ ] 5.4 Implement location color coding
- [ ] 5.5 Add auto-allocate button integration

## 6. Equipment Browser
- [ ] 6.1 Create `useEquipmentBrowser` hook with filtering
- [ ] 6.2 Implement `EquipmentBrowser` table component
- [ ] 6.3 Add tech base, category, and search filters
- [ ] 6.4 Add pagination controls
- [ ] 6.5 Implement "Add to unit" action

## 7. Equipment Tray
- [ ] 7.1 Implement expandable sidebar layout
- [ ] 7.2 Create statistics summary panel
- [ ] 7.3 Implement categorized equipment list
- [ ] 7.4 Add double-click removal functionality
- [ ] 7.5 Add capacity warning banner

## 8. Critical Slots Display
- [ ] 8.1 Create `CriticalSlotDropZone` with DnD support
- [ ] 8.2 Implement location-based grid layout
- [ ] 8.3 Add system component and equipment coloring
- [ ] 8.4 Implement multi-slot equipment visualization
- [ ] 8.5 Add toolbar with auto-mode toggles
- [ ] 8.6 Create unallocated equipment sidebar

## 9. Color System Integration
- [ ] 9.1 Create `classifyEquipment` utility function
- [ ] 9.2 Create `getBattleTechEquipmentClasses` function
- [ ] 9.3 Create `getTechBaseColors` function
- [ ] 9.4 Implement `UnifiedColorLegend` component
- [ ] 9.5 Create `criticalSlots.module.css` styles

## 10. Confirmation Dialogs
- [ ] 10.1 Create modal overlay component
- [ ] 10.2 Implement `ResetConfirmationDialog` with options
- [ ] 10.3 Add impact preview grid
- [ ] 10.4 Implement progress tracking during reset
- [ ] 10.5 Add success/error result feedback

## 11. Integration & Polish
- [ ] 11.1 Wire up customizer page with all components
- [ ] 11.2 Add keyboard navigation support
- [ ] 11.3 Add tooltips and accessibility labels
- [ ] 11.4 Performance optimization (memoization)

