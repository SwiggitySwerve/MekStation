# combat-resolution (delta)

## ADDED Requirements

### Requirement: Attack Resolution Produces Damage Events

When an attack hits, the combat resolution step SHALL emit the full chain of damage-related events derived from the damage pipeline output.

Events that SHALL be emitted when applicable: `DamageApplied`, `LocationDestroyed`, `TransferDamage`, `PilotHit`, `CriticalHit`, `ComponentDestroyed`, `AmmoExploded`.

#### Scenario: Simple damage emits DamageApplied

- **GIVEN** an attack that hits and does not breach armor
- **WHEN** the resolution completes
- **THEN** a `DamageApplied` event SHALL be emitted with location, amount, and remaining armor

#### Scenario: Structure breach emits critical chain

- **GIVEN** an attack that reduces armor to 0 and damages structure
- **WHEN** the resolution completes
- **THEN** `DamageApplied` SHALL be emitted
- **AND** `CriticalHit` SHALL be emitted if the crit roll yields ≥ 1 crit
- **AND** `ComponentDestroyed` SHALL be emitted for each destroyed component

#### Scenario: Location destruction emits transfer chain

- **GIVEN** an attack that destroys a location
- **WHEN** the resolution completes
- **THEN** `LocationDestroyed` SHALL be emitted
- **AND** `TransferDamage` SHALL be emitted for excess damage moving to the adjacent location
- **AND** further events SHALL chain if the transfer also destroys the adjacent location

#### Scenario: Side torso destruction cascades

- **GIVEN** an attack destroys the left torso
- **WHEN** the resolution completes
- **THEN** `LocationDestroyed` SHALL be emitted for LT
- **AND** `LocationDestroyed` SHALL also be emitted for LA (cascade)
