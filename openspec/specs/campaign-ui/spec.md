# campaign-ui Specification

## Purpose
TBD - created by archiving change implement-comprehensive-campaign-system. Update Purpose after archive.
## Requirements
### Requirement: Campaign List Page
The system SHALL display a list of all campaigns with summary statistics.

#### Scenario: Display campaign cards
- **GIVEN** 3 campaigns exist
- **WHEN** the campaigns page is loaded
- **THEN** 3 campaign cards are displayed with name, faction, and stats

#### Scenario: Show real-time stats
- **GIVEN** a campaign with 10 personnel, 8 units, 3 missions, and 500000 C-bills balance
- **WHEN** the campaign card is rendered
- **THEN** stats show "10 Personnel", "8 Units", "3 Missions", "500,000 C-bills"

#### Scenario: Navigate to campaign
- **GIVEN** a campaign card
- **WHEN** the card is clicked
- **THEN** user navigates to campaign dashboard at /gameplay/campaigns/[id]

### Requirement: Campaign Dashboard
The system SHALL display campaign overview with quick stats and advance day control.

#### Scenario: Display quick stats cards
- **GIVEN** a campaign dashboard is loaded
- **WHEN** the page renders
- **THEN** 4 stat cards are displayed (Personnel, Units, Balance, Missions)

#### Scenario: Stats update in real-time
- **GIVEN** campaign store data changes
- **WHEN** the dashboard re-renders
- **THEN** stat cards reflect updated values

#### Scenario: Advance day button
- **GIVEN** a campaign dashboard
- **WHEN** "Advance Day" button is clicked
- **THEN** advanceDay action is called and date increments

#### Scenario: Show current date
- **GIVEN** a campaign with currentDate 2025-01-15
- **WHEN** the dashboard is rendered
- **THEN** current date "2025-01-15" is displayed prominently

### Requirement: Personnel Roster Page
The system SHALL display personnel list with filtering and details.

#### Scenario: Display personnel list
- **GIVEN** a campaign with 15 personnel
- **WHEN** the personnel page is loaded
- **THEN** all 15 personnel are displayed in a list

#### Scenario: Show personnel details
- **GIVEN** a person in the list
- **WHEN** the person row is rendered
- **THEN** name, role, status, and unit assignment are displayed

#### Scenario: Filter by status
- **GIVEN** personnel with mixed statuses (ACTIVE, WOUNDED, KIA)
- **WHEN** "Active" filter is selected
- **THEN** only ACTIVE personnel are displayed

#### Scenario: Show skills and attributes
- **GIVEN** a person with gunnery 4, piloting 5, and attributes
- **WHEN** the person details are viewed
- **THEN** skills and attributes are displayed

### Requirement: Forces (TO&E) Page
The system SHALL display force hierarchy as an expandable tree.

#### Scenario: Display force tree
- **GIVEN** a force hierarchy with battalion → companies → lances
- **WHEN** the forces page is loaded
- **THEN** tree structure is displayed with expand/collapse controls

#### Scenario: Expand/collapse nodes
- **GIVEN** a force with sub-forces
- **WHEN** the expand icon is clicked
- **THEN** sub-forces are revealed or hidden

#### Scenario: Show force details
- **GIVEN** a force in the tree
- **WHEN** the force is rendered
- **THEN** name, type, level, commander, and unit count are displayed

#### Scenario: Hierarchical indentation
- **GIVEN** a nested force structure
- **WHEN** the tree is rendered
- **THEN** child forces are indented to show hierarchy level

### Requirement: Missions Page
The system SHALL display active missions and contracts with details.

#### Scenario: Display missions list
- **GIVEN** a campaign with 5 missions
- **WHEN** the missions page is loaded
- **THEN** all 5 missions are displayed

#### Scenario: Show contract details
- **GIVEN** a contract in the list
- **WHEN** the contract is rendered
- **THEN** employer, payment, duration, and status are displayed

#### Scenario: Filter by status
- **GIVEN** missions with statuses (PENDING, ACTIVE, SUCCESS, FAILED)
- **WHEN** "Active" filter is selected
- **THEN** only ACTIVE missions are displayed

#### Scenario: Show deployment indicator
- **GIVEN** a scenario with deployed forces
- **WHEN** the scenario is rendered
- **THEN** deployment indicator shows which forces are deployed

### Requirement: Campaign Navigation
The system SHALL provide tab-based navigation between campaign pages.

#### Scenario: Display navigation tabs
- **GIVEN** a campaign page is loaded
- **WHEN** the navigation renders
- **THEN** 5 tabs are displayed (Dashboard, Personnel, Forces, Missions, Finances)

#### Scenario: Navigate between tabs
- **GIVEN** user is on Dashboard tab
- **WHEN** Personnel tab is clicked
- **THEN** user navigates to /gameplay/campaigns/[id]/personnel

#### Scenario: Highlight active tab
- **GIVEN** user is on Personnel page
- **WHEN** the navigation renders
- **THEN** Personnel tab is highlighted as active

#### Scenario: Tabs accessible from all pages
- **GIVEN** user is on any campaign page
- **WHEN** the page renders
- **THEN** navigation tabs are visible and functional

### Requirement: SSR and Hydration Safety
The system SHALL handle server-side rendering and client hydration properly.

#### Scenario: No IndexedDB access during SSR
- **GIVEN** a campaign page is server-rendered
- **WHEN** the page is generated
- **THEN** no IndexedDB operations are attempted on server

#### Scenario: Hydrate after client mount
- **GIVEN** a campaign page is loaded
- **WHEN** the client mounts
- **THEN** campaign data is loaded from IndexedDB and UI updates

#### Scenario: No hydration mismatches
- **GIVEN** a campaign page with dynamic data
- **WHEN** client hydration occurs
- **THEN** no React hydration warnings appear in console

