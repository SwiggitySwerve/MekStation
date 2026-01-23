# app-navigation Delta

## ADDED Requirements

### Requirement: Expandable Navigation Section

The sidebar SHALL support expandable/collapsible navigation sections for grouping related pages.

#### Scenario: Expand section on click

- **WHEN** a collapsed expandable section header is clicked
- **THEN** the section expands to show child navigation items
- **AND** the chevron icon rotates from right-pointing to down-pointing
- **AND** the expansion is animated smoothly (max-height transition)

#### Scenario: Collapse section on click

- **WHEN** an expanded section header is clicked
- **THEN** the section collapses to hide child navigation items
- **AND** the chevron icon rotates from down-pointing to right-pointing
- **AND** the collapse is animated smoothly

#### Scenario: Default to collapsed state

- **WHEN** the sidebar is first rendered
- **THEN** expandable sections are collapsed by default
- **AND** only the section header (icon, title, chevron) is visible

#### Scenario: Active state highlighting

- **WHEN** the current route matches any child item in an expandable section
- **THEN** the section header is highlighted with accent styling
- **AND** if the section is expanded, the active child item is also highlighted

### Requirement: Collapsed Sidebar Expandable Behavior

When the sidebar is in icon-only (collapsed) mode, expandable sections SHALL show a tooltip with clickable links.

#### Scenario: Hover tooltip with links

- **WHEN** the sidebar is collapsed (icon-only mode)
- **AND** the user hovers over an expandable section icon
- **THEN** a tooltip appears showing the section title and all child items as links
- **AND** each link navigates to the corresponding page when clicked

#### Scenario: Tooltip link navigation

- **WHEN** a link in the expandable section tooltip is clicked
- **THEN** navigation proceeds to the selected page
- **AND** the tooltip closes
- **AND** on mobile, the sidebar drawer closes

#### Scenario: Mobile drawer shows expanded

- **WHEN** the mobile sidebar drawer is open
- **THEN** expandable sections display in their current expand/collapse state
- **AND** the collapse/expand toggle remains functional
- **AND** the tooltip-with-links behavior is NOT used (full labels visible)
