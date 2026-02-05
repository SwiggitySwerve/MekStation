## MODIFIED Requirements

### Requirement: Tab Navigation

The customizer SHALL provide a tabbed navigation interface with seven tabs: Overview, Structure, Armor, Equipment, Criticals, Fluff, and Preview.

#### Scenario: User navigates between tabs

- **WHEN** user clicks on a tab label
- **THEN** the corresponding tab content is displayed
- **AND** the active tab is visually highlighted
- **AND** other tab contents are hidden

#### Scenario: Tab state persistence

- **WHEN** user selects a tab and refreshes the page
- **THEN** the previously selected tab is restored from localStorage

---

## ADDED Requirements

### Requirement: Preview Tab

The Preview tab SHALL display a live record sheet preview with export options.

**Rationale**: Users need to see their record sheet before printing or exporting for tabletop play.

**Priority**: High

#### Scenario: Preview tab display

- **WHEN** user navigates to Preview tab
- **THEN** a toolbar with Download PDF and Print buttons is displayed
- **AND** a record sheet preview canvas is displayed below
- **AND** preview shows current unit configuration

#### Scenario: Preview updates on unit change

- **GIVEN** user is viewing Preview tab
- **WHEN** user switches to another tab and modifies unit
- **AND** user returns to Preview tab
- **THEN** preview reflects the updated configuration

#### Scenario: Download PDF action

- **WHEN** user clicks Download PDF button in Preview tab
- **THEN** a PDF file is generated and downloaded
- **AND** filename follows pattern "{chassis}-{model}.pdf"

#### Scenario: Print action

- **WHEN** user clicks Print button in Preview tab
- **THEN** browser print dialog opens
- **AND** print content matches preview display
