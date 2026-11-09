## ADDED Requirements

### Requirement: Shared save-state compatibility boundary

The unit editor save-state owner SHALL represent modification, browser-draft
write results, and last-known library receipts independently. Its transitions
SHALL preserve successful library metadata through browser-write failure and
SHALL compare library-save completion against the content actually submitted.
Its initial mech integration SHALL preserve existing persisted fields,
fingerprint bytes, undo behavior, facade exports, and registry/reset seams.

#### Scenario: Literal old draft loads after fingerprint extraction

- **GIVEN** a persisted mech draft captured before the extraction with literal library and editor fingerprints and a populated role
- **WHEN** the existing registry hydrates it, the user edits and undoes an edit, and a receipt is recorded again
- **THEN** its fingerprints remain byte-identical, its original receipt remains readable, and undo returns it to clean
- **AND** clearing the registry removes the runtime store while retaining its browser draft

#### Scenario: Existing loader defaults remain characterized

- **GIVEN** a pre-extraction persisted draft omits its optional role
- **WHEN** the existing registry merges defaults during hydration
- **THEN** the role retains main's empty-string fallback and the original stored receipt remains readable
- **AND** this extraction does not change that existing loader behavior or rewrite its stored fingerprint

#### Scenario: Independent browser and library results

- **GIVEN** a unit has a confirmed library receipt
- **WHEN** a browser write fails or a library request fails
- **THEN** no unrelated successful receipt or clean state is invented
- **AND** a browser write failure retains the existing library receipt

#### Scenario: Later edits during a library save

- **GIVEN** the editor changes after a library snapshot is submitted
- **WHEN** that submitted snapshot is confirmed saved
- **THEN** the receipt describes the submitted content and the current editor remains modified

#### Scenario: Optional field is absent in an older draft

- **GIVEN** a new optional field is absent or undefined in an older draft
- **WHEN** the field joins the canonical fingerprint projection
- **THEN** its absence does not change the existing fingerprint bytes
- **AND** temporary equipment-ID regeneration preserves draft and library fingerprints while exact edit identity remains distinct
