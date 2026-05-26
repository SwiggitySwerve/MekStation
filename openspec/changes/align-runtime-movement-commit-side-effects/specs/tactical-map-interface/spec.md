# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

The tactical map SHALL expose movement projection details from the same
rules-backed movement capability and commit-validation path used by the engine.
Runtime state changes that alter movement capability, unit height, movement
mode, movement points, heat profile, stand-up cost, or failed stand-up fallback
events SHALL be reflected before the player commits movement.

#### Scenario: Runtime movement commit side effects match projection capability

- **GIVEN** a represented unit's runtime state changes after import in a way
  that changes its effective movement capability
- **WHEN** the movement projection previews a stand-up cost, movement mode, heat
  profile, reachable destination, blocked destination, or failed stand-up
  fallback declaration
- **THEN** the interactive movement commit path SHALL use the same runtime
  movement capability for validation, stand-up PSR projection, heat, MP cost,
  and emitted movement events
- **AND** the movement declaration SHALL NOT fall back to stale import-time MP or
  movement-mode data.