### Requirement: Responsive Design
The system SHALL adapt UI layout for different screen sizes.

#### Scenario: Desktop layout
- **GIVEN** a viewport width > 1024px
- **WHEN** campaign pages are rendered
- **THEN** multi-column layouts are used

#### Scenario: Mobile layout
- **GIVEN** a viewport width < 768px
- **WHEN** campaign pages are rendered
- **THEN** single-column stacked layouts are used

#### Scenario: Navigation adapts
- **GIVEN** a mobile viewport
- **WHEN** navigation is rendered
- **THEN** tabs may collapse to dropdown or hamburger menu

### Requirement: Loading States
The system SHALL display loading indicators during data operations.

#### Scenario: Show loading on page load
- **GIVEN** campaign data is being fetched
- **WHEN** the page renders
- **THEN** loading spinner or skeleton is displayed

#### Scenario: Show loading on day advance
- **GIVEN** advanceDay is processing
- **WHEN** the button is clicked
- **THEN** button shows loading state and is disabled

#### Scenario: Hide loading when complete
- **GIVEN** data operation completes
- **WHEN** the page re-renders
- **THEN** loading indicators are removed and content is shown

### Requirement: Error Handling
The system SHALL display user-friendly error messages for failures.

#### Scenario: Show error on load failure
- **GIVEN** campaign data fails to load
- **WHEN** the page renders
- **THEN** error message is displayed with retry option

#### Scenario: Show error on operation failure
- **GIVEN** advanceDay operation fails
- **WHEN** the error occurs
- **THEN** error toast or banner is displayed with error details

#### Scenario: Clear errors on retry
- **GIVEN** an error is displayed
- **WHEN** user retries the operation
- **THEN** error is cleared and operation is attempted again

### Requirement: Accessibility
The system SHALL provide accessible UI with ARIA labels and keyboard navigation.

#### Scenario: ARIA labels on interactive elements
- **GIVEN** campaign UI with buttons and links
- **WHEN** the page is inspected
- **THEN** all interactive elements have aria-label or aria-labelledby

#### Scenario: Keyboard navigation works
- **GIVEN** a campaign page
- **WHEN** user navigates with Tab key
- **THEN** focus moves through interactive elements in logical order

#### Scenario: Screen reader support
- **GIVEN** a campaign page
- **WHEN** accessed with screen reader
- **THEN** all content and controls are announced properly

### Requirement: Data Persistence
The system SHALL persist campaign data changes automatically.

#### Scenario: Auto-save on changes
- **GIVEN** campaign data is modified
- **WHEN** the change occurs
- **THEN** data is automatically persisted to IndexedDB

#### Scenario: Persist across page navigation
- **GIVEN** user navigates between campaign pages
- **WHEN** returning to a page
- **THEN** data reflects latest changes

#### Scenario: Persist across browser refresh
- **GIVEN** campaign data exists
- **WHEN** browser is refreshed
- **THEN** campaign data is restored from IndexedDB

### Requirement: Component Integration
The system SHALL integrate campaign components with existing MekStation UI patterns.

#### Scenario: Use existing UI components
- **GIVEN** campaign pages are built
- **WHEN** components are inspected
- **THEN** existing Button, Card, and Input components are used

#### Scenario: Follow Tailwind CSS patterns
- **GIVEN** campaign UI styling
- **WHEN** styles are inspected
- **THEN** Tailwind CSS 4 classes are used consistently

#### Scenario: Match existing color scheme
- **GIVEN** campaign pages
- **WHEN** rendered
- **THEN** colors match existing MekStation dark theme (gray-900 background, cyan accents)

### Requirement: Performance
The system SHALL render campaign pages efficiently without lag.

#### Scenario: Fast initial render
- **GIVEN** a campaign with 50 personnel and 20 forces
- **WHEN** the page loads
- **THEN** initial render completes in < 500ms

#### Scenario: Smooth list scrolling
- **GIVEN** a personnel list with 100 items
- **WHEN** user scrolls
- **THEN** scrolling is smooth at 60fps

#### Scenario: Efficient re-renders
- **GIVEN** campaign data updates
- **WHEN** the page re-renders
- **THEN** only affected components re-render (not entire page)

### Requirement: Campaign Creation Wizard
The system SHALL provide a multi-step campaign creation wizard with 4 steps: campaign type selection, preset selection, option customization, and summary/confirmation.

#### Scenario: Wizard step 1 - Campaign type selection
- **WHEN** the user opens the campaign creation wizard
- **THEN** 5 campaign types are displayed as selectable cards with name, icon, and description

#### Scenario: Wizard step 2 - Preset selection
- **WHEN** the user selects a campaign type and proceeds
- **THEN** 4 presets (Casual, Standard, Full, Custom) are displayed with feature comparison highlights

#### Scenario: Wizard step 3 - Option customization
- **WHEN** the user selects a preset and proceeds
- **THEN** all campaign options are displayed grouped by OptionGroupId in collapsible panels, pre-filled with the selected preset's values

#### Scenario: Wizard step 4 - Summary
- **WHEN** the user completes customization and proceeds
- **THEN** a summary of all selected options is displayed with campaign name input and a create button

### Requirement: Option Group Panel
The system SHALL render campaign options grouped by OptionGroupId with appropriate input controls (toggles for booleans, number inputs with min/max for numbers, dropdowns for enums).

#### Scenario: Boolean option rendering
- **GIVEN** an option with type 'boolean'
- **WHEN** the option group panel renders
- **THEN** a toggle switch is displayed with the option's label and description

#### Scenario: Number option with range
- **GIVEN** an option with type 'number', min 0, max 100, step 1
- **WHEN** the option group panel renders
- **THEN** a number input is displayed constrained to the specified range

