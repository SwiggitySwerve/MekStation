# app-navigation Specification

## Purpose

Defines the application navigation system including mobile sidebar state management, panel-based navigation for mobile layouts, and page-level type definitions for unit entries and details.

This specification covers:

- Mobile sidebar drawer state (open/close/toggle)
- Panel navigation stack with history (push/back/forward/reset)
- Lightweight unit entry types for lists and search results
- Navigation state preservation across panel transitions

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

---

## Navigation State Management

### Requirement: Mobile Sidebar Store

The mobile sidebar state SHALL be managed via a dedicated Zustand store with open/close/toggle actions.

**Source**: `src/stores/useNavigationStore.ts:25-30`

#### Scenario: Open mobile sidebar

- **GIVEN** the mobile sidebar is closed (isOpen = false)
- **WHEN** the `open()` action is called
- **THEN** the store state updates to isOpen = true
- **AND** all components observing the store re-render with the new state

#### Scenario: Close mobile sidebar

- **GIVEN** the mobile sidebar is open (isOpen = true)
- **WHEN** the `close()` action is called
- **THEN** the store state updates to isOpen = false
- **AND** the sidebar drawer closes

#### Scenario: Toggle mobile sidebar

- **GIVEN** the mobile sidebar is in any state
- **WHEN** the `toggle()` action is called
- **THEN** the store state flips to the opposite value
- **AND** the sidebar opens if closed, or closes if open

---

### Requirement: Panel Navigation Store

The application SHALL provide a panel navigation store with stack-based history for mobile layouts.

**Source**: `src/stores/useNavigationStore.ts:114-193`

#### Scenario: Push panel to navigation stack

- **GIVEN** the navigation history is ['catalog']
- **AND** currentIndex = 0
- **WHEN** `pushPanel('unit-detail', { unitId: '123' })` is called
- **THEN** the history becomes ['catalog', { id: 'unit-detail', state: { unitId: '123' } }]
- **AND** currentIndex = 1
- **AND** currentPanel = 'unit-detail'
- **AND** canGoBack = true
- **AND** canGoForward = false

#### Scenario: Push panel truncates forward history

- **GIVEN** the navigation history is ['catalog', 'unit-detail', 'editor']
- **AND** currentIndex = 1 (on 'unit-detail')
- **WHEN** `pushPanel('equipment-browser')` is called
- **THEN** the history becomes ['catalog', 'unit-detail', 'equipment-browser']
- **AND** the 'editor' panel is removed from history
- **AND** currentIndex = 2
- **AND** canGoForward = false

#### Scenario: Go back to previous panel

- **GIVEN** the navigation history is ['catalog', 'unit-detail']
- **AND** currentIndex = 1
- **WHEN** `goBack()` is called
- **THEN** currentIndex = 0
- **AND** currentPanel = 'catalog'
- **AND** canGoBack = false
- **AND** canGoForward = true

#### Scenario: Go forward to next panel

- **GIVEN** the navigation history is ['catalog', 'unit-detail']
- **AND** currentIndex = 0
- **AND** the user previously went back
- **WHEN** `goForward()` is called
- **THEN** currentIndex = 1
- **AND** currentPanel = 'unit-detail'
- **AND** canGoBack = true
- **AND** canGoForward = false

#### Scenario: Reset navigation to default

- **GIVEN** the navigation history is ['catalog', 'unit-detail', 'editor']
- **AND** currentIndex = 2
- **WHEN** `resetNavigation()` is called
- **THEN** the history becomes ['catalog']
- **AND** currentIndex = 0
- **AND** currentPanel = 'catalog'
- **AND** canGoBack = false
- **AND** canGoForward = false

#### Scenario: Replace current panel

- **GIVEN** the navigation history is ['catalog', 'unit-detail']
- **AND** currentIndex = 1
- **WHEN** `replacePanel('editor', { unitId: '456' })` is called
- **THEN** the history becomes ['catalog', { id: 'editor', state: { unitId: '456' } }]
- **AND** currentIndex remains 1
- **AND** currentPanel = 'editor'
- **AND** the history length is unchanged

#### Scenario: Panel state preservation

- **GIVEN** a panel is pushed with state: `{ unitId: '123', scrollY: 450 }`
- **WHEN** the user navigates away and then back to this panel
- **THEN** the panel state is restored from history
- **AND** the panel can use the state to restore scroll position and selections

---

## Page Type Definitions

### Requirement: Unit Entry Interface

The application SHALL define a lightweight `IUnitEntry` interface for unit lists and search results.

**Source**: `src/types/pages/UnitPageTypes.ts:14-34`

#### Scenario: Unit entry for list display

