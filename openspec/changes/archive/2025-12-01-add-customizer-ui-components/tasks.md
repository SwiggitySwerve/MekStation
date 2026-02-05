# Tasks: Add Customizer UI Components

## 1. Foundation Components

- [x] 1.1 Create color system utilities (`src/utils/colors/`)
- [x] 1.2 Create Zustand unit store (`src/stores/unitStore.ts`)
- [x] 1.3 Create `useUnit` hook for active unit context
- [x] 1.4 Create base component directory structure

## 2. Multi-Unit Tab System

- [x] 2.1 Implement `MultiUnitProvider` with Zustand integration
- [x] 2.2 Implement `TabManager` component for tab bar
- [x] 2.3 Implement `NewTabModal` with template/copy/import modes
- [x] 2.4 Add tab persistence to localStorage
- [x] 2.5 Add unsaved changes protection

## 3. Unit Info Banner

- [x] 3.1 Implement `UnitInfoBanner` with three-section layout
- [x] 3.2 Create `StatCell` component for individual stats
- [x] 3.3 Add validation status indicator
- [x] 3.4 Add reset and debug action buttons

## 4. Customizer Tabs Framework

- [x] 4.1 Implement tab navigation component
- [x] 4.2 Create tab component pattern with `readOnly` support
- [x] 4.3 Implement Overview tab (placeholder)
- [x] 4.4 Implement Structure tab (placeholder)
- [x] 4.5 Implement Fluff tab (placeholder)

## 5. Armor Diagram

- [x] 5.1 Create SVG mech silhouette component
- [x] 5.2 Implement `ArmorDiagramDisplay` with click selection
- [x] 5.3 Add real-time armor value overlays
- [x] 5.4 Implement location color coding
- [x] 5.5 Add auto-allocate button integration

## 6. Equipment Browser

- [x] 6.1 Create `useEquipmentBrowser` hook with filtering
- [x] 6.2 Implement `EquipmentBrowser` table component
- [x] 6.3 Add tech base, category, and search filters
- [x] 6.4 Add pagination controls
- [x] 6.5 Implement "Add to unit" action

## 7. Equipment Tray

- [x] 7.1 Implement expandable sidebar layout
- [x] 7.2 Create statistics summary panel
- [x] 7.3 Implement categorized equipment list
- [x] 7.4 Add double-click removal functionality
- [x] 7.5 Add capacity warning banner

## 8. Critical Slots Display

- [x] 8.1 Create `CriticalSlotDropZone` with DnD support
- [x] 8.2 Implement location-based grid layout
- [x] 8.3 Add system component and equipment coloring
- [x] 8.4 Implement multi-slot equipment visualization
- [x] 8.5 Add toolbar with auto-mode toggles
- [x] 8.6 Create unallocated equipment sidebar

## 9. Color System Integration

- [x] 9.1 Create `classifyEquipment` utility function
- [x] 9.2 Create `getBattleTechEquipmentClasses` function
- [x] 9.3 Create `getTechBaseColors` function
- [x] 9.4 Implement `UnifiedColorLegend` component
- [x] 9.5 Create `criticalSlots.module.css` styles (N/A - using Tailwind CSS)

## 10. Confirmation Dialogs

- [x] 10.1 Create modal overlay component
- [x] 10.2 Implement `ResetConfirmationDialog` with options
- [x] 10.3 Add impact preview grid
- [x] 10.4 Implement progress tracking during reset
- [x] 10.5 Add success/error result feedback

## 11. Integration & Polish

- [x] 11.1 Wire up customizer page with all components
- [x] 11.2 Add keyboard navigation support
- [x] 11.3 Add tooltips and accessibility labels
- [x] 11.4 Performance optimization (memoization)

## 12. Tech Base Validation & Selection Memory

- [x] 12.1 Implement tech base filtering for component options
- [x] 12.2 Create ComponentValidator registry pattern
- [x] 12.3 Add auto-correction when tech base changes
- [x] 12.4 Add selection memory interface (ISelectionMemory)
- [x] 12.5 Implement save/restore selection from memory
- [x] 12.6 Persist selection memory to localStorage
- [x] 12.7 Test memory restoration across page refreshes
