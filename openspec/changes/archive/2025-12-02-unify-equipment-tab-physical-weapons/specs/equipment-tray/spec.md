# equipment-tray Spec Delta

## MODIFIED Requirements

### Requirement: Global Loadout Tray
The Equipment Loadout Tray SHALL render as an expandable sidebar on the RIGHT edge of the customizer, visible across ALL tabs.

#### Scenario: Tray visibility
- **WHEN** user is on any customizer tab (Overview, Structure, Armor, Equipment, Criticals, Fluff)
- **THEN** loadout tray toggle is visible at right edge of screen
- **AND** tray can be expanded/collapsed independently of active tab
- **AND** tray state persists across tab switches

#### Scenario: Expanded state
- **WHEN** user clicks tray toggle to expand
- **THEN** tray slides in from right (280px width)
- **AND** tab content area shrinks to accommodate tray
- **AND** transition is smooth (300ms ease-in-out)

#### Scenario: Collapsed state
- **WHEN** tray is collapsed
- **THEN** a vertical toggle button is visible at right edge
- **AND** button displays equipment count badge
- **AND** clicking toggle expands the tray

### Requirement: Tray Header with Actions
The Loadout Tray SHALL display action buttons in a fixed header that does not scroll.

#### Scenario: Header layout
- **WHEN** tray is expanded
- **THEN** header shows "Loadout" title and item count
- **AND** "Remove" button is in header (removes selected item)
- **AND** "Remove All" button is in header
- **AND** header remains fixed when equipment list scrolls

#### Scenario: Remove all confirmation
- **WHEN** user clicks "Remove All" button
- **THEN** confirmation dialog appears
- **AND** confirming removes all user-added equipment
- **AND** structural components (engine, gyro, etc.) are NOT removed

### Requirement: Categorized Equipment Display
The Loadout Tray SHALL group mounted equipment by category with collapsible sections.

#### Scenario: Category grouping
- **WHEN** equipment is mounted
- **THEN** items are grouped into collapsible sections: Energy Weapons, Ballistic Weapons, Missile Weapons, Ammunition, Electronics, Physical Weapons, Misc Equipment
- **AND** each section header shows category name and item count
- **AND** empty categories are hidden

#### Scenario: Category collapse/expand
- **WHEN** user clicks category header
- **THEN** category section toggles between collapsed and expanded
- **AND** collapse state is remembered within session

#### Scenario: Equipment row display
- **WHEN** equipment item renders in category
- **THEN** row shows: Name, Weight (tons), Slots, Location (if allocated)
- **AND** unallocated items show "Unallocated" in amber text
- **AND** clicking row selects it for removal

### Requirement: Structural Slot Components
The system SHALL distinguish between user-added equipment and structural slot components.

#### Scenario: Structural components excluded from tray
- **WHEN** unit has Endo Steel internal structure
- **THEN** Endo Steel slots are NOT shown in loadout tray
- **AND** Endo Steel is managed via Structure tab
- **BUT** Endo Steel slots appear in Critical Slots display

#### Scenario: Ferro-Fibrous armor handling
- **WHEN** unit has Ferro-Fibrous armor
- **THEN** Ferro-Fibrous slots are NOT shown in loadout tray
- **AND** Ferro-Fibrous is managed via Armor tab
- **BUT** Ferro-Fibrous slots appear in Critical Slots display

#### Scenario: Unhittable slot display in Criticals
- **WHEN** viewing Critical Slots tab
- **THEN** Endo Steel and Ferro-Fibrous slots are shown with distinct styling
- **AND** slots are marked as "unhittable" (cannot be destroyed by critical hits)
- **AND** slots are distributed across locations per BattleTech rules

### Requirement: Global Status Bar
The customizer SHALL display a persistent status bar showing capacity utilization across all tabs.

#### Scenario: Status bar display
- **WHEN** user is on any customizer tab
- **THEN** status bar shows at bottom of customizer
- **AND** displays: Weight (used/max with remaining), Free Slots (used/total), Heat (generated/dissipated)

#### Scenario: Over-capacity warning
- **WHEN** weight exceeds tonnage or slots exceed available
- **THEN** affected stat displays in red/warning color
- **AND** remaining value shows as negative

#### Scenario: Slot calculation includes structural
- **WHEN** calculating used slots
- **THEN** count includes Endo Steel slots (14 IS / 7 Clan)
- **AND** count includes Ferro-Fibrous slots (14 IS / 7 Clan)
- **AND** count includes all mounted equipment slots

