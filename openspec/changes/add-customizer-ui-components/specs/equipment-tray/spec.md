## ADDED Requirements

### Requirement: Expandable Sidebar Layout
The Equipment Tray SHALL render as a collapsible sidebar on the right edge of the screen.

#### Scenario: Collapsed state
- **WHEN** tray is collapsed
- **THEN** a vertical toggle button is visible at screen edge
- **AND** button displays equipment count badge
- **AND** button shows Equipment label rotated vertically

#### Scenario: Expanded state
- **WHEN** user clicks toggle button
- **THEN** tray slides in from right (320px width)
- **AND** transition duration is 300ms ease-in-out
- **AND** toggle button moves to left edge of tray

#### Scenario: Mobile backdrop
- **WHEN** tray is expanded on mobile viewport
- **THEN** semi-transparent backdrop overlay appears
- **AND** clicking backdrop closes tray

### Requirement: Summary Statistics Panel
The Equipment Tray SHALL display aggregate statistics for all equipment in a header section.

#### Scenario: Statistics grid display
- **WHEN** tray is expanded
- **THEN** 2x2 grid shows Items count, Total weight, Total slots, Total heat
- **AND** weight shows as X.Xt format

#### Scenario: Overweight indication
- **WHEN** equipment weight exceeds remaining tonnage
- **THEN** weight value displays in red
- **AND** capacity warning banner appears

#### Scenario: Over-slots indication
- **WHEN** equipment slots exceed available critical slots
- **THEN** slots value displays in red
- **AND** capacity warning specifies overage amount

### Requirement: Categorized Equipment List
The Equipment Tray SHALL group equipment by type category.

#### Scenario: Category grouping
- **WHEN** equipment exists in tray
- **THEN** items are grouped into categories
- **AND** each category has header with name and item count
- **AND** categories with no items are hidden

#### Scenario: Category visual separator
- **WHEN** category header renders
- **THEN** header shows category name on left
- **AND** horizontal line spans remaining width
- **AND** item count badge on right

### Requirement: Equipment Item Display
Each equipment item SHALL display key information in a compact, color-coded format.

#### Scenario: Item card rendering
- **WHEN** equipment item renders
- **THEN** background color matches equipment type
- **AND** border color is slightly darker variant
- **AND** name is displayed with tech base abbreviation badge

#### Scenario: Stats line
- **WHEN** equipment item renders
- **THEN** stats show slots, weight, heat (if non-zero)
- **AND** stats are separated by bullet characters

### Requirement: Equipment Removal
The Equipment Tray SHALL allow users to remove equipment by double-clicking items.

#### Scenario: Removable equipment
- **WHEN** user double-clicks a weapon or equipment item
- **THEN** item is removed from unit
- **AND** item disappears from tray
- **AND** statistics update immediately

#### Scenario: Non-removable configuration components
- **WHEN** user double-clicks a configuration component
- **THEN** removal is blocked
- **AND** tooltip shows which tab manages that component

### Requirement: Hide Structural Toggle
The Equipment Tray SHALL provide option to hide structural components.

#### Scenario: Toggle behavior
- **WHEN** user checks hide structural option
- **THEN** Structural category is hidden from list
- **AND** structural items remain on unit

### Requirement: Empty State
The Equipment Tray SHALL display helpful guidance when no equipment is added.

#### Scenario: Empty state rendering
- **WHEN** no equipment exists on unit
- **THEN** centered message shows gear emoji icon
- **AND** No Equipment Added heading is displayed
- **AND** Go to Equipment Tab button is shown

### Requirement: Capacity Warning Banner
The Equipment Tray SHALL display warnings when unit limits are exceeded.

#### Scenario: Warning banner display
- **WHEN** weight or slots exceed capacity
- **THEN** red warning banner appears below statistics
- **AND** warning icon is shown

#### Scenario: Warning content
- **WHEN** weight is exceeded
- **THEN** message shows Weight over by X.Xt

