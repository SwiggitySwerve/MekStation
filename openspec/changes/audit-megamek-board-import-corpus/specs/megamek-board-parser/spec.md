# Spec Delta: MegaMek Board Parser

## ADDED Requirements

### Requirement: Local MegaMek Board Corpus Audit

MekStation SHALL provide a developer-run audit command that parses selected
MegaMek `.board` files with the MekStation board parser and reports import
coverage.

#### Scenario: Audit parses a local MegaMek board corpus

- **GIVEN** a developer has a local MegaMek checkout with `data/boards`
- **WHEN** the developer runs the MegaMek board import audit command
- **THEN** the command SHALL recursively scan `.board` files
- **AND** parse each selected file with `parseMegaMekBoard`
- **AND** report parsed board count and parsed hex count.

#### Scenario: Audit reports terrain metadata coverage

- **GIVEN** selected MegaMek board files contain large board-coordinate labels
  or `cliff_top` terrain metadata
- **WHEN** the audit completes
- **THEN** the command SHALL report how many selected boards and hex rows used
  large-coordinate labels
- **AND** how many selected boards and hex rows contained `cliff_top` metadata.

#### Scenario: Audit fails on parser regressions

- **GIVEN** a selected MegaMek board cannot be parsed by MekStation
- **WHEN** the audit reaches that board
- **THEN** the command SHALL include the file and parser error in its failure
  report
- **AND** exit non-zero.

#### Scenario: Audit fails on skipped hex rows

- **GIVEN** a selected MegaMek board contains `hex` rows
- **WHEN** parsing succeeds but the parsed hex count differs from the number of
  `hex` rows in the source file
- **THEN** the command SHALL report the mismatch
- **AND** exit non-zero.

#### Scenario: Audit remains optional outside local oracle environments

- **GIVEN** CI or a developer machine does not have a local MegaMek checkout
- **WHEN** normal unit tests, typecheck, lint, format, and build commands run
- **THEN** they SHALL NOT require the corpus audit command.

## MODIFIED Requirements

### Requirement: Hex Coordinate Parsing

The parser SHALL preserve existing explicit-coordinate parsing for unambiguous
MegaMek board labels, and SHALL use MegaMek row order to disambiguate labels
that can be split into multiple valid column/row pairs.

#### Scenario: Disambiguate ambiguous large-board labels by row order

- **GIVEN** a `.board` file declares `size 170 120`
- **AND** the 101st `hex` row uses board label `10101`
- **WHEN** parsing the coordinate
- **THEN** the parser SHALL choose column `101`, row `1` from MegaMek row order
  rather than column `10`, row `101`.
