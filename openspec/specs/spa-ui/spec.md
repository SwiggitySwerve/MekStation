# spa-ui Specification

## Purpose

TBD - created by archiving change add-spa-picker-component. Update Purpose after archive.

## Requirements

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

### Requirement: Picker Embedding in Pilot Editor

The SPA picker SHALL be embeddable inside the pilot detail page's
Abilities section as a modal, configured with the pilot's current
ability ids as `excludedIds`.

#### Scenario: Modal opens with excluded ids set

- **GIVEN** a pilot already owns `iron_man` and `weapon_specialist`
- **WHEN** the Abilities section opens the add-ability modal
- **THEN** the `SPAPicker` SHALL mount with `excludedIds = ["iron_man",
"weapon_specialist"]`
- **AND** those two entries SHALL render disabled with an "Already owned"
  label

#### Scenario: Picker filter mode respects creation flow

- **GIVEN** a pilot is on the detail page outside the creation flow
- **WHEN** the add-ability modal opens
- **THEN** the `SPAPicker` SHALL mount with `filterMode =
"purchase-only"`
- **AND** origin-only entries SHALL render disabled

#### Scenario: Picker filter mode in creation flow

- **GIVEN** a pilot is on the creation page (`/gameplay/pilots/create`)
- **WHEN** the add-ability modal opens
- **THEN** the `SPAPicker` SHALL mount with `filterMode = "all"`
- **AND** origin-only and flaw entries SHALL render enabled

### Requirement: Editor Reacts to Picker Selection

The Abilities editor SHALL receive picker selections and route them
through the purchase or flaw-grant flow.

#### Scenario: Picker selection triggers purchase

- **GIVEN** the add-ability modal is open and the player confirms an
  entry with a designation
- **WHEN** the picker emits
  `onSelect({ spa, designation })`
- **THEN** the editor SHALL invoke `PilotService.purchaseSPA` (for
  non-flaws) or the flaw-grant path (for flaws)
- **AND** the modal SHALL close on success

#### Scenario: Purchase failure keeps modal open

- **GIVEN** the player selects an entry whose purchase fails (e.g.
  insufficient XP)
- **WHEN** `PilotService.purchaseSPA` rejects
- **THEN** the modal SHALL remain open with the picker state intact
- **AND** a toast SHALL surface the rejection message

### Requirement: SPA Badge Component

The system SHALL provide a reusable `SPABadge` component that renders an
SPA as a pill with category color accent, displayName, optional
designation, and a tooltip.

#### Scenario: Compact badge renders name and designation

- **GIVEN** a badge is rendered with
  `spa = weapon_specialist` and
  `designation = { type: "weapon_type", value: "Medium Laser" }`
- **WHEN** the badge mounts in `variant="compact"`
- **THEN** the badge text SHALL read "Weapon Specialist (Medium Laser)"
- **AND** the badge background SHALL use the Gunnery category color
  token

#### Scenario: Badge without designation renders name only

- **GIVEN** a badge is rendered with `spa = iron_man` and
  `designation = undefined`
- **WHEN** the badge mounts
- **THEN** the badge text SHALL read "Iron Man"

#### Scenario: Tooltip exposes full description and source

- **GIVEN** a badge is rendered for any SPA
- **WHEN** the user hovers or focuses the badge
- **THEN** a tooltip SHALL open containing the full `description`
- **AND** the tooltip SHALL display the `source` rulebook label

#### Scenario: Expanded variant shows multiline content

- **GIVEN** a badge is rendered with `variant="expanded"`
- **WHEN** the badge mounts
- **THEN** the badge SHALL render displayName, designation, and
  description inline (no tooltip needed)

### Requirement: SPA Badge Row on Unit Card

The system SHALL render a compact SPA badge row on the pilot-mech unit
card, below the wounds indicator.

#### Scenario: Pilot with abilities renders badge row

- **GIVEN** a pilot-mech unit card for a pilot that owns two SPAs
- **WHEN** the card renders
- **THEN** a badge row SHALL render below the wounds indicator
- **AND** each badge SHALL use the `variant="compact"` form

#### Scenario: Pilot with zero abilities renders no row

- **GIVEN** a pilot-mech unit card for a pilot with an empty
  `abilities` array
- **WHEN** the card renders
- **THEN** no badge row SHALL render
- **AND** no empty-state placeholder SHALL occupy vertical space

#### Scenario: Unknown ability id is skipped silently

- **GIVEN** a pilot whose `abilities` contains an id not in the
  canonical catalog or its legacy alias table
- **WHEN** the card renders
- **THEN** the unknown id SHALL be skipped without error
- **AND** remaining known abilities SHALL render normally
