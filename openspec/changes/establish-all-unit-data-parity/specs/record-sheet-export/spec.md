## ADDED Requirements

### Requirement: Explicit vehicle turret identities in record sheets

Vehicle record-sheet extraction SHALL use explicit `turretConfig`, defaulting to `None` when absent, without inferring installed turrets from armor keys or equipment. `Turret` SHALL identify the primary turret and `Turret 2` the secondary turret. Installed locations SHALL retain their current and maximum armor, including zero.

#### Scenario: Absent or explicit None configuration

- **GIVEN** missing or `None` turret configuration and positive or zero turret armor keys or turret-mounted equipment
- **WHEN** record-sheet data is extracted
- **THEN** the configuration is `None` and `Turret`, `Turret 2`, and `Chin` armor locations are omitted

#### Scenario: Single installed turret

- **GIVEN** `Single`, `Front`, `Rear`, or `Sponson` configuration
- **WHEN** record-sheet data is extracted
- **THEN** primary `Turret` or `Chin` armor is retained, including zero armor, and `Turret 2` is omitted
- **AND** the supported single-turret template is selected

#### Scenario: Dual identities survive extraction and schema validation

- **GIVEN** explicit `Dual` configuration and unequal armor values for `Turret` and `Turret 2`
- **WHEN** record-sheet data is extracted and schema validated
- **THEN** both distinct locations retain their values in canonical order

#### Scenario: Reactive store-to-sheet transport

- **GIVEN** vehicle state with explicit installed primary and secondary turret objects
- **WHEN** the shared reactive projection supplies preview or export data
- **THEN** the owning vehicle turret module derives the installed layout from those objects independently of armor values, including zero
- **AND** both surfaces preserve distinct `Turret` and `Turret 2` armor identities
- **AND** a legacy primary `DUAL` flag without a secondary object projects as `Single`, while an orphan secondary without an installed primary projects as `None`
- **AND** these projection normalizations do not certify the consistency or legality of the saved configuration

### Requirement: Vehicle turret template identity fidelity

Vehicle SVG bindings SHALL map primary `Turret` to the rear turret (`armorPipsTU`, `textArmor_TU`) and secondary `Turret 2` to the front turret (`armorPipsFT`, `textArmor_FT`) on the supported dual-turret template, independently of armor array order. Single-turret VTOL `Turret` or `Chin` SHALL bind to `TU`; rotor armor SHALL bind independently to `RO`. Unsupported dual-turret VTOL configurations SHALL fail extraction and template selection with a clear error.

#### Scenario: Unequal dual turrets in reversed array order

- **GIVEN** dual-turret armor with `Turret 2` before `Turret` and unequal current armor
- **WHEN** bindings are applied through the shared SVG renderer
- **THEN** the rear and front turret text anchors and pip counts match their respective identities

#### Scenario: Installed zero-armor turret

- **GIVEN** an explicit installed primary or secondary turret with zero armor
- **WHEN** the sheet is bound
- **THEN** its text anchor displays zero and no armor pips are emitted for that turret
- **AND** its installed configuration still selects the corresponding turret template

#### Scenario: VTOL primary turret or chin and independent rotor

- **GIVEN** a single-turret VTOL with primary `Turret` or `Chin` armor and rotor armor
- **WHEN** bindings are rendered
- **THEN** primary armor fills `TU` and rotor armor fills `RO` with their separate values

#### Scenario: Unsupported dual-turret VTOL

- **GIVEN** explicit `Dual` configuration and `VTOL` motion type
- **WHEN** extraction or template selection is requested
- **THEN** a clear unsupported dual-turret VTOL error is thrown instead of selecting a single-turret template

### Requirement: Supplied ProtoMech pilot abilities reach fallback SVG output

ProtoMech record-sheet extraction SHALL forward the existing SPA owner's entries for explicitly supplied pilot abilities into `specialAbilities`. The existing fallback SVG renderer SHALL display their formatted headlines, including designations. This requirement does not certify SPA visibility in canonical template or PDF output.

#### Scenario: Explicit designated pilot ability

- **GIVEN** a ProtoMech point and an explicitly supplied Weapon Specialist ability designated for PPC
- **WHEN** RecordSheetService extracts the sheet and the fallback SVG renderer renders it
- **THEN** the actual SVG contains `Weapon Specialist (PPC)`
- **AND** all other extracted sheet data remains unchanged

#### Scenario: Legacy caller without abilities

- **GIVEN** a ProtoMech caller supplying no pilot abilities or an empty list
- **WHEN** its sheet is extracted and rendered through the fallback SVG renderer
- **THEN** no SPA block is supplied and both calls produce identical SVG output
