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

### Requirement: Native single-pilot biped SPA placement and fitting

Single-pilot biped Mech canonical output SHALL place its explicitly supplied,
owner-formatted SPA headlines in the existing `spas0` rectangle's parent, using
that rectangle's coordinates and the pinned MML 62bf193 fitting algorithm. This
native list SHALL use `Abilities: ` plus comma-separated formatted headlines,
preserving designations. It SHALL replace the fixed-coordinate legacy block
only for this configuration, without changing the extracted SPA entries.

#### Scenario: Designated abilities on Letter and A4

- **GIVEN** a single-pilot biped and explicitly supplied Weapon Specialist (PPC)
- **WHEN** its canonical Letter or A4 SVG and PDF are generated
- **THEN** the list appears beside the native `spas0` rectangle in its transformed parent
- **AND** fitting starts at medium font size 6.76 times 0.9, switches once to rectangle height divided by 2.4 when normal text width exceeds the rectangle width, and wraps with italic metrics and line height font size times 1.2
- **AND** non-SPA sheet figures remain unchanged

#### Scenario: Native long-list and unbroken-token overflow

- **GIVEN** a long supported SPA list or an overwide unbroken designation
- **WHEN** the native list is rendered
- **THEN** the MML space-delimiter wrapping algorithm retains all formatted headlines and delimiter spaces, with no clipping, truncation, line cap or additional shrink
- **AND** vertical or horizontal overflow SHALL remain visible as native behavior, without a containment claim

#### Scenario: Empty abilities or missing native region

- **GIVEN** no resolved abilities or no native `spas0` rectangle
- **WHEN** the biped is rendered
- **THEN** no native SPA list or fixed-coordinate substitute is emitted

#### Scenario: Other configurations and families retain their routes

- **GIVEN** another Mech configuration or a non-Mech sheet
- **WHEN** it is rendered
- **THEN** this biped-only correction does not change its SPA output, canonical omissions, fallback renderer or infantry notes route

### Requirement: Native single-pilot quad SPA placement

Single-pilot quad Mech canonical output SHALL use the same native SPA fitting
owner as biped output, with its own template's existing `spas0` rectangle and
parent transform. It SHALL preserve the existing resolver's formatted headlines
and designations without changing the extracted entries or other sheet figures.

#### Scenario: Quad designated ability on Letter and A4

- **GIVEN** a single-pilot quad Mech and supplied Weapon Specialist (PPC)
- **WHEN** its canonical Letter or A4 SVG and PDF are generated
- **THEN** `Abilities: Weapon Specialist (PPC)` starts in the quad template's existing `spas0` region
- **AND** the common pinned MML 62bf193 font selection, float dimensions and space-delimiter wrapping apply unchanged
- **AND** all non-SPA output retains the same domain-provided figures

#### Scenario: Native quad overflow and empty input

- **GIVEN** a long supported SPA list, an overwide unbroken designation, or empty abilities
- **WHEN** the quad sheet is rendered
- **THEN** nonempty lists preserve native vertical or horizontal overflow without clipping, truncation, line caps or additional shrink
- **AND** empty abilities or a missing `spas0` rectangle emit no substitute block

#### Scenario: Existing configurations and native omissions

- **GIVEN** a biped or another configuration/family
- **WHEN** the record sheet is rendered
- **THEN** existing biped output remains unchanged, while LAM, tripod, QuadVee, non-Mech canonical omissions, fallback output and infantry notes retain their previous routes

### Requirement: Native single-pilot LAM SPA placement

Single-pilot LAM canonical output SHALL use the existing native Mech SPA fitting
owner in its own template's `spas0` rectangle and transformed parent. It SHALL
retain the owner's formatted headlines/designations and pinned MML 62bf193 font
selection, float dimensions and unbounded space-delimiter wrapping.

#### Scenario: LAM native geometry on Letter and A4

- **GIVEN** a single-pilot LAM and supplied Weapon Specialist (PPC)
- **WHEN** canonical Letter or A4 SVG and PDF are generated
- **THEN** the list starts at the LAM template's own `spas0` y76 region, rather than biped/quad y52 or the legacy fixed coordinates
- **AND** first baseline and parent transform come from that actual rectangle
- **AND** non-SPA sheet figures remain unchanged

