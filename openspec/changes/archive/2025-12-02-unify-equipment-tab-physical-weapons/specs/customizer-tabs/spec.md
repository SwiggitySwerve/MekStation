# customizer-tabs Spec Delta

## MODIFIED Requirements

### Requirement: Tab Navigation
The customizer SHALL provide a tabbed navigation interface with six tabs: Overview, Structure, Armor, Equipment, Criticals, and Fluff.

#### Scenario: User navigates between tabs
- **WHEN** user clicks on a tab label
- **THEN** the corresponding tab content is displayed
- **AND** the active tab is visually highlighted
- **AND** other tab contents are hidden

#### Scenario: Tab state persistence
- **WHEN** user selects a tab and refreshes the page
- **THEN** the previously selected tab is restored from localStorage

### Requirement: Equipment Tab
The Equipment tab SHALL provide a unified equipment browser for selecting, adding, and managing all equipment types including weapons, ammunition, electronics, and miscellaneous equipment.

#### Scenario: Unified equipment management
- **WHEN** user navigates to Equipment tab
- **THEN** a compact loadout sidebar shows all mounted equipment
- **AND** an equipment browser allows searching and filtering all equipment types
- **AND** a status bar displays weight, slots, and heat summary

#### Scenario: Add equipment to unit
- **WHEN** user clicks Add button on equipment item in browser
- **THEN** equipment is added to the mounted equipment list
- **AND** loadout sidebar updates immediately
- **AND** status bar reflects updated totals

#### Scenario: Equipment filtering
- **WHEN** user applies filters via category toggles or text search
- **THEN** equipment browser shows only matching items
- **AND** multiple category toggles can be active simultaneously

