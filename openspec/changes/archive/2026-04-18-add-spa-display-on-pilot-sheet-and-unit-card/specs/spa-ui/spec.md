# spa-ui Specification Delta

## ADDED Requirements

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
