# spa-ui Specification Delta

## ADDED Requirements

### Requirement: SPA Picker Layout

The system SHALL provide a reusable `SPAPicker` component that renders the
unified SPA catalog with category tabs, a search input, and source filter
chips.

#### Scenario: Picker renders full catalog on mount

- **GIVEN** the `SPAPicker` is mounted with no filters and no excluded ids
- **WHEN** the component first renders
- **THEN** it SHALL display all 91 SPAs loaded from the canonical catalog
- **AND** the "All" category tab SHALL be active by default
- **AND** the search input SHALL be empty

#### Scenario: Category tabs cover every catalog category

- **GIVEN** the `SPAPicker` is mounted
- **WHEN** the tab bar renders
- **THEN** tabs SHALL exist for Piloting, Gunnery, Miscellaneous, Infantry,
  aToW, Manei Domini, Unofficial, Edge, plus an "All" tab
- **AND** each tab SHALL display a count of entries matching the active
  search and source filters

#### Scenario: Switching tab filters visible entries

- **GIVEN** the picker is showing the "All" tab
- **WHEN** the user selects the "Gunnery" tab
- **THEN** only SPAs with `category === "gunnery"` SHALL be visible
- **AND** the "Gunnery" tab SHALL be visually marked active

### Requirement: Search and Source Filtering

The system SHALL support text search and source-chip filtering over the
catalog within the active category tab.

#### Scenario: Text search matches displayName

- **GIVEN** the picker is showing the "All" tab
- **WHEN** the user types "weapon specialist" into the search input
- **THEN** only entries whose `displayName` contains "weapon specialist"
  (case-insensitive) SHALL be visible

#### Scenario: Text search matches description

- **GIVEN** the picker is showing the "All" tab
- **WHEN** the user types a keyword that appears only in an entry's
  `description`
- **THEN** that entry SHALL be visible
- **AND** entries without the keyword in `displayName`, `description`, or
  `source` SHALL be hidden

#### Scenario: Source chip filters by rulebook

- **GIVEN** the picker is showing the "All" tab with no source chips
  active
- **WHEN** the user toggles the "Unofficial" source chip on
- **THEN** only SPAs with `source === "Unofficial"` SHALL be visible
- **AND** other source chips SHALL remain available to layer additional
  sources

#### Scenario: Combined filters return empty set

- **GIVEN** the picker has search text and source chips that together
  match zero entries
- **WHEN** the filters are applied
- **THEN** the picker SHALL render a "No abilities match these filters"
  empty state

### Requirement: Entry Row Content

The system SHALL render each catalog entry as a row showing displayName,
description, XP cost or flag badge, source badge, and category accent.

#### Scenario: Purchasable entry renders cost badge

- **GIVEN** a row for an entry with `xpCost = 100` and `isFlaw = false`
- **WHEN** the row renders
- **THEN** the cost badge SHALL display "100 XP"
- **AND** the row SHALL be enabled

#### Scenario: Flaw entry renders XP-gain label

- **GIVEN** a row for an entry with `isFlaw === true` and a negative
  `xpCost`
- **WHEN** the row renders
- **THEN** the badge SHALL indicate the XP granted (e.g. "+200 XP")
- **AND** the entry SHALL be tagged as a Flaw

#### Scenario: Origin-only entry is tagged

- **GIVEN** a row for an entry with `isOriginOnly === true`
- **WHEN** the row renders
- **THEN** an "Origin-Only" tag SHALL be visible alongside the cost badge
- **AND** when the picker's `filterMode === "purchase-only"`, the row
  SHALL render disabled

#### Scenario: Excluded entry renders disabled

- **GIVEN** the picker is mounted with `excludedIds` containing a given
  SPA id
- **WHEN** that entry's row renders
- **THEN** the row SHALL render disabled
- **AND** an "Already owned" label SHALL be visible

### Requirement: Designation Prompt

The system SHALL, for any SPA with `requiresDesignation === true`, open a
designation prompt keyed on `designationType` before emitting selection.

#### Scenario: Weapon-type designation opens after row click

- **GIVEN** the user clicks a row for Weapon Specialist
  (`designationType === "weapon_type"`)
- **WHEN** the selection is initiated
- **THEN** the picker SHALL open a designation prompt listing weapon types
  from the weapon catalog
- **AND** no `onSelect` event SHALL fire yet

#### Scenario: Designation confirm emits payload

- **GIVEN** the designation prompt is open for Range Master
  (`designationType === "range_bracket"`)
- **WHEN** the user selects "Medium" and confirms
- **THEN** the picker SHALL emit
  `onSelect({ spa, designation: { type: "range_bracket", value: "Medium" } })`

#### Scenario: Designation cancel returns to picker

- **GIVEN** the designation prompt is open
- **WHEN** the user cancels
- **THEN** the prompt SHALL close
- **AND** no `onSelect` event SHALL fire
- **AND** the picker SHALL restore the prior tab and filters

#### Scenario: Non-designation SPA emits immediately

- **GIVEN** the user clicks a row for an entry with
  `requiresDesignation === false`
- **WHEN** the click resolves
- **THEN** `onSelect({ spa, designation: undefined })` SHALL fire
- **AND** no designation prompt SHALL open

### Requirement: Accessibility

The system SHALL expose the picker through keyboard and assistive-tech
controls.

#### Scenario: Keyboard tab navigation

- **GIVEN** the tab bar has focus
- **WHEN** the user presses ArrowRight
- **THEN** focus SHALL advance to the next tab
- **AND** pressing Enter SHALL activate the focused tab

#### Scenario: Row keyboard activation

- **GIVEN** an entry row has focus
- **WHEN** the user presses Enter
- **THEN** the picker SHALL trigger the same selection flow as a click
  (including opening the designation prompt when required)

#### Scenario: Designation prompt traps focus

- **GIVEN** the designation prompt is open
- **WHEN** the user presses Tab repeatedly
- **THEN** focus SHALL cycle only through prompt-internal controls until
  the prompt is closed
