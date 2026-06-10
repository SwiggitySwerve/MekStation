# Spec Delta: Piloting Skill Rolls

## ADDED Requirements

### Requirement: AirMek Landing PSR Trigger

The PSR taxonomy SHALL include a canonical `PSRTrigger.AirMekLanding` code for
LAM AirMek landing control checks, and the AirMek landing PSR factory SHALL
populate both the human-readable reason and the canonical reason code.

#### Scenario: AirMek landing factory stamps canonical reason code

- **WHEN** an AirMek landing PSR is created
- **THEN** the pending PSR SHALL use reason `landing with gyro or leg damage`
- **AND** it SHALL use `triggerSource: PSRTrigger.AirMekLanding`
- **AND** it SHALL use `reasonCode: PSRTrigger.AirMekLanding`.

## MODIFIED Requirements

### Requirement: PSR Modifier — Gyro Damage

AirMek landing PSRs SHALL use the landing-control modifier already computed
from MegaMek `LandAirMek.checkAirMekLanding()` semantics instead of applying
the generic gyro PSR modifier. Pilot wound modifiers SHALL still apply through
the normal PSR resolver.

#### Scenario: AirMek landing PSR avoids generic gyro double-counting

- **GIVEN** an AirMek landing PSR has a landing-control modifier
- **AND** the unit state also has represented gyro damage
- **WHEN** the PSR is resolved
- **THEN** the target number SHALL include the landing-control modifier
- **AND** it SHALL NOT include the generic gyro-hit PSR modifier.

### Requirement: PSR Modifier — Leg Actuator Damage

AirMek landing PSRs SHALL use the landing-control modifier already computed
from MegaMek `LandAirMek.checkAirMekLanding()` semantics instead of applying
generic leg-actuator PSR modifiers.

#### Scenario: AirMek landing PSR avoids generic actuator double-counting

- **GIVEN** an AirMek landing PSR has a landing-control modifier
- **AND** the unit state also has represented leg-actuator damage
- **WHEN** the PSR is resolved
- **THEN** the target number SHALL include the landing-control modifier
- **AND** it SHALL NOT include generic actuator PSR modifiers.
