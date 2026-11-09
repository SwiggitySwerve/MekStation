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

#### Scenario: Aerospace Velocity uses the working movement form

- **GIVEN** an editable aerospace fighter or small craft
- **WHEN** its existing Velocity tab opens
- **THEN** it SHALL expose the same engine, safe thrust and fuel controls as Structure rather than a placeholder
- **AND** maximum thrust, engine rating and fuel points SHALL display the stored domain results after edits
- **AND** read-only mode SHALL disable every mutation control

#### Scenario: Family shell waits for the equipment catalog

- **GIVEN** an identified unit with pending equipment data
- **WHEN** its mech, vehicle, aerospace, battle armor, infantry, ProtoMech or capital shell renders
- **THEN** it SHALL show a family-labelled skeleton with its existing location representation and no interactive diagram controls
- **AND** capital loading content SHALL remain read-only
- **AND** catalog failure SHALL expose an error and retry action, and successful initialization SHALL replace the skeleton with the selected shell

#### Scenario: Small craft location display

- **GIVEN** an aerodyne or spheroid small craft
- **WHEN** its loading or ready armor diagram renders
- **THEN** it SHALL identify Nose, Left Side, Right Side and Aft with the craft's shape rather than fighter wings
- **AND** display labels SHALL preserve the existing stored arc identities and armor values

#### Scenario: Edit and reopen small-craft Side armor

- **GIVEN** an editable aerodyne or spheroid small craft with a ready catalog
- **WHEN** the user edits either Side through the Armor tab or location diagram
- **THEN** the location SHALL remain editable without a fighter Wing cap or an independent Side cap
- **AND** armor weight, available points and total diagnostics SHALL consume the aerospace construction owner
- **AND** saving and reopening SHALL retain Side allocation and native armor identity at narrow and wide widths

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

#### Scenario: Preserve a split weapon allocation through editor persistence

- **GIVEN** a BattleMech with one weapon allocated across adjacent locations
- **WHEN** the editor store organizes, unassigns or replaces that allocation
- **THEN** it SHALL update every portion as one mount and preserve fixed OmniMech equipment
- **AND** saving and reopening SHALL retain both portions in their assigned critical slots without duplicating the weapon
- **AND** proposed split allocations SHALL follow pinned MegaMekLab eligibility, adjacency and configuration restrictions

#### Scenario: Preserve every native mech cockpit identity

- **GIVEN** any of the nineteen mech cockpit identities at pinned MegaMek
- **WHEN** it is loaded, selected, saved and reopened
- **THEN** its native identity, cockpit mass and fixed head or torso system positions SHALL be preserved
- **AND** manual and automatic fill, compact and sort SHALL use that selected cockpit layout
- **AND** loaded armor weight SHALL count every active configuration location, including a Tripod center leg, and retain that weight on save/reopen
- **AND** Standard-tagged Tripods SHALL NOT acquire a different cockpit merely from their configuration
- **AND** catalog regeneration SHALL remain separate from recognizing an existing source tag
