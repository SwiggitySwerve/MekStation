## MODIFIED Requirements

### Requirement: Overview Tab

The Overview tab SHALL manage unit identity, basic configuration, tech progression, and provide a summary view.

#### Scenario: Basic Info section

- **WHEN** Overview tab renders
- **THEN** Basic Info section appears at the top
- **AND** Name input field allows editing the unit name
- **AND** Tonnage spinner allows setting tonnage (20-100, step 5)
- **AND** Motive Type dropdown shows Biped, Quad, Tripod, LAM, QuadVee options

#### Scenario: Tonnage change from Overview

- **WHEN** user changes tonnage in Overview tab
- **THEN** engine rating is recalculated to maintain Walk MP
- **AND** structure weight recalculates automatically
- **AND** all derived calculations update across tabs

#### Scenario: Tech base configuration

- **WHEN** user changes a subsystem tech base
- **THEN** the tech progression is updated
- **AND** Mixed tech is detected if subsystems use different tech bases
- **AND** component options are filtered to match the new tech base

## MODIFIED Requirements

### Requirement: Structure Tab

The Structure tab SHALL manage system components, enhancement selection, and movement configuration.

#### Scenario: Two-column layout

- **WHEN** Structure tab renders
- **THEN** left column shows Chassis panel with component selections
- **AND** right column shows Movement panel
- **AND** tonnage and motive type are NOT shown (moved to Overview)

#### Scenario: Chassis panel components

- **WHEN** Chassis panel renders
- **THEN** Engine Type dropdown is shown with weight and slots
- **AND** Gyro dropdown is shown with weight and slots
- **AND** Structure dropdown is shown with weight and slots
- **AND** Cockpit dropdown is shown with weight and slots
- **AND** Enhancement dropdown is shown (None, MASC, TSM)
- **AND** Engine Rating is displayed as derived info

#### Scenario: Walk MP drives engine rating

- **WHEN** user changes Walk MP value
- **THEN** engine rating is calculated as tonnage × walkMP
- **AND** engine rating is updated in the store
