# Spec Delta: MegaMek Board Parser

## MODIFIED Requirements

### Requirement: Hex Coordinate Parsing

The parser SHALL parse MegaMek board labels whose 1-indexed column and row
components are each at least two digits after sub-10 zero padding, and SHALL
convert the parsed offset coordinate to MekStation axial coordinates.

#### Scenario: Parse large-board coordinate with three-digit column

- **GIVEN** a `.board` file declares `size 170 120`
- **AND** a hex line uses board label `10412`
- **WHEN** parsing the coordinate
- **THEN** the parser SHALL interpret the label as column `104`, row `12`
- **AND** convert it to axial coordinate `q=103`, `r=-40`.

#### Scenario: Parse large-board coordinate with three-digit row

- **GIVEN** a `.board` file declares `size 170 120`
- **AND** a hex line uses board label `104120`
- **WHEN** parsing the coordinate
- **THEN** the parser SHALL interpret the label as column `104`, row `120`
- **AND** convert it to axial coordinate `q=103`, `r=68`.

#### Scenario: Reject label outside declared board dimensions

- **GIVEN** a `.board` file declares `size 2 2`
- **AND** a hex line uses board label `9917`
- **WHEN** parsing the coordinate
- **THEN** the parser SHALL throw error `Invalid hex coordinate`.

#### Scenario: Preserve large-board terrain metadata import

- **GIVEN** a `.board` file declares `size 170 120`
- **AND** a large-board hex label contains `cliff_top:1:<exitMask>`
- **WHEN** the parser reads the board
- **THEN** the parsed hex SHALL preserve valid `cliffTopExits` metadata on the
  correct axial coordinate.
