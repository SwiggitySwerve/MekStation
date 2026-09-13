# customizer-responsive-layout Specification

## Purpose

Defines Customizer Responsive Layout requirements for Adaptive Tab Navigation, Responsive Loadout Sidebar, Responsive Content Layout, and Responsive Unit Info Banner, preserving the source-of-truth scope introduced by archived change improve-customizer-mobile-responsiveness.

## Requirements

### Requirement: Adaptive Tab Navigation

The customizer tabs SHALL display labeled, horizontally scrollable tabs. Icon
visibility SHALL follow the tab strip's compact mode, while layout behavior
SHALL follow the available horizontal space.

#### Scenario: Labeled tabs in compact mode

- **WHEN** the customizer tab strip is rendered in compact mode
- **THEN** tabs SHALL retain visible text labels and minimum 44px touch target height
- **AND** icons SHALL be hidden for the compact navigation
- **AND** tabs SHALL remain horizontally scrollable when they overflow

#### Scenario: Labeled tabs outside compact mode

- **WHEN** the customizer tab strip is rendered outside compact mode
- **THEN** labels SHALL remain visible with their configured icons
- **AND** horizontal scrolling SHALL remain available when needed

#### Scenario: Tab scroll indicators

- **WHEN** tabs overflow the visible container width
- **THEN** gradient fade indicators appear on the overflow side
- **AND** users can scroll horizontally to see all tabs

**Source**: `src/components/customizer/tabs/CustomizerTabs.tsx::CustomizerTabs`
(`compact`, horizontal overflow, 44px targets, and left/right fades); the
active workbench passes `compact` from
`src/components/customizer/UnitEditorWithRouting.tsx`.

---

### Requirement: Responsive Loadout Sidebar

The loadout tray SHALL use a desktop sidebar or drawer and a mobile status bar with an expandable equipment list, according to the active workbench layout.

#### Scenario: Mobile loadout

- **WHEN** viewport width is below the 768px desktop breakpoint
- **THEN** a loadout status bar SHALL expose equipment and construction statistics
- **AND** activating its control SHALL toggle between collapsed status and an expanded full-screen list
- **AND** closing the list SHALL return to the status bar
- **AND** the expanded preference SHALL persist through the existing local editor storage

#### Scenario: Desktop sidebar and drawer

- **WHEN** the desktop layout displays the sidebar
- **THEN** its expanded state SHALL follow the user's persisted toggle rather than automatic collapse on resize
- **WHEN** the workbench hides the permanent sidebar and the user opens Unit loadout
- **THEN** a dismissible named drawer SHALL show the same loadout and placement actions

**Source**: `src/components/customizer/equipment/ResponsiveLoadoutTray.tsx`
(`GlobalLoadoutTray`, named drawer, and mobile `BottomSheetTray` wiring);
`src/components/customizer/equipment/BottomSheetTray.tsx` (persisted expanded
state, status bar, full-screen list, close, and placement callbacks); and
`src/hooks/usePersistedState.ts` (separate tray persistence keys).

#### Scenario: Layout does not change equipment

- **WHEN** the user expands, collapses, closes, or resizes the loadout surface
- **THEN** the active unit's equipment and assignments SHALL remain unchanged
- **AND** the document SHALL remain within the viewport

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

The unit statistics banner SHALL display information clearly in compact and
non-compact workbench layouts.

#### Scenario: Compact stats in compact mode

- **WHEN** the unit information banner is rendered in compact mode
- **THEN** movement stats SHALL retain the labels Walk, Run, and Jump
- **AND** stat values use smaller font sizes
- **AND** stats wrap to multiple lines if needed

#### Scenario: Full stats outside compact mode

- **WHEN** the unit information banner is rendered outside compact mode
- **THEN** movement stats show full label "Walk / Run / Jump"
- **AND** all stats display in a single row when space permits

**Source**: `src/components/customizer/shared/UnitInfoBanner.tsx` (the
`compact` rendering branch and movement labels); the active workbench passes
`compact` from `src/components/customizer/UnitEditorWithRouting.tsx`.

---

### Requirement: Touch-Friendly Interactions

Mobile editing controls SHALL provide accessible touch targets and explicit loadout actions.

#### Scenario: Minimum touch target size

- **WHEN** mobile loadout or catalog controls render
- **THEN** their primary buttons SHALL provide at least 44px touch targets
- **AND** focus and accessible names SHALL remain available

#### Scenario: Open, close, and assign from the mobile list

- **WHEN** the user activates the loadout status control
- **THEN** the expanded list SHALL open without requiring a swipe or long press
- **AND** explicit selection, removal, unassignment, and supported quick-assignment controls SHALL use the existing equipment authority
- **AND** no intermediate half-height state SHALL be required
