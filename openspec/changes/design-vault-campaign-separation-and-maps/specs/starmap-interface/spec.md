# starmap-interface Delta

## MODIFIED Requirements

### Requirement: Selected System Travel Action

The campaign store SHALL expose a `travelToSystem(systemId)` action that commits travel through the travel-economy pipeline: it validates the systemId against the seed dataset, requires an affordable previewed route, advances the campaign date by the route duration, posts the route's costs to campaign finances, updates `campaign.currentSystemId` on arrival, and emits an activity-log entry of category `'travel'` recording route, duration, and costs. An unknown systemId, the current system, or an unaffordable route is a no-op (returns `false`) with a typed reason. The action is the ONLY supported path from the starmap UI to the campaign state — the page's "Travel here" button calls it after preview; no direct `setState` on the campaign slice is allowed.

**Source**: `openspec/changes/archive/2026-05-20-wire-starmap-into-campaign/` (Wave 6.4); travel-economy extension per `design-vault-campaign-separation-and-maps`
**Priority**: High

#### Scenario: Travel to a valid system updates state + logs the entry

**GIVEN** a campaign with `currentSystemId: 'terra'` and sufficient funds
**WHEN** the page commits `travelToSystem('tharkad')` from a previewed route of N days and total cost C
**THEN** the action SHALL return `true`
**AND** the campaign date SHALL advance N days
**AND** campaign finances SHALL record transactions totaling C
**AND** `campaign.currentSystemId` SHALL be `'tharkad'`
**AND** the activity log SHALL gain one new entry with category `'travel'` and summary containing `"Tharkad"`

#### Scenario: Travel to the same system is a no-op

**GIVEN** a campaign with `currentSystemId: 'terra'`
**WHEN** the page calls `travelToSystem('terra')`
**THEN** the action SHALL return `false`
**AND** `campaign.currentSystemId` SHALL remain `'terra'`
**AND** the activity log SHALL gain ZERO new entries

#### Scenario: Travel to an unknown system is rejected

**GIVEN** a campaign with `currentSystemId: 'terra'`
**WHEN** the page calls `travelToSystem('not-a-real-system')`
**THEN** the action SHALL return `false`
**AND** `campaign.currentSystemId` SHALL remain `'terra'`
**AND** no activity-log entry SHALL be emitted

#### Scenario: Unaffordable travel is rejected without state change

**GIVEN** a campaign whose balance is below a previewed route's total cost
**WHEN** the page calls `travelToSystem` for that route
**THEN** the action SHALL return `false` with an insufficient-funds reason
**AND** the campaign date, finances, and `currentSystemId` SHALL be unchanged

#### Scenario: Starmap page mounts and shows the current system as selected

**GIVEN** a campaign with `currentSystemId: 'luthien'`
**WHEN** the operator navigates to `/gameplay/campaigns/[id]/starmap`
**THEN** the page SHALL mount `<StarmapDisplay>`
**AND** the `selectedSystem` prop SHALL be `'luthien'`
**AND** the "Current location" indicator SHALL display the system's name

#### Scenario: Click + "Travel here" round-trips through the store

**GIVEN** the starmap page mounted with `currentSystemId: 'terra'` and sufficient funds
**WHEN** the operator clicks the `'sian'` system marker on the canvas
**AND** then confirms travel from the route preview
**THEN** `travelToSystem('sian')` SHALL be invoked
**AND** the page SHALL re-render with `selectedSystem === 'sian'`
**AND** the activity log SHALL gain a travel entry naming Sian

#### Scenario: Campaign navigation exposes the starmap link

**GIVEN** the campaign navigation component renders
**WHEN** inspected
**THEN** the nav SHALL include a link labelled "Starmap" with `data-testid="nav-starmap"`
**AND** the link's `href` SHALL point to `/gameplay/campaigns/[id]/starmap` for the active campaign

## ADDED Requirements

### Requirement: Route preview panel

Selecting a destination system SHALL display a route preview before any commitment: duration in days, itemized costs (jump/transit fees, per-day operating cost, total), projected arrival date, and affordability against the current balance. The preview SHALL be side-effect free and SHALL match the values the commit would apply.

#### Scenario: Preview shows time, cost, and affordability

- **WHEN** the operator selects a destination system other than the current one
- **THEN** the preview SHALL display duration, itemized costs, arrival date, and an affordability indicator
- **AND** no campaign state SHALL change until travel is confirmed

### Requirement: Opportunity markers

The starmap SHALL render markers for active opportunities anchored to systems, visually distinct from ordinary system markers, with the opportunity's remaining availability window surfaced on hover/selection. Marker visibility SHALL respect the campaign's GM redaction rules for provenance.

#### Scenario: Active opportunity is visible and inspectable

- **WHEN** an opportunity anchored to system S is within its availability window
- **THEN** the starmap SHALL render an opportunity marker at S
- **AND** selecting it SHALL show the opportunity summary and remaining window

### Requirement: Travel-in-progress rendering

While a committed travel is in progress within a session flow, the starmap SHALL render the active route and progress state, and SHALL suppress conflicting travel commitments until arrival completes.

#### Scenario: Route renders during transit

- **WHEN** travel has been committed and the campaign is mid-transit in the active flow
- **THEN** the starmap SHALL render the committed route with progress indication
- **AND** attempting a second commitment SHALL be rejected until arrival
