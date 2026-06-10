# Spec Delta: Combat Resolution

## ADDED Requirements

### Requirement: Damage Application Events

Damage caused by runtime movement consequences SHALL use the same
`DamageApplied` replay/reducer event shape as weapon and physical-attack damage,
while preserving the phase in which the consequence occurred.

#### Scenario: Movement consequence damage carries movement phase

- **GIVEN** a movement-phase runtime command produces armor/internal damage
- **WHEN** that damage is emitted as `DamageApplied`
- **THEN** the event SHALL carry `phase: GamePhase.Movement`
- **AND** replaying the event SHALL update the target unit's armor, structure,
  and phase-damage counters through the standard reducer.
