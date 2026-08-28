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

### Requirement: Mek stable deployment readiness
The Mek stable SHALL show deployment readiness for each unit, including unit status, pilot assignment, damage summary, repair/refit tickets, ammo or supply gaps, Battle Value or weight where available, and mission eligibility reasons.

#### Scenario: Stable row explains deployment eligibility
- **WHEN** a unit appears in the Mek stable while a mission context is active
- **THEN** the row SHALL show whether the unit is eligible, why it is blocked or risky, and which action can resolve the blocker

### Requirement: Stable actions preserve campaign context
The Mek stable SHALL route repair, refit, customizer, pilot, acquisition, and readiness actions with campaign and mission return context where applicable.

#### Scenario: Player fixes a blocked unit from stable
- **WHEN** a player opens a fix action for an ineligible unit
- **THEN** the destination surface SHALL receive the campaign unit identity and SHALL return to the stable or readiness screen with validation refreshed

### Requirement: Mech Bay Resolves Saved Custom Roster Identity Honestly

After a cold reload, campaign Mech Bay SHALL resolve a custom roster entry through its exact saved-design source while preserving its separate roster-instance identity and failing visibly when the source cannot resolve.

#### Scenario: Cold reload resolves exact custom source

- **GIVEN** a persisted roster entry has a roster-instance id, `unitSource=custom`, and saved-design `unitRef`
- **WHEN** the player cold reloads and opens that campaign's Mech Bay
- **THEN** resolution SHALL query saved-design authority by the exact `unitRef`
- **AND** the row SHALL retain its roster-instance id and `custom` source kind
- **AND** canonical stock lookup SHALL NOT substitute or rewrite the entry

#### Scenario: Cached identity metadata remains stable

- **WHEN** the custom roster entry resolves after reload
- **THEN** the displayed name and tonnage SHALL equal the persisted safe cached values
- **AND** any supported BV SHALL be labeled available
- **AND** unsupported or unavailable BV SHALL be labeled unavailable rather than copied from stock data

#### Scenario: Missing saved source stays visible

- **GIVEN** the saved design is deleted, missing, malformed, or unavailable
- **WHEN** Mech Bay resolves the persisted roster
- **THEN** the roster row SHALL remain visible with its cached safe name and tonnage
- **AND** it SHALL show an explicit unresolved-source state
- **AND** it SHALL retain the same roster-instance id and `unitRef`
- **AND** it SHALL NOT borrow stock identity, equipment, BV, or readiness

#### Scenario: Unresolved custom source blocks launch side effects

- **WHEN** an unresolved or unsupported custom roster entry participates in readiness evaluation
- **THEN** mission readiness SHALL identify that exact roster instance as blocked
- **AND** encounter materialization and combat launch side effects SHALL NOT begin for it
- **AND** retry SHALL re-resolve the same source reference without removing or duplicating the roster entry

#### Scenario: Receipt authority is reporter-owned

- **WHEN** CAMP-01G proof runs at reviewed head or exact main
- **THEN** the controller SHALL resolve the immutable row by `commandId=camp-01g`
- **AND** the trusted reporter's closed Mech Bay authority artifact SHALL bind the exact passed browser test to resolved and unresolved observations
- **AND** caller-authored booleans, alternate commands, or screenshots alone SHALL NOT satisfy identity or readiness authority

