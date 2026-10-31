## ADDED Requirements

### Requirement: Aerospace max thrust ownership

The aerospace construction owner (`calculateMaxThrust`) SHALL derive max thrust
from safe thrust for BLK imports of aerospace fighters, conventional fighters,
small craft, DropShips, JumpShips, WarShips and space stations, for the default
aerospace state, for safe-thrust and engine-rating store edits and for the
new-unit template summary. Those consumers SHALL read it and SHALL NOT repeat
the formula. Status bars, record sheets and the aerospace BV adapter read the
resulting `maxThrust` and do not derive it. This requirement covers where
max thrust is derived; it does not change the rounding rule or establish
aerospace BV parity.

#### Scenario: Every consumer agrees with the owner

- **GIVEN** safe thrust 1, 2, 3, 5, 6, 7 and 12
- **WHEN** max thrust is derived or displayed
- **THEN** the BLK basics, the five aerospace-family handlers, the store
  actions, the status bar, the aerospace BV adapter and the template summary
  SHALL show the owner's result for each safe thrust
- **AND** the default state SHALL show the owner's result for its own safe thrust
