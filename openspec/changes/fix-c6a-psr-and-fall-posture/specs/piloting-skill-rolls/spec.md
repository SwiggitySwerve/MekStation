## ADDED Requirements

### Requirement: Single Phase Damage PSR Producer

The interactive phase-close pass SHALL be the sole producer of the 20+
damage PSR for each eligible unit in that phase. Inline weapon damage
resolution SHALL NOT also queue that trigger. Separate qualifying weapon
and physical phases SHALL retain separate PSRs. The existing runner
threshold deduplication SHALL remain unchanged.

#### Scenario: Weapon damage crosses the threshold

- **GIVEN** real weapon damage raises a unit's phase total from 15 to 20
- **WHEN** the weapon phase damage-PSR pass runs
- **THEN** exactly one damage-threshold PSR SHALL be queued for that unit
- **AND** resolving that queue SHALL roll that PSR exactly once

#### Scenario: Independent phases and controls

- **GIVEN** a unit takes at least 20 damage in each attack phase
- **WHEN** each phase closes
- **THEN** each phase SHALL queue its own damage-threshold PSR
- **AND** units below 20 damage and unrelated PSRs SHALL remain unchanged

### Requirement: Falls Clear Hull-Down Posture

The reducer and runner SHALL set prone to true and hull-down to false on
a fall, including a runner DFA miss. Facing, damage, pilot consequences,
and pending-PSR handling SHALL retain their existing behavior. Per-turn
movement resets SHALL preserve persistent posture and stuck state.

#### Scenario: A hull-down unit falls

- **GIVEN** a unit is hull-down
- **WHEN** a UnitFell event, runner PSR fall, or runner DFA miss is applied
- **THEN** the resulting unit SHALL be prone and SHALL NOT be hull-down
- **AND** unrelated units SHALL remain unchanged
