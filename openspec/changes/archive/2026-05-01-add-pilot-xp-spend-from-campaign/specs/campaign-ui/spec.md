## ADDED Requirements

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
