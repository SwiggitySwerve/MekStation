# campaign-ui Specification

## Purpose

Defines Campaign UI requirements for Campaign List Page, Campaign Dashboard, Personnel Roster Page, and Forces (TO&E) Page, preserving the source-of-truth scope introduced by archived change implement-comprehensive-campaign-system.
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

The system SHALL provide a multi-step campaign creation wizard with 4 steps: campaign type selection, preset selection, option customization, and summary/confirmation. Roster units created by the wizard SHALL be canonical-backed — each stored roster entry carries a canonical `unitRef` resolvable in the canonical unit dataset — and wizard-created pilots SHALL be registered in the pilot vault with distinct default names.

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

#### Scenario: Roster units are canonical-backed

- **WHEN** the user adds a weight-class unit in the wizard roster step and creates the campaign
- **THEN** the stored roster entry SHALL carry a canonical `unitRef` that resolves in the canonical unit dataset
- **AND** campaign surfaces (Mech Bay, force views, encounter materialization) SHALL show that unit's real name, weight, and battle value (never "not cataloged")

#### Scenario: Wizard pilots are distinct and vault-registered

- **WHEN** the user adds multiple pilots in the wizard roster step and creates the campaign
- **THEN** each pilot SHALL receive a distinct default name (e.g. "MechWarrior 1", "MechWarrior 2", …)
- **AND** each pilot SHALL be registered in the pilot vault such that the Personnel detail panel resolves progression, abilities, and assignment (never "Pilot not found in vault")

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

### Requirement: Pilot Action Side Panel from Campaign Roster

The campaign personnel page SHALL render the active campaign's pilot roster from `useCampaignRosterStore.pilots: ICampaignPilotState[]` and SHALL surface a within-page side panel that mounts the existing `PilotProgressionPanel` and `PilotAbilitiesPanel` components when a pilot row is clicked, resolving the pilot's vault `IPilot` record via a join from `ICampaignPilotState.pilotId` to `usePilotStore.pilots`.

#### Scenario: Pilot roster renders from useCampaignRosterStore

- **GIVEN** a campaign with three `ICampaignPilotState` records in `useCampaignRosterStore.pilots`
- **WHEN** the player navigates to `/gameplay/campaigns/[id]/personnel`
- **THEN** three pilot rows SHALL render with `pilotName` and `status` from `ICampaignPilotState`
- **AND** the page SHALL NOT read from `usePersonnelStore` or `campaign.personnel`

#### Scenario: Empty roster shows explicit empty state

- **GIVEN** a campaign with zero pilots in `useCampaignRosterStore.pilots`
- **WHEN** the player navigates to the campaign personnel page
- **THEN** the page SHALL display an empty state with the message "No pilots in this campaign roster"
- **AND** the page SHALL NOT render an empty pilot grid

#### Scenario: Row click opens side panel

- **GIVEN** the campaign personnel page with at least one pilot row
- **WHEN** the player clicks a pilot row
- **THEN** a side panel SHALL render as a within-page column matching the campaign-detail layout convention
- **AND** the side panel SHALL contain tabs labeled "Progression", "Abilities", and "Assignment"
- **AND** the page URL SHALL NOT change to `/gameplay/pilots/<id>`

#### Scenario: Side panel does not render until interaction

- **GIVEN** the campaign personnel page is server-rendered
- **WHEN** the page is delivered to the client
- **THEN** the side panel SHALL NOT render in the SSR output
- **AND** there SHALL be no React hydration warning related to the side panel

#### Scenario: Progression tab mounts existing panel with vault-joined pilot

- **GIVEN** the side panel is open for a pilot whose `ICampaignPilotState.pilotId` matches a pilot in `usePilotStore.pilots`
- **WHEN** the player selects the "Progression" tab
- **THEN** the existing `PilotProgressionPanel` component SHALL render with the resolved `IPilot` passed as the `pilot` prop
- **AND** the `PilotProgressionPanel` component prop signature SHALL remain unchanged from its standalone-page usage
- **AND** the panel's "Improve Gunnery" / "Improve Piloting" buttons SHALL invoke the existing `usePilotStore.improveGunnery` / `usePilotStore.improvePiloting` actions, which already POST to `/api/pilots/[id]/improve-gunnery|improve-piloting`

#### Scenario: Abilities tab mounts existing panel with vault-joined pilot

- **GIVEN** the side panel is open for a pilot whose `pilotId` resolves to an `IPilot` in `usePilotStore.pilots`
- **WHEN** the player selects the "Abilities" tab
- **THEN** the existing `PilotAbilitiesPanel` component SHALL render with the resolved `IPilot` passed as the `pilot` prop
- **AND** the panel's SPA purchase flow SHALL invoke the existing `usePilotStore.purchaseSPA` action, which already POSTs to `/api/pilots/[id]/purchase-ability` with `{ spaId, designation, isCreationFlow }`

#### Scenario: Successful XP spend updates the rendered panel

- **GIVEN** the Progression tab is open for a pilot with gunnery 4 and 250 XP (cost to improve gunnery 4 → 3 is 200 XP per `GUNNERY_IMPROVEMENT_COSTS`)
- **WHEN** the player clicks "Improve Gunnery" and the API responds successfully
- **THEN** `usePilotStore.improveGunnery` SHALL call `loadPilots()` on success, refreshing `usePilotStore.pilots`
- **AND** the rendered DOM in the Progression tab SHALL display the new gunnery value (3) and reduced XP (50)
- **AND** the test assertion for this scenario SHALL query the rendered DOM (not the store state)

#### Scenario: API error surfaces in panel without state mutation

