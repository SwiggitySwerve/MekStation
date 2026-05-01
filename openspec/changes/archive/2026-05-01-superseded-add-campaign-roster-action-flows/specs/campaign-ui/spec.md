## ADDED Requirements

### Requirement: Pilot Progression Panel Surfacing in Campaign Roster

The campaign personnel-roster page SHALL surface `PilotProgressionPanel` and `PilotAbilitiesPanel` from the personnel-row interaction without leaving the campaign context.

#### Scenario: Roster row opens side panel

- **GIVEN** a campaign personnel-roster page with at least one pilot
- **WHEN** the player clicks a personnel row
- **THEN** a side panel SHALL open within the roster page layout
- **AND** the side panel SHALL contain tabs labeled "Progression", "Abilities", and "Assignment"
- **AND** the page URL SHALL NOT change to `/gameplay/pilots/<id>`

#### Scenario: Progression tab renders existing panel

- **GIVEN** the side panel is open for a selected pilot
- **WHEN** the player selects the "Progression" tab
- **THEN** the existing `PilotProgressionPanel` SHALL render with the selected pilot
- **AND** the panel's "Improve Gunnery" / "Improve Piloting" buttons SHALL be functional per the pilot-system spec

#### Scenario: Abilities tab renders existing panel

- **GIVEN** the side panel is open for a selected pilot
- **WHEN** the player selects the "Abilities" tab
- **THEN** the existing `PilotAbilitiesPanel` SHALL render with the selected pilot
- **AND** the panel's SPA purchase flow SHALL be functional per the pilot-system spec

#### Scenario: Side panel does not break SSR

- **GIVEN** the campaign personnel-roster page is server-rendered
- **WHEN** the page is delivered to the client
- **THEN** the side panel SHALL NOT render until the player clicks a row
- **AND** there SHALL be no React hydration warning

#### Scenario: Closing side panel preserves campaign context

- **GIVEN** the side panel is open
- **WHEN** the player clicks the close button or outside the panel
- **THEN** the side panel SHALL close
- **AND** the campaign roster scroll position SHALL be preserved
- **AND** the selected campaign in `useCampaignStore` SHALL remain unchanged

### Requirement: Crew Assignment Panel

The campaign personnel-roster side panel SHALL include a Crew Assignment tab that lets the player assign or unassign the selected pilot to a campaign-instance unit, calling the existing `CampaignInstanceAssignmentOperations` service through the campaign store.

#### Scenario: Display current assignment

- **GIVEN** a selected pilot already assigned to unit `BJ-1` in the active campaign instance
- **WHEN** the player selects the "Assignment" tab
- **THEN** the panel SHALL display "Currently assigned: BJ-1"
- **AND** an "Unassign" button SHALL render

#### Scenario: Display compatible unassigned units

- **GIVEN** a selected pilot with role `MECHWARRIOR` and no current assignment
- **AND** a campaign instance with three unassigned BattleMechs and two unassigned vehicles
- **WHEN** the player selects the "Assignment" tab
- **THEN** the panel SHALL display only the three unassigned BattleMechs as selectable options
- **AND** the vehicles SHALL NOT appear in the list

#### Scenario: Assign pilot to unit

- **GIVEN** a selected pilot with no assignment and a list of compatible units
- **WHEN** the player picks unit `BJ-1` and clicks "Assign"
- **THEN** the campaign store SHALL invoke `assignPilotToUnit(pilotId, "BJ-1")`
- **AND** `CampaignInstanceAssignmentOperations.assignPilotToUnit` SHALL be called server-side
- **AND** on success the wrapper SHALL call `usePersonnelStore.updatePerson(pilotId, { unitId: "BJ-1" })` to keep the campaign personnel-roster row in sync (the assignment service writes to the campaign instance, NOT to `IPerson` — without this sync the personnel page shows stale `unitId`)
- **AND** the panel SHALL re-render showing "Currently assigned: BJ-1"
- **AND** the unit `BJ-1` SHALL no longer appear in the unassigned-units list

#### Scenario: Unassign pilot

- **GIVEN** a selected pilot assigned to `BJ-1`
- **WHEN** the player clicks "Unassign"
- **THEN** the campaign store SHALL invoke `unassignPilot(pilotId)`
- **AND** `CampaignInstanceAssignmentOperations.unassignPilot` SHALL be called server-side
- **AND** on success the wrapper SHALL call `usePersonnelStore.updatePerson(pilotId, { unitId: undefined })` to clear the assignment on the roster row
- **AND** the panel SHALL re-render with no current assignment displayed
- **AND** the unit `BJ-1` SHALL appear in the unassigned-units list

#### Scenario: Reassigning auto-unassigns prior unit

- **GIVEN** a selected pilot already assigned to `BJ-1`
- **WHEN** the player picks unit `BJ-2` from a list and clicks "Assign"
- **THEN** `CampaignInstanceAssignmentOperations.assignPilotToUnit(pilotId, "BJ-2")` SHALL be called
- **AND** the service SHALL handle the prior assignment cleanup internally
- **AND** the panel SHALL re-render showing "Currently assigned: BJ-2"

#### Scenario: API error surfaces in panel

- **GIVEN** a selected pilot and a chosen unit
- **WHEN** the player clicks "Assign" and the campaign-store action returns an error
- **THEN** the panel SHALL display the error message
- **AND** the pilot's assignment state SHALL remain unchanged
- **AND** the "Assign" button SHALL re-enable for retry
