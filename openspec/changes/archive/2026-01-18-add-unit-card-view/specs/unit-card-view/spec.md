# Unit Card View Specification

## ADDED Requirements

### Requirement: Unit Card Data Model

The system SHALL aggregate unit data into a card-friendly format.

#### Scenario: Basic stats aggregation

- **GIVEN** a unit with complete data
- **WHEN** generating card data
- **THEN** card SHALL include: name, chassis, model, tonnage
- **AND** card SHALL include: tech base, era, rules level
- **AND** card SHALL include: BV, C-Bill cost

#### Scenario: Movement aggregation

- **GIVEN** a unit with movement data
- **WHEN** generating card data
- **THEN** card SHALL include: walk MP, run MP, jump MP
- **AND** card SHALL indicate movement enhancements (MASC, TSM)

#### Scenario: Weapons aggregation

- **GIVEN** a unit with mounted weapons
- **WHEN** generating card data
- **THEN** each weapon SHALL show: name, damage, range brackets, heat
- **AND** identical weapons MAY be grouped with count
- **AND** weapons SHALL be sorted by damage or location

#### Scenario: Heat summary

- **GIVEN** a unit with weapons and heat sinks
- **WHEN** calculating heat summary
- **THEN** total heat generated (all weapons firing) SHALL be shown
- **AND** heat dissipation capacity SHALL be shown
- **AND** net heat (generated minus dissipated) SHALL be shown

### Requirement: Compact Card Variant

The system SHALL provide a compact card for list views.

#### Scenario: Compact card content

- **GIVEN** compact card variant requested
- **WHEN** rendering card
- **THEN** card SHALL show: name, tonnage, BV
- **AND** card SHALL show: movement (walk/run/jump)
- **AND** card SHALL show: tech base indicator
- **AND** card SHALL NOT show: weapons list, equipment details

#### Scenario: Compact card sizing

- **GIVEN** compact card in a list
- **WHEN** rendering
- **THEN** card SHALL fit in a single row
- **AND** card SHALL be horizontally scrollable on mobile if needed

### Requirement: Standard Card Variant

The system SHALL provide a standard card with key details.

#### Scenario: Standard card sections

- **GIVEN** standard card variant requested
- **WHEN** rendering card
- **THEN** card SHALL include header (name, tonnage, BV, era)
- **AND** card SHALL include movement section
- **AND** card SHALL include armor/structure section
- **AND** card SHALL include weapons table
- **AND** card SHALL include heat summary
- **AND** card SHALL include action buttons

#### Scenario: Weapons table format

- **GIVEN** weapons section rendering
- **WHEN** displaying weapons
- **THEN** each row SHALL show: weapon name, damage, range (S/M/L), heat
- **AND** ammo-dependent weapons SHALL show ammo count
- **AND** destroyed weapons SHALL be visually indicated (for gameplay)

#### Scenario: Armor section format

- **GIVEN** armor section rendering
- **WHEN** displaying armor
- **THEN** total armor points SHALL be shown
- **AND** max possible armor SHALL be shown
- **AND** percentage of max SHALL be indicated
- **AND** structure type SHALL be shown

### Requirement: Expanded Card Variant

The system SHALL provide an expanded card with full details.

#### Scenario: Expanded card content

- **GIVEN** expanded card variant requested
- **WHEN** rendering card
- **THEN** card SHALL include all standard card content
- **AND** card SHALL include full equipment list (non-weapons)
- **AND** card SHALL include critical slot summary per location
- **AND** card SHALL include quirks (if any)
- **AND** card SHALL include fluff/notes (if any)

#### Scenario: Equipment list

- **GIVEN** equipment section rendering
- **WHEN** displaying non-weapon equipment
- **THEN** electronics (ECM, BAP, C3) SHALL be listed
- **AND** physical weapons SHALL be listed
- **AND** ammo bins SHALL be listed with counts
- **AND** special equipment (MASC, TSM, etc.) SHALL be listed

### Requirement: Quick Actions

The system SHALL provide quick actions on unit cards.

#### Scenario: Export action

- **GIVEN** a unit card with Export button
- **WHEN** user clicks Export
- **THEN** export dialog SHALL open
- **AND** user can download shareable bundle

#### Scenario: Share action

- **GIVEN** a unit card with Share button
- **WHEN** user clicks Share
- **THEN** share dialog SHALL open
- **AND** user can generate share link or configure permissions

#### Scenario: Edit action

- **GIVEN** a unit card with Edit button
- **WHEN** user clicks Edit
- **THEN** user SHALL navigate to customizer with unit loaded
- **AND** for canonical units, a copy SHALL be created first

#### Scenario: Duplicate action

- **GIVEN** a unit card with Duplicate button
- **WHEN** user clicks Duplicate
- **THEN** a copy of the unit SHALL be created
- **AND** copy SHALL have modified name (e.g., "Atlas AS7-D (Copy)")
- **AND** copy SHALL open in customizer

### Requirement: Card Responsiveness

The system SHALL render cards appropriately across devices.

#### Scenario: Desktop layout

- **GIVEN** desktop viewport
- **WHEN** rendering cards in grid
- **THEN** multiple cards SHALL display per row
- **AND** standard card width approximately 400px

#### Scenario: Mobile layout

- **GIVEN** mobile viewport
- **WHEN** rendering cards
- **THEN** cards SHALL stack vertically
- **AND** cards SHALL use full width
- **AND** touch targets SHALL be appropriately sized

#### Scenario: Print layout

- **GIVEN** print request
- **WHEN** rendering cards
- **THEN** cards SHALL use print-friendly styles
- **AND** action buttons SHALL be hidden
- **AND** colors SHALL be optimized for printing
