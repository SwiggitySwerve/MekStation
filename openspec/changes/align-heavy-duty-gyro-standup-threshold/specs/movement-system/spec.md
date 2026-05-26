# Spec Delta: Movement System

## MODIFIED Requirements

### Requirement: Prone/Standing-Up Movement Costs

Standing up from prone SHALL cost the represented stand-up MP and require a
successful PSR unless represented unit rules make the stand-up automatic or
impossible.

#### Scenario: Two-hit heavy-duty gyro stand-up remains rollable

- **GIVEN** a prone Mek has a represented heavy-duty gyro with two gyro hits
- **WHEN** movement projection or committed movement evaluates a ground
  stand-up attempt
- **THEN** the destination SHALL remain reachable when the path is otherwise
  legal and within budget
- **AND** the projection SHALL expose a finite stand-up PSR target
- **AND** the projection SHALL include the represented heavy-duty gyro damage
  modifier
- **AND** committed movement SHALL resolve the same finite stand-up PSR instead
  of treating the gyro as destroyed

#### Scenario: Three-hit heavy-duty gyro stand-up is impossible

- **GIVEN** a prone Mek has a represented heavy-duty gyro with three gyro hits
- **WHEN** movement projection or committed movement evaluates a ground
  stand-up attempt
- **THEN** the destination SHALL be marked unreachable before commit
- **AND** the projection SHALL expose `Cannot stand with a destroyed gyro`
- **AND** committed movement SHALL keep the unit at its origin and prone
- **AND** committed movement SHALL NOT emit `UnitStood`
