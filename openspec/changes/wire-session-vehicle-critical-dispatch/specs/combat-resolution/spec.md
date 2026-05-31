# Spec Delta: Combat Resolution

## ADDED Requirements

### Requirement: Session Vehicle Critical Dispatch

The system SHALL dispatch represented vehicle weapon-hit critical triggers from
the committed session attack path through the vehicle critical-hit resolver.

#### Scenario: Vehicle TAC critical is replay-visible

- **GIVEN** a committed weapon attack hits a target with
  `combatState.kind === "vehicle"`
- **AND** the vehicle hit-location result is a TAC trigger
- **WHEN** the session resolves the attack
- **THEN** the session SHALL roll and apply a vehicle critical result
- **AND** the event stream SHALL include a `CriticalHitResolved` event naming
  the vehicle critical effect that was applied.

#### Scenario: Vehicle structure exposure triggers critical dispatch

- **GIVEN** a committed weapon attack hits a target with
  `combatState.kind === "vehicle"`
- **AND** vehicle damage exposes structure at the hit location
- **WHEN** the session resolves the attack
- **THEN** the session SHALL roll and apply a vehicle critical result after the
  vehicle damage event has been emitted.

#### Scenario: Vehicle critical effects emit state-specific events

- **GIVEN** a vehicle critical result applies a crew stun, weapon destruction,
  ammo explosion, engine destruction, or crew kill effect
- **WHEN** the session emits replay events for the critical
- **THEN** the event stream SHALL include the applicable state-specific events
  from `VehicleCrewStunned`, `ComponentDestroyed`, `AmmoExplosion`, and
  `UnitDestroyed`
- **AND** replaying the events SHALL reconstruct the vehicle combat-state
  mutation.
