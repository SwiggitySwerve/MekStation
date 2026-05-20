# Spec Delta: Starmap Interface

## ADDED Requirements

### Requirement: Inner Sphere Seed Dataset

The starmap SHALL ship with a canonical Inner Sphere seed dataset of at least 40 named star systems, loadable as a typed `IStarSystem[]`. The MVP seed covers the five Successor State capitals (Terra, Tharkad, Atreus, Sian, Luthien), the four Periphery capitals, the well-known industrial / Solaris VII / Hesperus II / Northwind / Galatea worlds, and a curated Clan Invasion route, so a player launching the campaign has a recognizable BattleTech-universe map. The full 3,359-system SUCKit dataset import is OUT of scope for this change and is named as a post-MVP follow-up.

**Priority**: High

#### Scenario: Seed dataset loads with at least 40 entries

**GIVEN** the app boots
**WHEN** `loadInnerSphereSeed()` runs
**THEN** the loader SHALL return an array of `IStarSystem` length ≥ 40
**AND** every entry SHALL pass the `isStarSystem` type guard
**AND** every entry's `faction` SHALL be a member of `KNOWN_FACTIONS`
**AND** no two entries SHALL share the same `id`

#### Scenario: Seed dataset includes the Successor State capitals

**GIVEN** the seed dataset
**WHEN** inspected
**THEN** the dataset SHALL contain entries with ids `terra`, `tharkad`, `atreus`, `sian`, `luthien` (the canonical five capitals)
**AND** Terra's position SHALL be at the origin `{ x: 0, y: 0 }` (the Inner Sphere coordinate convention places Terra at 0,0)

#### Scenario: Malformed seed entry rejected

**GIVEN** a developer accidentally introduces a seed entry with a non-string `faction` or a missing `position`
**WHEN** the loader runs
**THEN** the loader SHALL throw a clear error identifying the offending entry index
**AND** the build SHALL fail (the loader runs in the unit-test seed-shape assertion)

---

### Requirement: Selected System Travel Action

The campaign store SHALL expose a `travelToSystem(systemId)` action that updates `campaign.currentSystemId` and emits an activity-log entry of category `'travel'`. The action validates the systemId against the seed dataset; an unknown systemId is a no-op (returns `false`). The action is the ONLY supported path from the starmap UI to the campaign state — the page's "Travel here" button calls it; no direct `setState` on the campaign slice is allowed.

**Priority**: High

#### Scenario: Travel to a valid system updates state + logs the entry

**GIVEN** a campaign with `currentSystemId: 'terra'`
**WHEN** the page calls `travelToSystem('tharkad')`
**THEN** the action SHALL return `true`
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

#### Scenario: Starmap page mounts and shows the current system as selected

**GIVEN** a campaign with `currentSystemId: 'luthien'`
**WHEN** the operator navigates to `/gameplay/campaigns/[id]/starmap`
**THEN** the page SHALL mount `<StarmapDisplay>`
**AND** the `selectedSystem` prop SHALL be `'luthien'`
**AND** the "Currently at" indicator SHALL display the system's name

#### Scenario: Click + "Travel here" round-trips through the store

**GIVEN** the starmap page mounted with `currentSystemId: 'terra'`
**WHEN** the operator clicks the `'sian'` system marker on the canvas
**AND** then clicks the "Travel here" button
**THEN** `travelToSystem('sian')` SHALL be invoked
**AND** the page SHALL re-render with `selectedSystem === 'sian'`
**AND** the activity log SHALL gain a travel entry naming Sian

#### Scenario: Campaign navigation exposes the starmap link

**GIVEN** the campaign navigation component renders
**WHEN** inspected
**THEN** the nav SHALL include a link labelled "Starmap" with `data-testid="nav-starmap"`
**AND** the link's `href` SHALL point to `/gameplay/campaigns/[id]/starmap` for the active campaign
