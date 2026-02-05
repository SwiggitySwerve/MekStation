# customizer-responsive-layout Specification

## Purpose

TBD - created by archiving change improve-customizer-mobile-responsiveness. Update Purpose after archive.

## Requirements

### Requirement: Adaptive Tab Navigation

The customizer tabs SHALL display in an adaptive format based on viewport width.

#### Scenario: Icon-only tabs on small screens

- **WHEN** viewport width is below 640px (sm breakpoint)
- **THEN** tabs display icons only without text labels
- **AND** each tab has minimum 44px touch target height
- **AND** tabs are horizontally scrollable when they overflow

#### Scenario: Icon and label tabs on larger screens

- **WHEN** viewport width is 640px or greater
- **THEN** tabs display both icons and text labels
- **AND** horizontal scrolling is available if needed

#### Scenario: Tab scroll indicators

- **WHEN** tabs overflow the visible container width
- **THEN** gradient fade indicators appear on the overflow side
- **AND** users can scroll horizontally to see all tabs

---

### Requirement: Responsive Loadout Sidebar

The loadout tray SHALL adapt its presentation based on viewport width and user preference.

#### Scenario: Bottom sheet on mobile

- **WHEN** viewport width is below 768px (md breakpoint)
- **THEN** loadout displays as a draggable bottom sheet
- **AND** bottom sheet has collapsed, half, and expanded states
- **AND** swipe gestures control sheet expansion

#### Scenario: Collapsed sidebar on medium screens

- **WHEN** viewport width is between 768px and 1024px
- **THEN** sidebar defaults to collapsed state (40px width)
- **AND** expand toggle button is prominently visible
- **AND** equipment count badge is shown in collapsed state

#### Scenario: Expanded sidebar on large screens

- **WHEN** viewport width is 1024px or greater
- **THEN** sidebar defaults to expanded state (240px width)
- **AND** user can collapse it manually if desired

#### Scenario: Manual sidebar toggle

- **WHEN** user clicks the expand/collapse toggle
- **THEN** sidebar transitions smoothly between states
- **AND** preference persists during the session

---

### Requirement: Responsive Content Layout

Tab content layouts SHALL adapt to available horizontal space.

#### Scenario: Single column on narrow viewports

- **WHEN** viewport width is below 1024px with sidebar present
- **OR** viewport width is below 768px without sidebar
- **THEN** two-column content layouts stack to single column
- **AND** all content remains accessible via scrolling

#### Scenario: Two column on wide viewports

- **WHEN** viewport width is 1024px or greater with sidebar
- **OR** viewport width is 768px or greater without sidebar
- **THEN** content displays in two-column layout where applicable

#### Scenario: Content does not overflow horizontally

- **WHEN** content is rendered at any viewport width
- **THEN** no horizontal page-level scrollbar appears
- **AND** individual scrollable regions are clearly indicated

---

### Requirement: Responsive Unit Info Banner

The unit statistics banner SHALL display information clearly at all viewport sizes.

#### Scenario: Compact stats on mobile

- **WHEN** viewport width is below 640px
- **THEN** movement stats show abbreviated label "W/R/J"
- **AND** stat values use smaller font sizes
- **AND** stats wrap to multiple lines if needed

#### Scenario: Full stats on larger screens

- **WHEN** viewport width is 640px or greater
- **THEN** movement stats show full label "Walk / Run / Jump"
- **AND** all stats display in a single row when space permits

---

### Requirement: Touch-Friendly Interactions

All interactive elements SHALL be touch-friendly on mobile devices.

#### Scenario: Minimum touch target size

- **WHEN** rendering buttons, tabs, or interactive elements
- **THEN** touch targets are at least 44x44 pixels on mobile
- **AND** adequate spacing prevents accidental taps

#### Scenario: Swipe gestures for bottom sheet

- **WHEN** user swipes up on the bottom sheet handle
- **THEN** sheet expands to the next state (collapsed → half → expanded)
- **WHEN** user swipes down on the bottom sheet handle
- **THEN** sheet contracts to the previous state

#### Scenario: Drag equipment on touch devices

- **WHEN** user long-presses equipment in the bottom sheet
- **THEN** drag mode is activated for slot assignment
- **AND** visual feedback indicates the item is being dragged
