# Spec Delta: Movement System

## MODIFIED Requirements

### Requirement: Prone/Standing-Up Movement Costs

Standing up from prone SHALL cost the represented stand-up MP and require a
successful PSR unless represented unit rules make the stand-up automatic or
impossible.

#### Scenario: Destroyed gyro makes prone stand-up impossible

- **GIVEN** a prone Mek has a represented standard destroyed gyro
- **WHEN** movement projection or committed movement evaluates a ground
  stand-up attempt
- **THEN** the destination SHALL be marked unreachable before commit
- **AND** the projection SHALL expose `Cannot stand with a destroyed gyro`
- **AND** committed movement SHALL keep the unit at its origin and prone
- **AND** committed movement SHALL NOT emit `UnitStood`
