## MODIFIED Requirements

### Requirement: State Persistence
Tab state and unit configuration SHALL be preserved across browser sessions and tab navigation.

#### Scenario: Session save
- **WHEN** user makes changes
- **THEN** state is saved to localStorage via Zustand
- **AND** save is debounced to reduce writes

#### Scenario: Session restore
- **WHEN** user reopens customizer
- **THEN** previous tabs are restored
- **AND** active tab is restored
- **AND** modification flags are preserved

#### Scenario: Session restore with invalid tab IDs
- **WHEN** user reopens customizer with cached tabs that have missing or invalid UUIDs
- **THEN** new valid UUIDs are generated for affected tabs
- **AND** a warning is logged indicating which tabs were repaired
- **AND** the UI remains functional with repaired tabs
- **AND** unit stores are re-associated with the new tab IDs

#### Scenario: Unit configuration persistence
- **WHEN** user modifies unit tech base, armor, or equipment
- **THEN** changes are stored in the unit's tab state
- **AND** changes persist when navigating to other customizer tabs (Overview, Structure, Armor, etc.)
- **AND** changes persist across browser sessions via localStorage

#### Scenario: Tech base configuration persistence
- **WHEN** user sets tech base mode (Inner Sphere/Clan/Mixed)
- **AND** user configures per-component tech bases
- **THEN** all selections are preserved in the unit tab
- **AND** selections restore when returning to Overview tab

#### Scenario: Cross-tab state isolation
- **WHEN** multiple unit tabs are open
- **THEN** each tab maintains its own independent configuration state
- **AND** changes to one tab do not affect other tabs

## ADDED Requirements

### Requirement: Tab Navigation Resilience
The system SHALL maintain tab navigation functionality even when URL state is incomplete.

#### Scenario: Navigation from index page with active tab
- **WHEN** user is on `/customizer` (index page) without unit ID in URL
- **AND** an active tab exists in the tab manager store
- **THEN** clicking a customizer tab (Structure, Armor, etc.) navigates successfully
- **AND** the URL is updated to include the active unit's ID
- **AND** the selected tab content is displayed

#### Scenario: Navigation with no active tab
- **WHEN** user is on `/customizer` with no tabs open
- **AND** user attempts to switch customizer tabs
- **THEN** no navigation error occurs
- **AND** the empty state remains displayed

#### Scenario: URL sync on tab selection
- **WHEN** user selects a unit tab from the tab bar
- **THEN** the URL is updated to `/customizer/{unitId}/{tabId}`
- **AND** subsequent tab navigation uses the URL unit ID