#### Scenario: Native LAM overflow and empty abilities

- **GIVEN** a long supported SPA list, overwide unbroken designation or empty input
- **WHEN** the LAM sheet is rendered
- **THEN** native vertical/horizontal overflow remains visible without clipping, truncation, line caps or additional shrink
- **AND** empty abilities or a missing native rectangle emit no substitute block

#### Scenario: Required multi-crew gap remains carried

- **GIVEN** biped/quad output, another family, or a tripod/QuadVee payload without genuine crew-slot identity
- **WHEN** the sheet is rendered
- **THEN** this LAM-only correction preserves existing biped/quad output and other routes
- **AND** tripod/QuadVee support remains a required deferred gap until Q-PILOT supplies the pinned crew-slot contract; the one-pilot payload does not establish that identity

### Requirement: Explicit native multi-crew print identity

Mech print extraction SHALL retain an explicitly supplied complete native crew roster: TRIPOD has indexed Pilot/Gunner slots, SUPERHEAVY_TRIPOD adds Tech Officer, and QUADVEE has Pilot/Gunner slots. The runtime schema SHALL reject count, order, index or role mismatches. Unassigned pilots SHALL remain absent, and existing top-level SPAs SHALL remain crew-global rather than copied to slots. Individual slots SHALL NOT carry Edge or SPA option values.

#### Scenario: Explicit native roster survives extraction

- **GIVEN** an explicit native crew type, indexed roles and distinct or identically named pilot records
- **WHEN** public sheet extraction and runtime validation run
- **THEN** each slot retains its own supplied pilot values and unassigned slots remain unassigned
- **AND** all other extracted figures remain unchanged

#### Scenario: Invalid or absent assignments

- **GIVEN** an incomplete, reordered, duplicated, out-of-range or mislabelled roster
- **WHEN** extraction or runtime validation runs
- **THEN** the boundary rejects it rather than assigning people or roles
- **GIVEN** no crew roster
- **WHEN** a legacy caller extracts any Mech configuration
- **THEN** no roster is inferred from configuration or tonnage
- **AND** multi-slot rendering, editor authoring and persistence remain required follow-up work under rows 4.1/4.3

### Requirement: Explicit native tripod crew rendering

Canonical ordinary and superheavy tripod sheets SHALL render the supplied
validated crew roster in native indexed name/skill fields and select the native
two-/three-seat panel on Letter and A4. Rendering SHALL consume native role
identities without deriving assignments, crew type or per-seat pilot options.

#### Scenario: Indexed identities and unassigned seats

- **GIVEN** an explicit ordinary or superheavy tripod roster with repeated names, unequal skills or an unassigned seat
- **WHEN** canonical SVG and PDF are exported
- **THEN** assigned names and skills retain their slot identity and native role-label offsets
- **AND** unassigned names/skills remain blank, unused fields stay hidden and the matching native crew frame is visible

#### Scenario: Shared native SPA rectangle and repeated overdraw

- **GIVEN** supplied crew-global abilities on an explicit tripod roster
- **WHEN** the sheet is rendered
- **THEN** the same list is emitted once per native crew slot at spas1 for two seats or spas2 for three seats
- **AND** each paper uses its actual native rectangle/parent with existing pinned MML fitting and unbounded overflow
- **AND** no per-seat option list is created or global Edge rendered as a per-seat option

#### Scenario: Rendered location acceptance and preserved routes

- **GIVEN** missing/swapped rendered crew fields or a legacy/no-crew or other-configuration payload
- **WHEN** the focused rendering acceptance is executed
- **THEN** missing/swapped fields fail the identity assertions
- **AND** legacy/no-crew, single-pilot biped/quad/LAM and other-family output remain unchanged
- **AND** QuadVee rendering, roster authoring and persistence remain required separate work

### Requirement: Explicit native QuadVee crew rendering

