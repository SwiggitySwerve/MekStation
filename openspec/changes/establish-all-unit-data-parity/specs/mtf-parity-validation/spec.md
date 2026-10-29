## ADDED Requirements

### Requirement: Complete source accounting

Parity reports SHALL account for every pinned source definition and archive member, including MTF, BLK and BFS, with separate discovery, upstream-load, local-load, validation and comparison outcomes. They SHALL distinguish raw file, unique-design and successfully compared counts and expose all unsupported rows.

#### Scenario: A family has no executed comparisons

- **GIVEN** inventoried sources for a family and zero local reference comparisons
- **WHEN** the parity report is evaluated
- **THEN** family readiness SHALL fail
- **AND** deferred/skipped checks SHALL NOT count as passing comparisons

### Requirement: Reproducible loaded-entity references

References SHALL come from a demonstrably compatible pinned MegaMek/MegaMekLab runtime with recorded artifacts, source hashes, concrete entity identity, verifier/BV outputs and calculation settings. Parser failures, unresolved equipment, invalid construction and inapplicable metrics SHALL be separate.

#### Scenario: Reject stale or differently configured references

- **GIVEN** mismatched source hashes, runtime provenance or crew/network/override settings
- **WHEN** comparison is requested
- **THEN** the report SHALL reject the comparison with the mismatched fields

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
