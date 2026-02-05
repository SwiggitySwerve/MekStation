## MODIFIED Requirements

### Requirement: Overview Tab

The Overview tab SHALL manage unit identity, tech progression, and provide a summary view.

#### Scenario: Basic Info section

- **WHEN** Overview tab renders
- **THEN** Basic Information panel appears as single full-width panel
- **AND** Chassis name input field allows editing the unit name
- **AND** Clan Name input field allows editing the optional Clan designation
- **AND** Model input field allows editing the variant/model name
- **AND** MUL ID, Year, and Tech Level fields appear in a three-column row

#### Scenario: Tech base configuration

- **WHEN** user changes a subsystem tech base
- **THEN** the tech progression is updated
- **AND** Mixed tech is detected if subsystems use different tech bases
- **AND** component options are filtered to match the new tech base

#### Scenario: Overview does NOT show tonnage or motive type

- **WHEN** Overview tab renders
- **THEN** Tonnage control is NOT displayed (moved to Structure tab)
- **AND** Motive Type dropdown is NOT displayed (moved to Structure tab)
- **AND** only Basic Information and Tech Base Configuration panels are shown

### Requirement: Structure Tab

The Structure tab SHALL manage tonnage, motive type, system components, enhancement selection, and movement configuration.

#### Scenario: Two-column layout

- **WHEN** Structure tab renders
- **THEN** left column shows Chassis panel with tonnage and component selections
- **AND** right column shows Movement panel with motive type

#### Scenario: Chassis panel components

- **WHEN** Chassis panel renders
- **THEN** Tonnage stepper control appears at the top (20-100 tons, step 5)
- **AND** Engine Type dropdown is shown with weight and slots
- **AND** Gyro dropdown is shown with weight and slots
- **AND** Structure dropdown is shown with weight and slots
- **AND** Cockpit dropdown is shown with weight and slots
- **AND** Engine Rating is displayed as derived info
- **AND** Heat Sinks subsection shows type dropdown and count stepper

#### Scenario: Movement panel components

- **WHEN** Movement panel renders
- **THEN** Walk MP stepper appears at top of panel
- **AND** Run MP is displayed as calculated value
- **AND** Jump MP stepper allows setting jump capability
- **AND** Jump Type dropdown allows selecting jump jet type
- **AND** Enhancement subsection shows None/MASC/TSM options
- **AND** Motive Type dropdown appears at the bottom of the panel

#### Scenario: Tonnage change from Structure tab

- **WHEN** user changes tonnage in Structure tab
- **THEN** engine rating is recalculated to maintain Walk MP
- **AND** structure weight recalculates automatically
- **AND** all derived calculations update across tabs

#### Scenario: Walk MP drives engine rating

- **WHEN** user changes Walk MP value
- **THEN** engine rating is calculated as tonnage × walkMP
- **AND** engine rating is updated in the store

#### Scenario: Motive Type selection

- **WHEN** user selects Motive Type
- **THEN** available options are Biped, Quad, Tripod, LAM, QuadVee
- **AND** selection is stored in unit configuration
