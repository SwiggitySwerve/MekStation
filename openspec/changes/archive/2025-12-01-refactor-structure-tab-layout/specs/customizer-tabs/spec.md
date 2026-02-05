## MODIFIED Requirements

### Requirement: Structure Tab

The Structure tab SHALL manage unit movement, engine, and system components using a movement-first design where Walk MP determines engine rating.

#### Scenario: Two-column layout

- **WHEN** Structure tab renders
- **THEN** left column shows System Components panel
- **AND** right column shows Movement panel
- **AND** layout is responsive (stacks on narrow screens)

#### Scenario: System Components panel

- **WHEN** System Components panel renders
- **THEN** Engine Type, Gyro, Structure, and Cockpit are shown in compact rows
- **AND** each row shows label, dropdown, weight, and critical slots
- **AND** Engine Rating is displayed as derived info below the component list

#### Scenario: Movement panel with Base/Final columns

- **WHEN** Movement panel renders
- **THEN** Walk MP shows input with +/- buttons under Base column
- **AND** Walk MP Final column shows same value
- **AND** Run MP shows calculated value (ceil of 1.5 × Walk MP)
- **AND** Jump/UMU MP shows placeholder input (disabled until equipment system)
- **AND** Jump Type shows dropdown (disabled until equipment system)
- **AND** Mech. J. Booster MP shows placeholder

#### Scenario: Walk MP drives engine rating

- **WHEN** user changes Walk MP value
- **THEN** engine rating is calculated as tonnage × walkMP
- **AND** engine rating is updated in the store
- **AND** engine weight and gyro weight recalculate accordingly

#### Scenario: Walk MP range validation

- **WHEN** Walk MP input renders
- **THEN** minimum Walk MP ensures engine rating >= 10
- **AND** maximum Walk MP ensures engine rating <= 500
- **AND** +/- buttons are disabled at range boundaries
