# Spec Delta: Piloting Skill Rolls

## MODIFIED Requirements

### Requirement: PSR Trigger — Standing Up

The system SHALL trigger or project the stand-up PSR outcome required by the
represented stand-up rules. If the stand-up target is impossible, the PSR SHALL
resolve as an automatic failure instead of rolling dice.

#### Scenario: Playtest3 heavy-duty gyro stand-up uses hit-count modifier

- **GIVEN** `playtest_3` is enabled
- **AND** a prone Mek has a represented heavy-duty gyro
- **WHEN** the stand-up attempt is projected or committed
- **THEN** one, two, and three represented heavy-duty gyro hits SHALL contribute
  +1, +2, and +3 respectively to the stand-up PSR modifier
- **AND** three heavy-duty gyro hits SHALL still use a finite stand-up target
  under Playtest3.

#### Scenario: Playtest3 heavy-duty gyro destroyed threshold remains automatic failure

- **GIVEN** `playtest_3` is enabled
- **AND** a prone Mek has a represented heavy-duty gyro with four gyro hits
- **WHEN** the stand-up attempt is committed
- **THEN** the stand-up PSR SHALL resolve with an impossible target
- **AND** the roll SHALL be recorded as 0 without invoking the dice roller
- **AND** the reason SHALL be `Cannot stand with a destroyed gyro`
- **AND** the unit SHALL remain prone

#### Scenario: Heavy-duty gyro two-hit stand-up uses represented modifier

- **GIVEN** a prone Mek has a represented heavy-duty gyro with two gyro hits
- **WHEN** the stand-up attempt is projected or committed
- **THEN** the stand-up PSR SHALL use a finite target number
- **AND** the target modifiers SHALL include the represented heavy-duty gyro
  damage modifier
- **AND** a successful dice result SHALL stand the unit instead of resolving as
  an automatic failure

#### Scenario: Heavy-duty gyro destroyed threshold remains automatic failure

- **GIVEN** a prone Mek has a represented heavy-duty gyro with three gyro hits
- **WHEN** the stand-up attempt is committed
- **THEN** the stand-up PSR SHALL resolve with an impossible target
- **AND** the roll SHALL be recorded as 0 without invoking the dice roller
- **AND** the reason SHALL be `Cannot stand with a destroyed gyro`
- **AND** the unit SHALL remain prone