Canonical QuadVee sheets SHALL render an explicit QUADVEE roster through the
existing native Mech crew owner on Letter and A4, using native Pilot and Gunner
labels and the supplied indexed names/skills. Unassigned seats SHALL stay blank;
rendering SHALL not infer assignments, add a third seat or distribute global options.

#### Scenario: Native two-seat geometry and identity

- **GIVEN** an explicit QuadVee roster with repeated names, unequal skills or an unassigned seat
- **WHEN** canonical SVG and PDF are exported on either paper
- **THEN** the two native seats retain their identities, measured role offsets and matching field/frame visibility
- **AND** missing/swapped rendered fields fail the focused identity acceptance

#### Scenario: Shared QuadVee SPA overdraw and overflow

- **GIVEN** supplied crew-global abilities and an explicit QUADVEE roster
- **WHEN** the sheet is rendered
- **THEN** the same list is emitted twice at the template's native spas1 rectangle and parent
- **AND** native fitting, unbounded overflow and blank-seat behavior remain unchanged
- **AND** no per-seat Edge or ability list is created

#### Scenario: Existing rendering controls remain unchanged

- **GIVEN** ordinary/superheavy tripod or single-pilot biped/quad/LAM
- **WHEN** the sheet is exported
- **THEN** existing output remains unchanged
- **AND** a QuadVee without an explicit roster is covered by the native QuadVee sheet requirement below

### Requirement: Native QuadVee sheet selection and blank seats

A QuadVee SHALL be extracted with the `quadvee` mech type and print on the
QuadVee template, not the quad template: MegaMekLab 62bf193 `PrintMek.java:112-131`
tests the QuadVee flag before the Quad flag. A QuadVee SHALL always have the
native two-seat QUADVEE crew (MegaMek 48fcb2f64 `QuadVee.java:164-166`), so a
QuadVee without an explicit roster SHALL extract two unassigned seats
(`PrintMek.java:343-348` shows the dual-seat panel regardless of names), and
an explicit or authored roster SHALL print its named seats. The `quadvee` type
SHALL use the quad armor and structure pip groups, which the QuadVee template carries.
Quad and Biped payloads SHALL NOT have a roster inferred; a Tripod is covered by
the native Tripod requirement below.

#### Scenario: QuadVee without crew

- **GIVEN** a QuadVee payload with no roster
- **WHEN** the sheet is extracted and printed
- **THEN** it uses the `quadvee` type with Pilot and Gunner seats, both unassigned
- **AND** the four leg armor and structure pip groups are drawn as for a Quad

#### Scenario: QuadVee with authored seats

- **GIVEN** a QuadVee whose editor crew seats were assigned and saved
- **WHEN** the unit is reopened and printed
- **THEN** the named seats print on the QuadVee template

### Requirement: Native Tripod blank seats

A Tripod without an explicit roster SHALL extract its native crew with every seat
unassigned: TRIPOD (Pilot, Gunner) at 100 tons or less and SUPERHEAVY_TRIPOD
(Pilot, Gunner, Tech Officer) above 100 tons. MegaMek 48fcb2f64
`TripodMek.java:115-117` selects the crew type by `isSuperHeavy()`
(`Mek.java:7167`, weight > 100), and MegaMekLab 62bf193 `PrintMek.java:343-348`
shows the dual or triple Warrior Data panel by slot count whether or not names
are assigned. An explicit or authored roster SHALL print its named seats. The
default SHALL come from the same single rule as the QuadVee default, and Quad and
Biped payloads SHALL NOT have a roster inferred.

#### Scenario: Tripod without crew

- **GIVEN** a Tripod payload with no roster at exactly 100 tons, and at 101 tons or more
- **WHEN** the sheet is extracted and printed on Letter or A4
- **THEN** 100 tons prints the two-seat panel and above 100 tons the three-seat panel, every seat unassigned
- **AND** no template placeholder text is printed in a seat

#### Scenario: Legacy Biped-labelled tripod remains open

- **GIVEN** a mech labelled Biped that carries center-leg armor, which the editor projection treats as a tripod
- **WHEN** the sheet is printed
- **THEN** it keeps the biped sheet; whether MegaMek classifies such a unit as a Tripod is not established here and is carried as an open finding