- **GIVEN** the Progression tab is open for a pilot eligible for improvement
- **WHEN** the player clicks "Improve Gunnery" and the API responds with HTTP 500
- **THEN** the panel SHALL display the error message returned by the API
- **AND** the pilot's gunnery and XP in `usePilotStore.pilots` SHALL remain unchanged
- **AND** the button SHALL re-enable for retry

#### Scenario: Pilot with no vault record renders error message

- **GIVEN** a `ICampaignPilotState` whose `pilotId` does not match any pilot in `usePilotStore.pilots`
- **WHEN** the player clicks the row to open the side panel
- **THEN** the Progression and Abilities tabs SHALL display "Pilot not found in vault — this campaign may reference a deleted pilot"
- **AND** the panel SHALL NOT crash or render an undefined-prop error

#### Scenario: Closing side panel preserves campaign context

- **GIVEN** the side panel is open
- **WHEN** the player clicks the close button or outside the panel
- **THEN** the side panel SHALL close
- **AND** the campaign roster scroll position SHALL be preserved
- **AND** the active campaign in `useCampaignRosterStore` SHALL remain unchanged

#### Scenario: Standalone pilot detail page is unaffected

- **GIVEN** the changes in this requirement are deployed
- **WHEN** the player navigates to `/gameplay/pilots/[id]` for a vault pilot
- **THEN** the standalone pilot detail page SHALL render exactly as before
- **AND** the existing `PilotProgressionPanel` and `PilotAbilitiesPanel` props/behavior SHALL be unchanged

### Requirement: Crew Assignment Panel via Force Slot Assignment

The campaign personnel side panel SHALL include an Assignment tab that lets the player assign or unassign the selected pilot to a Force slot in the active campaign by invoking the existing `useForceStore` actions (`assignPilot(assignmentId, pilotId)` and `clearAssignment(assignmentId)`), which wrap the existing `PUT /api/forces/assignments/[id]/pilot` and `DELETE /api/forces/assignments/[id]` routes, operating on Force slot assignment IDs and vault pilot IDs.

#### Scenario: Display current assignment

- **GIVEN** a selected pilot whose `pilotId` is currently assigned to Force slot `<assignmentId>`
- **WHEN** the player selects the "Assignment" tab
- **THEN** the panel SHALL display "Currently assigned: <unitName>" where `<unitName>` is resolved from the Force slot's assigned unit
- **AND** an "Unassign" button SHALL render

#### Scenario: Display compatible Force slots when unassigned

- **GIVEN** a selected pilot with role `MECHWARRIOR` and no current Force slot assignment
- **AND** the active campaign has a Force with three unfilled slots assigned to BattleMechs and two unfilled slots assigned to vehicles
- **WHEN** the player selects the "Assignment" tab
- **THEN** the panel SHALL display only the three BattleMech slots as selectable options
- **AND** the vehicle slots SHALL NOT appear in the list

#### Scenario: Assign pilot to Force slot

- **GIVEN** a selected pilot with no current assignment and a list of compatible Force slots
- **WHEN** the player picks Force slot `<assignmentId>` and clicks "Assign"
- **THEN** the panel SHALL invoke `useForceStore.getState().assignPilot(<assignmentId>, <vaultPilotId>)`
- **AND** the store action SHALL POST to `/api/forces/assignments/<assignmentId>/pilot` with body `{ pilotId: <vaultPilotId> }`
- **AND** `ForceService.assignPilot(<assignmentId>, <pilotId>)` SHALL be invoked server-side
- **AND** on success the store SHALL call `loadForces()`, refreshing `useForceStore.forces`
- **AND** the panel SHALL re-render showing "Currently assigned: <unitName>"
- **AND** the slot SHALL no longer appear in the unassigned-slots list

#### Scenario: Unassign pilot from Force slot

- **GIVEN** a selected pilot currently assigned to Force slot `<assignmentId>`
- **WHEN** the player clicks "Unassign"
- **THEN** the panel SHALL invoke `useForceStore.getState().clearAssignment(<assignmentId>)`
- **AND** the store action SHALL DELETE `/api/forces/assignments/<assignmentId>`
- **AND** on success the store SHALL call `loadForces()`, refreshing `useForceStore.forces`
- **AND** the panel SHALL re-render with no current assignment displayed
- **AND** the slot SHALL appear in the available-slots list

#### Scenario: Reassigning swaps Force slots cleanly

- **GIVEN** a selected pilot already assigned to Force slot `<assignmentId-1>`
- **WHEN** the player picks Force slot `<assignmentId-2>` and clicks "Assign"
- **THEN** the panel SHALL invoke `useForceStore.getState().assignPilot(<assignmentId-2>, <vaultPilotId>)`
- **AND** the store action SHALL POST to `/api/forces/assignments/<assignmentId-2>/pilot`
- **AND** server-side `ForceService.assignPilot` SHALL handle the prior-assignment cleanup invariant
- **AND** on success the store SHALL call `loadForces()` and the panel SHALL re-render reflecting the new assignment

#### Scenario: API error surfaces in panel

- **GIVEN** a selected pilot and a chosen Force slot
- **WHEN** the player clicks "Assign" and the API responds with a non-2xx status
- **THEN** `useForceStore.error` SHALL be populated with the API's error message
- **AND** the panel SHALL display that error message
- **AND** the pilot's assignment state in `useForceStore.forces` SHALL remain unchanged
- **AND** the "Assign" button SHALL re-enable for retry

#### Scenario: No active Force shows navigation CTA

- **GIVEN** a selected pilot and a campaign with zero Forces created
- **WHEN** the player selects the "Assignment" tab
- **THEN** the panel SHALL display "No active force in this campaign"
- **AND** the panel SHALL render a navigation link to `/gameplay/campaigns/[id]/forces`
- **AND** no API call SHALL be made

