## ADDED Requirements

### Requirement: Aerospace max thrust ownership

The aerospace construction owner (`calculateMaxThrust`) SHALL derive max thrust
from safe thrust for BLK imports of aerospace fighters, conventional fighters,
small craft, DropShips, JumpShips, WarShips and space stations, for the default
aerospace state, for safe-thrust and engine-rating store edits and for the
new-unit template summary. Those consumers SHALL read it and SHALL NOT repeat
the formula. Status bars, record sheets and the aerospace BV adapter read the
resulting `maxThrust` and do not derive it. Two paths keep their own values
here: duplicating or reopening an aerospace store keeps the default state's
max thrust rather than deriving it, and `BlkParserService.extractAerospace`
reports twice the safe thrust (it has no production consumer). This requirement
covers where max thrust is derived; it does not change the rounding rule or
establish aerospace BV parity.

#### Scenario: Every consumer agrees with the owner

- **GIVEN** safe thrust 1, 2, 3, 5, 6, 7 and 12
- **WHEN** max thrust is derived or displayed
- **THEN** the BLK basics, the aerospace-family handlers (fighter, conventional
  fighter, small craft, DropShip, JumpShip, WarShip and space station), the
  store actions, the aerospace BV adapter and the template summary SHALL show
  the owner's result for each safe thrust
- **AND** the status bar SHALL display the stored max thrust it is given
- **AND** the default state SHALL show the owner's result for its own safe thrust
