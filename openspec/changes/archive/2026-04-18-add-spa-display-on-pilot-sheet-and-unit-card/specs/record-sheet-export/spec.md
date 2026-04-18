# record-sheet-export Specification Delta

## ADDED Requirements

### Requirement: Record Sheet Includes Special Abilities Block

The record sheet export pipeline SHALL include a Special Abilities block
on the printed record sheet when the assigned pilot owns one or more
SPAs.

#### Scenario: Pilot with abilities gets a Special Abilities block

- **GIVEN** a record sheet is generated for a unit whose assigned pilot
  owns `weapon_specialist` with designation "Medium Laser" and
  `iron_man`
- **WHEN** `RecordSheetService` renders the SVG template
- **THEN** a block titled "Special Abilities" SHALL appear below the
  pilot block
- **AND** the block SHALL contain at least two lines — one per owned
  SPA
- **AND** each line SHALL include the displayName and the designation
  in parentheses when present (e.g. "Weapon Specialist (Medium Laser)")
- **AND** each line SHALL include a one-line truncated description from
  the catalog

#### Scenario: Pilot with zero abilities omits the block

- **GIVEN** a record sheet is generated for a unit whose assigned pilot
  has an empty `abilities` array
- **WHEN** `RecordSheetService` renders the SVG template
- **THEN** no Special Abilities block SHALL be emitted
- **AND** the record sheet SHALL NOT reserve vertical space for an
  empty block

#### Scenario: Block never overflows the record sheet

- **GIVEN** a pilot that owns the maximum plausible number of SPAs
  (e.g. 8 abilities on a veteran pilot)
- **WHEN** the record sheet renders
- **THEN** the Special Abilities block SHALL wrap or truncate so that
  no content is drawn past the record sheet's bottom border

### Requirement: Data Extractor for Abilities

The record-sheet data extraction layer SHALL expose an `extractAbilities`
helper that resolves pilot ability ids to canonical definitions via the
SPA catalog.

#### Scenario: Extractor resolves known ids

- **GIVEN** a pilot whose `abilities` array contains two canonical SPA
  ids and one legacy-alias id
- **WHEN** `extractAbilities(unit)` is called
- **THEN** the helper SHALL return three resolved entries, each a
  `{ spa: ISPADefinition, designation?: ISPADesignation }` tuple
- **AND** entries SHALL be grouped by category in the returned list

#### Scenario: Extractor skips unknown ids

- **GIVEN** a pilot whose `abilities` array includes one id unknown to
  the catalog
- **WHEN** `extractAbilities(unit)` is called
- **THEN** the unknown id SHALL be omitted from the returned list
- **AND** no error SHALL be thrown
