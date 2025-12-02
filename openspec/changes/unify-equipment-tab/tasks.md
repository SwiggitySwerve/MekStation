# Tasks: Unify Equipment Tab with Global Loadout Tray

## 1. Tab Configuration Update
- [x] 1.1 Remove "weapons" tab from DEFAULT_CUSTOMIZER_TABS in CustomizerTabs.tsx
- [x] 1.2 Update customizer-tabs spec to reflect 6 tabs (remove Weapons reference)
- [x] 1.3 Remove PlaceholderTab for weapons in CustomizerContent.tsx

## 2. Global Status Bar Component
- [x] 2.1 Create GlobalStatusBar component with weight/slots/heat display
- [x] 2.2 Include structural slots in calculation (Endo Steel, Ferro-Fibrous)
- [x] 2.3 Style status bar with warning states for over-capacity
- [x] 2.4 Integrate status bar at bottom of CustomizerContent (visible on all tabs)

## 3. Global Loadout Tray Component
- [x] 3.1 Modify EquipmentTray to be global (render in CustomizerContent, not EquipmentTab)
- [x] 3.2 Position tray at right edge (280px width when expanded)
- [x] 3.3 Implement fixed header with title, item count, Remove, Remove All buttons
- [x] 3.4 Add collapsible category sections (Energy, Ballistic, Missile, Ammo, Electronics, etc.)
- [x] 3.5 Implement category collapse/expand with state persistence
- [x] 3.6 Add expand/collapse toggle button for entire tray
- [x] 3.7 Persist tray expand/collapse state across tab switches
- [x] 3.8 Exclude structural components (Endo Steel, Ferro-Fibrous) from tray display

## 4. Category Toggle Filters
- [x] 4.1 Create CategoryToggleBar component with toggle buttons
- [x] 4.2 Implement Show toggles: Energy, Ballistic, Missile, Artillery, Physical, Ammo, Other, Show All
- [x] 4.3 Implement Hide toggles: Prototype, One-Shot, Unavailable
- [x] 4.4 Add multi-select support (multiple categories active simultaneously)
- [x] 4.5 Update useEquipmentStore to support array of active categories

## 5. Equipment Browser Updates
- [x] 5.1 Replace EquipmentFilters dropdown with CategoryToggleBar
- [x] 5.2 Add text filter with clear button
- [x] 5.3 Update table columns: Name, Damage, Heat, Min R, Range, Weight, Crit
- [x] 5.4 Add Add button column for each equipment row

## 6. Equipment Tab Layout
- [x] 6.1 Redesign EquipmentTab to use full width (tray is global now)
- [x] 6.2 Integrate CategoryToggleBar and HideToggleBar at top
- [x] 6.3 Equipment browser table fills remaining space

## 7. Structural Slot Handling
- [x] 7.1 Add slot calculation for Endo Steel (14 IS / 7 Clan) - already in useUnitCalculations
- [x] 7.2 Add slot calculation for Ferro-Fibrous (14 IS / 7 Clan) - already in useUnitCalculations
- [ ] 7.3 Update Critical Slots display to show structural slots with distinct "unhittable" styling
- [x] 7.4 Ensure structural slots appear in total slot count but not in loadout tray

## 8. Spec Updates
- [x] 8.1 Update equipment-browser spec with toggle button requirements
- [x] 8.2 Update equipment-tray spec for global tray behavior
- [x] 8.3 Update customizer-tabs spec to remove weapons tab reference

## 9. Testing & Validation
- [x] 9.1 Test adding equipment from browser to tray
- [x] 9.2 Test removing equipment via tray buttons
- [x] 9.3 Test Remove All functionality with confirmation
- [x] 9.4 Test category toggles filter correctly
- [x] 9.5 Test hide toggles filter correctly
- [x] 9.6 Verify tray visibility across all tabs
- [x] 9.7 Verify status bar updates in real-time
- [x] 9.8 Test tray collapse/expand persistence
- [ ] 9.9 Verify structural slots display correctly in Criticals tab
