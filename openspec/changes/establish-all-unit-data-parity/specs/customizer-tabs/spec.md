## ADDED Requirements

### Requirement: Data-ready subtype editors

After the data-readiness contract is satisfied, each source subtype SHALL open the correct forms, loading skeleton, location diagram and equipment placement surface within the existing customizer. Fields and available choices SHALL correspond to its MegaMekLab construction family. Components SHALL consume domain results rather than compute construction or BV rules.

#### Scenario: Open small craft or support aircraft

- **GIVEN** a data-ready SmallCraft or FixedWingSupport design
- **WHEN** it opens in the customizer
- **THEN** its top-level type, subtype, fields, locations and rules SHALL agree
- **AND** it SHALL NOT fall back to a mech or unrelated fighter form

#### Scenario: Loading and unsupported states

- **GIVEN** pending equipment data or an unsupported source subtype
- **WHEN** the customizer renders
- **THEN** it SHALL expose the loading or unsupported state clearly
- **AND** it SHALL NOT display placeholder calculations as final rules results

### Requirement: Subtype workflow acceptance

Each subtype SHALL support a real source-load, edit, save, reopen and print flow with identical domain figures across forms, status displays and the selected record sheet. Acceptance SHALL verify structural and behavioral fidelity to the pinned MegaMekLab editor, narrow/wide layouts and keyboard use; numerical tolerance SHALL NOT be used as a visual-similarity measure.

#### Scenario: Edit and print distinct locations

- **GIVEN** a design with rotor/turret identities or asymmetric craft arcs
- **WHEN** armor/equipment is edited, saved, reopened and printed
- **THEN** each location SHALL retain its identity and the saved values
- **AND** sheet, form, validation and BV SHALL consume the same domain facts

#### Scenario: Use the form at narrow width

- **GIVEN** a populated subtype form with long names and validation errors
- **WHEN** the viewport narrows or the user navigates with a keyboard
- **THEN** required controls, labels and errors SHALL remain reachable and readable
