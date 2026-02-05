## MODIFIED Requirements

### Requirement: Structure Tab

The Structure tab SHALL manage unit chassis, movement, engine, and system components using a three-column layout.

#### Scenario: Three-column layout

- **WHEN** Structure tab renders
- **THEN** left column shows Chassis panel
- **AND** middle column shows System Components panel
- **AND** right column shows Movement panel
- **AND** layout stacks on narrow screens

#### Scenario: Chassis panel

- **WHEN** Chassis panel renders
- **THEN** Tonnage input with +/- buttons is shown (range 20-100, step 5)
- **AND** Omni checkbox is shown
- **AND** Motive Type dropdown is shown (Biped, Quad, Tripod, LAM, QuadVee)
- **AND** Enhancement dropdown is shown (None, MASC, TSM)

#### Scenario: Tonnage change

- **WHEN** user changes tonnage
- **THEN** engine rating is recalculated to maintain Walk MP
- **AND** engine rating is clamped to valid range (10-500)
- **AND** structure weight recalculates automatically

#### Scenario: Enhancement selection with mutual exclusion

- **WHEN** user selects MASC
- **THEN** TSM option becomes disabled
- **AND** enhancement info shows MASC description
- **WHEN** user selects TSM
- **THEN** MASC option becomes disabled
- **AND** enhancement info shows TSM description

#### Scenario: System Components panel

- **WHEN** System Components panel renders
- **THEN** Engine Type, Gyro, Structure, and Cockpit dropdowns are shown
- **AND** each shows weight and critical slots
- **AND** Engine Rating is displayed as derived info

#### Scenario: Walk MP drives engine rating

- **WHEN** user changes Walk MP value
- **THEN** engine rating is calculated as tonnage × walkMP
- **AND** engine rating is updated in the store
