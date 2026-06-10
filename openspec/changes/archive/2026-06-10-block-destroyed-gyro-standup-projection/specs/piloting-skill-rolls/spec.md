# Spec Delta: Piloting Skill Rolls

## MODIFIED Requirements

### Requirement: PSR Trigger — Standing Up

The system SHALL trigger or project the stand-up PSR outcome required by the
represented stand-up rules. If the stand-up target is impossible, the PSR SHALL
resolve as an automatic failure instead of rolling dice.

#### Scenario: Destroyed gyro stand-up is automatic failure

- **GIVEN** a prone Mek has a represented standard destroyed gyro
- **WHEN** the stand-up attempt is committed
- **THEN** the stand-up PSR SHALL resolve with an impossible target
- **AND** the roll SHALL be recorded as 0 without invoking the dice roller
- **AND** the reason SHALL be `Cannot stand with a destroyed gyro`
- **AND** the unit SHALL remain prone
