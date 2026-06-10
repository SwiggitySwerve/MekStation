# Spec Delta: Game State Management

## ADDED Requirements

### Requirement: Physical Attack Declaration Payloads

`PhysicalAttackDeclared` events SHALL preserve the player-facing physical
attack selection needed by later resolution and replay consumers.

#### Scenario: Physical declaration preserves selected hit table

- **GIVEN** a physical attack declaration is accepted from a rules-backed map
  projection
- **WHEN** the projection selected a physical hit-location table for the attack
- **THEN** the emitted `PhysicalAttackDeclared` payload SHALL include that
  `hitTable`
- **AND** physical attack resolution SHALL prefer the declared table over
  recalculating from incomplete attacker-only context.
