# campaign-bay-ui Specification

## Purpose

Defines Campaign Bay UI requirements for Bay Navigation Group, Mech Bay Page, Repair Bay Page, and Medical Bay Page, preserving the source-of-truth scope introduced by archived change add-campaign-bay-ui.

## Requirements
### Requirement: Bay Navigation Group

The system SHALL provide a "Bays" campaign-navigation group giving access to the
Mech Bay, Repair Bay, Medical Bay, and Salvage surfaces from the campaign
dashboard.

#### Scenario: Bay surfaces are reachable

- **GIVEN** an open campaign
- **WHEN** the campaign navigation renders
- **THEN** a "Bays" group SHALL be present
- **AND** it SHALL link to the Mech Bay, Repair Bay, Medical Bay, and Salvage pages

### Requirement: Mech Bay Page

The system SHALL provide a Mech Bay page showing a roster-wide unit-status grid
with damage state, repair-ticket count, and combat-readiness, and drill-down to
each unit's repair detail.

#### Scenario: Mech Bay lists every roster unit

- **GIVEN** a campaign roster with several units, some damaged
- **WHEN** the Mech Bay page renders
- **THEN** each roster unit SHALL appear as a row showing its damage state and repair-ticket count
- **AND** each row SHALL provide a drill-down link to that unit's Repair Bay detail

#### Scenario: Mech Bay empty state

- **GIVEN** a campaign with no roster units
- **WHEN** the Mech Bay page renders
- **THEN** an empty state SHALL be shown rather than an error

### Requirement: Repair Bay Page

The system SHALL provide a Repair Bay page rendering `ICampaignInventory.repairBay`
grouped by unit, with per-ticket detail and a priority-reorder action.

#### Scenario: Repair Bay lists tickets grouped by unit

- **GIVEN** a campaign whose inventory carries repair tickets for two units
- **WHEN** the Repair Bay page renders
- **THEN** the tickets SHALL be grouped by unit
- **AND** each ticket SHALL show its kind, location, expected hours, parts-ready flag, and status

#### Scenario: Priority reorder persists

- **GIVEN** a Repair Bay with several queued tickets
- **WHEN** the player reorders a ticket's priority
- **THEN** a `priority` ordinal SHALL be written onto the campaign's repair-ticket state
- **AND** the campaign SHALL be marked dirty so the persistence store auto-saves

#### Scenario: Repair Bay empty state

- **GIVEN** a campaign with no repair tickets
- **WHEN** the Repair Bay page renders
- **THEN** an empty state SHALL be shown rather than an error

### Requirement: Medical Bay Page

The system SHALL provide a read-only Medical Bay page rendering
`ICampaignInventory.medicalBay` with each injured pilot's injury level,
days-to-recover, and recovery status.

#### Scenario: Medical Bay lists injured pilots

- **GIVEN** a campaign whose inventory carries injured pilots
- **WHEN** the Medical Bay page renders
- **THEN** each injured pilot SHALL appear with injury level, days-to-recover, and status

#### Scenario: Medical Bay exposes no healing controls

- **GIVEN** the Medical Bay page is rendered
- **WHEN** the player inspects the page
- **THEN** no control SHALL allow healing a pilot directly
- **AND** recovery copy SHALL indicate healing happens on day advancement

#### Scenario: Medical Bay empty state

- **GIVEN** a campaign with no injured pilots
- **WHEN** the Medical Bay page renders
- **THEN** an empty state SHALL be shown rather than an error

### Requirement: Salvage Acceptance Panel

The system SHALL provide a Salvage Acceptance panel rendering
`ICampaignInventory.salvageBay` with per-item accept and decline actions and a
running mercenary-share value total.

#### Scenario: Accepting a salvage item persists its status

- **GIVEN** a salvage item with status `pending`
- **WHEN** the player accepts it
- **THEN** the item's status SHALL become `accepted` on the campaign's salvage state
- **AND** the campaign SHALL be marked dirty so the persistence store auto-saves

#### Scenario: Declining a salvage item excludes it from the total

- **GIVEN** a salvage item with status `pending` contributing to the value total
- **WHEN** the player declines it
- **THEN** the item's status SHALL become `declined`
- **AND** the running mercenary-share value total SHALL no longer include that item

#### Scenario: Value total is a pure projection

- **GIVEN** a salvage bay with several accepted and declined items
- **WHEN** the value total is computed
- **THEN** it SHALL equal the sum of recovered values of items with status `accepted`
- **AND** toggling one item's status SHALL recompute the total without double-counting

#### Scenario: Salvage Acceptance empty state

- **GIVEN** a campaign with no salvage candidates
- **WHEN** the Salvage Acceptance panel renders
- **THEN** an empty state SHALL be shown rather than an error

### Requirement: Bay Surface Loading and Error States

The system SHALL implement loading and error states on every bay surface
consistent with the existing `campaign-ui` conventions.

#### Scenario: Loading state while inventory resolves

- **GIVEN** a campaign whose inventory has not yet loaded
- **WHEN** any bay surface renders
- **THEN** a loading state SHALL be shown

#### Scenario: Error state on inventory failure

- **GIVEN** an inventory load that fails
- **WHEN** any bay surface renders
- **THEN** an error state SHALL be shown with a retry affordance

