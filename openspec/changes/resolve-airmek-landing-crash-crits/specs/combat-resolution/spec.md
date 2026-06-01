# Spec Delta: Combat Resolution

## MODIFIED Requirements

### Requirement: Movement Consequence Critical Events

Structure-exposing damage caused by runtime movement consequences SHALL resolve
critical-hit follow-through through the same shared damage/critical resolver as
weapon and physical-attack damage.

#### Scenario: AirMek landing crash damage triggers a critical hit

- **GIVEN** a failed AirMek landing-control check applies fall cluster damage
  during movement phase
- **AND** that cluster exposes internal structure without destroying the hit
  location
- **WHEN** the critical-hit roll succeeds
- **THEN** the event stream SHALL append movement-phase `CriticalHit`,
  `CriticalHitResolved`, and `ComponentDestroyed` events in causal order after
  the matching `DamageApplied`
- **AND** the target unit state SHALL replay the resolved component damage.

#### Scenario: AirMek landing crash critical destroys the unit

- **GIVEN** movement-phase AirMek landing crash damage triggers a critical
  cascade that destroys the unit
- **WHEN** the critical stream emits `UnitDestroyed`
- **THEN** the runtime movement command SHALL emit exactly one movement-phase
  `UnitDestroyed` event for that critical destruction.
