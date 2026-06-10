# Spec Delta: Piloting Skill Rolls

## MODIFIED Requirements

### Requirement: AirMek Landing PSR Trigger

AirMek landing PSRs created from runtime landing-control map commands SHALL be
resolved immediately in movement phase, rather than waiting for the general
end-phase pending-PSR resolver.

#### Scenario: AirMek landing PSR resolves in movement phase

- **GIVEN** an AirMek landing PSR is created from a runtime landing-control
  command
- **WHEN** the roll is evaluated
- **THEN** the engine SHALL append `PSRResolved` in the same movement-phase
  command sequence
- **AND** the pending AirMek landing PSR SHALL be cleared by replaying that
  `PSRResolved` event.

### Requirement: PSR Resolution Mechanic

Failed AirMek landing PSRs SHALL use the current fall-resolution event model
with fall height taken from the runtime landing-control payload.

#### Scenario: Failed AirMek landing PSR uses represented fall height

- **GIVEN** an AirMek landing-control payload carries a landing fall height
- **WHEN** the landing PSR fails
- **THEN** the emitted `UnitFell` event SHALL carry fall damage based on that
  fall height under the current MekStation fall model
- **AND** the `UnitFell` event SHALL carry `reasonCode:
  PSRTrigger.AirMekLanding`.
