# Spec Delta: Movement System

## ADDED Requirements

### Requirement: Movement Declaration Captures Go-Prone Posture Attempts

The movement event model SHALL capture same-hex hull-down `GO_PRONE`
posture attempts as replay-safe movement declarations.

#### Scenario: Go-prone declaration carries posture metadata

- **GIVEN** a hull-down Mek-style unit commits the go-prone posture action
- **WHEN** the movement event is serialized
- **THEN** the `MovementDeclared` payload SHALL include `goProneAttempt: true`
- **AND** the payload SHALL include a `goProne` movement step at the unit's
  current hex with `mpCost: 0`
- **AND** the declaration SHALL preserve zero hex displacement and zero
  movement heat.
