# Spec Delta: Hull-Down Position

## ADDED Requirements

### Requirement: Standing Mek Hull-Down Entry Legality

The system SHALL treat represented standing Mek-style hull-down entry as a
movement posture action gated by Mek-style movement, sufficient entry MP, and
a non-destroyed gyro before the hull-down state is applied.

#### Scenario: Standing Mek entry sets hull-down state

- **GIVEN** a represented standing Mek-style unit is not already hull-down
- **AND** the unit has enough walk MP for the standing hull-down entry cost
- **AND** the unit does not have a destroyed gyro
- **WHEN** the unit commits the Hull Down movement action
- **THEN** the unit SHALL become hull-down
- **AND** the unit SHALL remain not prone.

#### Scenario: Blocked entry leaves posture unchanged

- **GIVEN** a represented unit is prone, already hull-down, non-Mek-style,
  lacks enough walk MP, or has a destroyed gyro
- **WHEN** the unit attempts the Hull Down movement action
- **THEN** the action SHALL be rejected with a player-facing reason
- **AND** the unit's prone and hull-down posture flags SHALL remain unchanged.
