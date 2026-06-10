# Spec Delta: Piloting Skill Rolls

## MODIFIED Requirements

### Requirement: PSR Resolution Mechanic

Failed AirMek landing PSRs SHALL use the current fall-resolution event model
with fall height taken from the runtime landing-control payload and tonnage
taken from the represented unit when available.

#### Scenario: Failed AirMek landing PSR uses represented unit tonnage

- **GIVEN** an AirMek landing-control payload carries a landing fall height
- **AND** the interactive session has represented catalog tonnage for the unit
- **WHEN** the landing PSR fails
- **THEN** the emitted `UnitFell` event SHALL carry fall damage based on that
  fall height and represented tonnage under the current MekStation fall model
- **AND** synthetic sessions with no represented tonnage SHALL retain the legacy
  fallback tonnage.
