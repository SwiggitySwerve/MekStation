# mobile-loadout-tray Specification

## Purpose
TBD - created by archiving change enhance-mobile-loadout-tray. Update Purpose after archive.
## Requirements
### Requirement: Mobile Loadout Status Bar

The mobile loadout SHALL display a compact status bar when collapsed.

#### Scenario: Collapsed status bar display
- **WHEN** the loadout tray is in collapsed state
- **THEN** a fixed status bar appears at the bottom of the screen
- **AND** displays Weight (used/max), Slots (used/max), Heat (generated/dissipation), and BV
- **AND** shows equipment count badge
- **AND** tapping the bar expands to full-screen view

#### Scenario: Weight overage indication
- **WHEN** weight used exceeds weight maximum
- **THEN** weight value displays in red color

#### Scenario: Slots overage indication
- **WHEN** slots used exceeds slots maximum
- **THEN** slots value displays in red color

---

### Requirement: Mobile Equipment Row Display

Each equipment item SHALL display comprehensive information in a compact row.

#### Scenario: Equipment name and category
- **WHEN** rendering an equipment row
- **THEN** display the equipment name
- **AND** show a colored category indicator bar (energy=cyan, ballistic=red, missile=orange, etc.)
- **AND** show OmniMech pod/fixed badge when applicable

#### Scenario: Equipment stats columns
- **WHEN** rendering an equipment row
- **THEN** display columns for: Location (or dash if unassigned), Heat, Crits, Weight
- **AND** columns align with section header columns

#### Scenario: Weapon details display
- **WHEN** equipment is a weapon
- **THEN** display damage value, range brackets (S/M/L format)
- **AND** show TC indicator if targeting computer compatible

---

### Requirement: Section Grouping with Headers

Equipment SHALL be grouped into Unassigned and Allocated sections.

#### Scenario: Unassigned section
- **WHEN** equipment has no assigned location
- **THEN** display in Unassigned section with amber background tint
- **AND** section header shows "Unassigned" with item count
- **AND** section is collapsible

#### Scenario: Allocated section
- **WHEN** equipment has an assigned location
- **THEN** display in Allocated section with green background tint
- **AND** section header shows "Allocated" with item count
- **AND** section is collapsible

#### Scenario: Section column headers
- **WHEN** a section is expanded
- **THEN** display compact column headers (NAME, LOC, H, C, WT, 🔗, ×)
- **AND** headers appear inside the section content area
- **AND** headers align exactly with data row columns

---

### Requirement: Quick Assign via Link Button

Unassigned equipment SHALL have a link button for quick assignment.

#### Scenario: Link button display
- **WHEN** equipment is unassigned and removable
- **AND** at least one location can fit the equipment
- **THEN** display a link icon (🔗) in the actions column

#### Scenario: Location dropdown display
- **WHEN** user taps the link button
- **THEN** display a dropdown with available locations
- **AND** each location shows name and available slot count
- **AND** only locations that can fit the equipment are selectable

#### Scenario: Location selection
- **WHEN** user selects a location from the dropdown
- **THEN** equipment is assigned to first available slot in that location
- **AND** dropdown closes
- **AND** equipment moves to Allocated section

#### Scenario: Exclusive dropdown behavior
- **WHEN** user opens a link dropdown
- **THEN** any other open dropdown closes
- **AND** only one dropdown is visible at a time

---

### Requirement: Unlink Button for Allocated Equipment

Allocated equipment SHALL have an unlink button with confirmation.

#### Scenario: Unlink button display
- **WHEN** equipment is allocated and removable
- **THEN** display a breaking chain icon in the actions column

#### Scenario: Unlink confirmation
- **WHEN** user taps the unlink button
- **THEN** button changes to show "?" confirmation indicator
- **AND** tapping again confirms and unassigns the equipment
- **AND** tapping elsewhere or waiting resets the confirmation state

---

### Requirement: Remove Button with Confirmation

Removable equipment SHALL have a remove button with confirmation.

#### Scenario: Remove button display
- **WHEN** equipment is removable
- **THEN** display an × icon in the actions column

#### Scenario: Remove confirmation
- **WHEN** user taps the remove button
- **THEN** button changes to show "?" confirmation indicator
- **AND** tapping again confirms and removes the equipment
- **AND** tapping elsewhere or waiting resets the confirmation state

#### Scenario: Mutual exclusivity with unlink
- **WHEN** remove confirmation is active
- **THEN** unlink confirmation is reset
- **AND** vice versa

---

### Requirement: Touch-Friendly Action Columns

Action buttons SHALL have proper touch target sizes.

#### Scenario: Action column dimensions
- **WHEN** rendering action columns (link/unlink, remove)
- **THEN** each column is 36px wide
- **AND** buttons fill the entire column area
- **AND** buttons show hover/active background feedback

#### Scenario: Visual feedback on interaction
- **WHEN** user hovers or taps an action button
- **THEN** background color changes to indicate interaction
- **AND** confirmation state shows distinct background color

---

### Requirement: Category Filtering

Users SHALL be able to filter equipment by category.

#### Scenario: Category filter tabs
- **WHEN** loadout tray is expanded
- **THEN** display category filter tabs (All, Energy, Ballistic, Missile, Ammo, Electronics, Other)
- **AND** active tab is visually highlighted

#### Scenario: Filter application
- **WHEN** user selects a category filter
- **THEN** only equipment matching that category is displayed
- **AND** both Unassigned and Allocated sections are filtered

---

### Requirement: Clear All Equipment

Users SHALL be able to remove all equipment at once.

#### Scenario: Clear All button
- **WHEN** loadout tray has removable equipment
- **THEN** display "Clear All" button in the header
- **AND** tapping removes all removable equipment