- **GIVEN** a unit entry with id, name, chassis, variant, tonnage, techBase, era, weightClass, unitType
- **WHEN** the entry is rendered in a unit list
- **THEN** all required fields are available for display
- **AND** optional fields (year, role, rulesLevel, cost, bv) are displayed if present

#### Scenario: Unit entry for search results

- **GIVEN** a search query returns multiple unit entries
- **WHEN** the results are displayed
- **THEN** each entry includes name, chassis, variant for identification
- **AND** includes tonnage, weightClass, techBase, era for filtering
- **AND** includes optional cost and bv for comparison

#### Scenario: Unit entry type safety

- **GIVEN** a function accepts `IUnitEntry` as a parameter
- **WHEN** the function is called with a unit entry
- **THEN** TypeScript enforces all required fields are present
- **AND** optional fields are typed as `string | undefined` or `number | undefined`

---

## Data Model Requirements

### Mobile Sidebar State

```typescript
/**
 * Mobile sidebar state and actions
 */
interface MobileSidebarState {
  /** Whether the mobile sidebar is open */
  readonly isOpen: boolean;
  /** Open the mobile sidebar */
  readonly open: () => void;
  /** Close the mobile sidebar */
  readonly close: () => void;
  /** Toggle the mobile sidebar */
  readonly toggle: () => void;
}
```

**Source**: `src/stores/useNavigationStore.ts:10-19`

---

### Panel Navigation Types

```typescript
/**
 * Panel identifiers for mobile navigation
 */
type PanelId =
  | 'catalog'
  | 'unit-detail'
  | 'editor'
  | 'equipment-browser'
  | 'sidebar';

/**
 * Panel entry in navigation history
 */
interface PanelEntry {
  readonly id: PanelId;
  /** Optional data to preserve/restore panel state */
  readonly state?: Record<string, unknown>;
}

/**
 * Navigation state
 */
interface NavigationState {
  /** Array of panels in navigation history */
  readonly history: PanelEntry[];
  /** Current panel index in history */
  readonly currentIndex: number;
  /** Current panel ID (derived from history[currentIndex]) */
  readonly currentPanel: PanelId;
  /** Whether back navigation is available */
  readonly canGoBack: boolean;
  /** Whether forward navigation is available */
  readonly canGoForward: boolean;
}

/**
 * Navigation actions
 */
interface NavigationActions {
  /** Push a new panel to the navigation stack */
  readonly pushPanel: (
    panelId: PanelId,
    state?: Record<string, unknown>,
  ) => void;
  /** Navigate back to the previous panel */
  readonly goBack: () => void;
  /** Navigate forward to the next panel (if available) */
  readonly goForward: () => void;
  /** Reset navigation to default state */
  readonly resetNavigation: () => void;
  /** Replace current panel (useful for redirects) */
  readonly replacePanel: (
    panelId: PanelId,
    state?: Record<string, unknown>,
  ) => void;
}

/**
 * Navigation store state type
 */
type NavigationStore = NavigationState & NavigationActions;

/**
 * Default panel for mobile app
 */
const DEFAULT_PANEL: PanelId = 'catalog';
```

**Source**: `src/stores/useNavigationStore.ts:39-95`

---

### Unit Entry Types

```typescript
/**
 * Lightweight unit entry for lists and search results
 */
interface IUnitEntry {
  readonly id: string;
  readonly name: string;
  readonly chassis: string;
  readonly variant: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly era: Era;
  readonly weightClass: WeightClass;
  readonly unitType: string;
  /** Introduction year */
  readonly year?: number;
  /** Role (e.g., Juggernaut, Scout, Striker) */
  readonly role?: string;
  /** Rules level (INTRODUCTORY, STANDARD, ADVANCED, EXPERIMENTAL) */
  readonly rulesLevel?: string;
  /** C-Bill cost */
  readonly cost?: number;
  /** Battle Value 2.0 */
  readonly bv?: number;
}
```

**Source**: `src/types/pages/UnitPageTypes.ts:14-34`

**Purpose**: Lightweight interface for unit lists, search results, and catalog displays. Includes only essential fields for identification, filtering, and comparison.

**Usage**:

- Unit catalog list items
- Search result entries
- Force builder unit selection
- Comparison tool unit cards

---

## Non-Goals

This specification does NOT cover:

1. **Desktop sidebar state** - Handled by separate desktop layout logic
2. **Route-based navigation** - Handled by Next.js router
3. **Full unit details** - See `IUnitDetails` interface for detail pages
4. **Unit data persistence** - Handled by database layer
5. **Unit validation** - Handled by construction rules
6. **Panel rendering logic** - Handled by individual panel components
7. **Navigation animations** - Handled by UI component library
