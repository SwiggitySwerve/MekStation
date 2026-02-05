# app-navigation Specification

## Purpose

TBD - created by archiving change improve-mobile-navigation-ergonomics. Update Purpose after archive.

## Requirements

### Requirement: Mobile Navigation Header

The application SHALL display a mobile navigation header on all pages except those with custom navigation.

#### Scenario: Mobile header display on standard pages

- **WHEN** viewport width is below the lg breakpoint (1024px)
- **AND** the page does not have custom navigation (e.g., customizer)
- **THEN** a mobile header bar appears at the top of the viewport
- **AND** displays the page title on the left side
- **AND** displays a hamburger menu button on the right side

#### Scenario: Mobile header hidden on desktop

- **WHEN** viewport width is at or above the lg breakpoint (1024px)
- **THEN** the mobile header is not displayed
- **AND** the sidebar is always visible in the left margin

#### Scenario: Customizer page exception

- **WHEN** the current route is the customizer page
- **THEN** the mobile header is not displayed
- **AND** navigation is accessed via the bottom tray instead

---

### Requirement: Mobile Sidebar Expansion

The sidebar navigation SHALL always display in expanded mode when opened on mobile.

#### Scenario: Expanded sidebar on mobile open

- **WHEN** the mobile sidebar is opened via the hamburger menu
- **THEN** the sidebar displays with full width (w-56 / 224px)
- **AND** all navigation labels are visible alongside icons
- **AND** section titles (Browse, Tools) are displayed
- **AND** the desktop collapse toggle is hidden

#### Scenario: Desktop collapse preference preserved

- **WHEN** the sidebar is displayed on desktop (lg+ viewport)
- **THEN** the sidebar respects the user's collapse/expand preference
- **AND** the collapse toggle button is visible and functional

---

### Requirement: Mobile Sidebar Close on Navigation

The mobile sidebar SHALL close when a navigation item is selected.

#### Scenario: Close on NavItem click

- **WHEN** the mobile sidebar is open
- **AND** the user taps any navigation link
- **THEN** the sidebar closes immediately
- **AND** navigation proceeds to the selected page

#### Scenario: Close on backdrop tap

- **WHEN** the mobile sidebar is open
- **AND** the user taps the backdrop overlay
- **THEN** the sidebar closes
- **AND** no navigation occurs

---

### Requirement: Right-Hand Ergonomic Positioning

Menu trigger buttons SHALL be positioned for right-hand accessibility on mobile.

#### Scenario: Mobile header menu button position

- **WHEN** the mobile header is displayed
- **THEN** the hamburger menu button is positioned on the right side
- **AND** is easily reachable by right thumb

#### Scenario: Touch target size

- **WHEN** the hamburger menu button is rendered
- **THEN** the touch target is at least 44x44 pixels
- **AND** has adequate spacing from adjacent elements

---

### Requirement: Mobile Sidebar State Management

The mobile sidebar state SHALL be managed globally and synchronized across components.

#### Scenario: Global state via Zustand store

- **WHEN** any component needs to open the mobile sidebar
- **THEN** it calls the `open` action from `useMobileSidebarStore`
- **AND** all components observing the store update accordingly

#### Scenario: Route change closes sidebar

- **WHEN** navigation to a new route completes
- **AND** the viewport is below mobile breakpoint
- **THEN** the mobile sidebar closes automatically

### Requirement: History Navigation Section

The sidebar SHALL include a History section for timeline and audit features.

#### Scenario: History section display

- **WHEN** the sidebar is rendered
- **THEN** a "History" section appears between Gameplay and Settings
- **AND** the section contains a Timeline navigation item

#### Scenario: Navigate to Timeline

- **WHEN** the user clicks the "Timeline" navigation item
- **THEN** navigation proceeds to `/audit/timeline`
- **AND** the Timeline item is highlighted as active

#### Scenario: Timeline active on nested routes

- **WHEN** the current route is `/audit/timeline` or any nested audit route
- **THEN** the Timeline navigation item is highlighted as active

#### Scenario: Collapsed sidebar Timeline

- **WHEN** the sidebar is in collapsed (icon-only) mode
- **THEN** the Timeline icon is displayed
- **AND** hovering shows a tooltip with "Timeline"

### Requirement: Gameplay Section Navigation Items

The Gameplay navigation section SHALL include items for all gameplay features.

#### Scenario: Gameplay section contents

- **WHEN** the Gameplay section is expanded
- **THEN** the following navigation items are displayed in order:
  - Pilots (`/gameplay/pilots`) with PilotIcon
  - Forces (`/gameplay/forces`) with ForceIcon
  - Campaigns (`/gameplay/campaigns`) with CampaignIcon
  - Encounters (`/gameplay/encounters`) with EncounterIcon
  - Games (`/gameplay/games`) with GameIcon

#### Scenario: Navigate to Forces

- **WHEN** the user clicks the "Forces" navigation item
- **THEN** navigation proceeds to `/gameplay/forces`
- **AND** the Forces item is highlighted as active
- **AND** the Gameplay section header is highlighted

#### Scenario: Navigate to Campaigns

- **WHEN** the user clicks the "Campaigns" navigation item
- **THEN** navigation proceeds to `/gameplay/campaigns`
- **AND** the Campaigns item is highlighted as active

#### Scenario: Navigate to Encounters

- **WHEN** the user clicks the "Encounters" navigation item
- **THEN** navigation proceeds to `/gameplay/encounters`
- **AND** the Encounters item is highlighted as active

#### Scenario: Navigate to Games

- **WHEN** the user clicks the "Games" navigation item
- **THEN** navigation proceeds to `/gameplay/games`
- **AND** the Games item is highlighted as active

#### Scenario: Deep route active state

- **WHEN** the current route is `/gameplay/campaigns/abc123`
- **THEN** the Campaigns navigation item is highlighted as active
- **AND** the Gameplay section header is highlighted

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
