# Spec Delta: Movement System

## ADDED Requirements

### Requirement: Movement Declaration Captures Hull-Down Entry Attempts

The movement event model SHALL capture same-hex standing `HULL_DOWN` posture
attempts as replay-safe movement declarations.

#### Scenario: Hull-down entry declaration carries posture metadata

- **GIVEN** a standing Mek-style unit commits the hull-down posture action
- **WHEN** the movement event is serialized
- **THEN** the `MovementDeclared` payload SHALL include
  `hullDownEntryAttempt: true`
- **AND** the payload SHALL include a `hullDown` movement step at the unit's
  current hex with the entry MP cost
- **AND** the declaration SHALL preserve zero hex displacement and walking
  movement heat.
