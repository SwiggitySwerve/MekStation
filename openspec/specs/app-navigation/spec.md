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

