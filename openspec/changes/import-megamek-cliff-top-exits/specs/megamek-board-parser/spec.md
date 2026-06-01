# Spec Delta: MegaMek Board Parser

## MODIFIED Requirements

### Requirement: Terrain String Parsing

The parser SHALL parse semicolon-delimited terrain feature strings and extract
terrain type, level, and supported source metadata.

#### Scenario: Parse cliff-top exit metadata

- **GIVEN** a board hex terrain string contains `cliff_top:1:<exitMask>`
- **WHEN** the parser reads the board
- **THEN** the parser SHALL convert each active bit in `<exitMask>` into a
  `cliffTopExits` facing direction on that hex's terrain-feature metadata
- **AND** each active exit SHALL use MegaMek's `1 << direction` encoding for
  directions `0..5`.

#### Scenario: Correct imported cliff exits against board elevations

- **GIVEN** a board hex has imported `cliff_top` exits
- **WHEN** an exit points off board or toward a neighbor that is not exactly 1
  or 2 elevation levels lower
- **THEN** the parser SHALL omit that exit from `cliffTopExits`
- **AND** the parser SHALL NOT create cliff metadata when no imported exits
  remain valid.
