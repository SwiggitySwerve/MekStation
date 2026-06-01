# Spec Delta: Piloting Skill Rolls

## MODIFIED Requirements

### Requirement: PSR Trigger - Standing Up

The system SHALL trigger or project the stand-up PSR outcome required by the
represented stand-up rules. If the stand-up target is impossible, the PSR SHALL
resolve as an automatic failure instead of rolling dice.

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
