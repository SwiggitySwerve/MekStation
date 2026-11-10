## ADDED Requirements

### Requirement: Complete source accounting

Parity reports SHALL account for every pinned source definition and archive member, including MTF, BLK and BFS, with separate discovery, upstream-load, local-load, validation and comparison outcomes. They SHALL distinguish raw file, unique-design and successfully compared counts and expose all unsupported rows.

#### Scenario: A family has no executed comparisons

- **GIVEN** inventoried sources for a family and zero local reference comparisons
- **WHEN** the parity report is evaluated
- **THEN** family readiness SHALL fail
- **AND** deferred/skipped checks SHALL NOT count as passing comparisons

#### Scenario: Compare vehicle validity through the public source handler

- **GIVEN** actual pinned source bytes and opt-in source validity comparison
- **WHEN** the initialized public registry selects a handler
- **THEN** its public category SHALL determine whether vehicle validation is in scope, including exclusion of aerospace-routed FixedWingSupport regardless of source folder
- **AND** successful parsing with invalid construction SHALL retain the validator's invalid result and diagnostics separately from parser, handler and validator failures
- **AND** unsupported or out-of-scope inputs SHALL remain explicit without a fabricated vehicle validity result
- **AND** default and opt-in BV numerical reports SHALL remain byte-identical

### Requirement: Reproducible loaded-entity references

References SHALL come from a demonstrably compatible pinned MegaMek/MegaMekLab runtime with recorded artifacts, source hashes, concrete entity identity, verifier/BV outputs and calculation settings. Parser failures, unresolved equipment, invalid construction and inapplicable metrics SHALL be separate.

#### Scenario: Reject stale or differently configured references

- **GIVEN** mismatched source hashes, runtime provenance or crew/network/override settings
- **WHEN** comparison is requested with blocking reference-trust enforcement
- **THEN** the report SHALL reject the comparison with the mismatched fields

#### Scenario: Require independent expected reference settings

- **GIVEN** an approved expected runtime/settings policy and separate actual provenance bound to the reference bytes
- **WHEN** the serial or family pipeline requests comparison
- **THEN** it SHALL compare runtime artifact identities, declared crew/network/BV overrides, every reference BV mode and per-source verifier settings before numerical work
- **AND** the evidence report SHALL identify each differing or missing field with expected and actual values
- **AND** absent or malformed policy, actual provenance or row settings SHALL remain violations rather than learning expectations from the supplied reference
- **AND** conversion provenance or exact BV SHALL NOT substitute for reference runtime/settings evidence

#### Scenario: Audit trust before full-corpus policy adoption

- **GIVEN** the default report-only reference-trust mode and at least one trust violation
- **WHEN** BV comparison runs before an approved policy covers all 9,815 units
- **THEN** it SHALL record and print the violations without changing the BV or CI result
- **AND** a single explicit reference-trust mode toggle to blocking SHALL reject those violations before numerical work
- **AND** a successful BV exit SHALL NOT establish zero trust violations or policy acceptance
- **AND** source-hash, conversion-provenance and numerical failures SHALL remain enforced in both modes

#### Scenario: Report upstream limitations

- **GIVEN** an upstream parser failure or a genuinely inapplicable metric
- **WHEN** references are extracted
- **THEN** the source row and upstream diagnostic or reason SHALL remain in the report
- **AND** the row SHALL NOT count as a successful numerical comparison

### Requirement: All-family semantic round trips

Every supported source family SHALL preserve its domain facts through import, serialization, persistence and reload. Existing MTF text round-trip checks SHALL remain in place alongside semantic comparisons.

#### Scenario: Reload a custom non-mech design

- **GIVEN** a loaded design with subtype, locations and qualified equipment mounts
- **WHEN** a custom copy is serialized, saved and reloaded
- **THEN** all unchanged domain facts SHALL compare exactly
- **AND** edited facts SHALL reflect the saved edits without canonical substitution

#### Scenario: Preserve a declared XL gyro during MTF import

- **GIVEN** an MTF source declaring an XL gyro
- **WHEN** it is parsed, saved through the unit API and reloaded
- **THEN** the shared MTF component vocabulary SHALL preserve the declared XL identity in the existing serialized gyro field
- **AND** the editor SHALL calculate with that identity when recovering source equipment mass

#### Scenario: Preserve declared MTF components through import

- **GIVEN** an MTF source declaring any pinned gyro, cockpit or heat sink name, or rules level 1 to 5
- **WHEN** it is parsed by the app importer and by the Python converter
- **THEN** both SHALL read one shared vocabulary file and resolve the same serialized identity, including Compact and Heavy Duty gyros, IS and Clan Double, Laser and Compact heat sinks, and rules level 5 as Unofficial
- **AND** a name outside the vocabulary SHALL produce an explicit unsupported diagnostic, never a Standard or Single default
- **AND** the identity SHALL equal the committed catalog's for the same source bytes

#### Scenario: Preserve slot-only weapons through MTF import and save

- **GIVEN** native MTF critical entries for complete physical or ranged weapon mounts absent from the weapon summary
- **WHEN** the TypeScript parser imports the source or the app reloads a legacy definition
- **THEN** the shared mounting owner SHALL recover each native mount once with its identity, mass, locations and critical positions
- **AND** summary aliases and repeated mounts SHALL retain their multiplicity without treating ammunition as a weapon
- **AND** variable physical sizing, spreadable Talons anchoring and split eligibility SHALL use their existing domain owners and pinned native traversal
- **AND** API persistence and custom serialization SHALL preserve recovered mounts, rear and Omni flags on reload
- **AND** unknown or incomplete critical groups SHALL remain available in the source grid with incomplete recognized mounts reported diagnostically
