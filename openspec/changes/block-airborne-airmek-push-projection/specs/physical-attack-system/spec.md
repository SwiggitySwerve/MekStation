# Spec Delta: Physical Attack System

## MODIFIED Requirements

### Requirement: Physical Attack Eligibility Projection

The physical-attack system SHALL expose a `getEligiblePhysicalAttacks(attacker:
IUnitGameState, target: IUnitGameState): IPhysicalAttackOption[]` function that
returns every represented physical attack type with its computed to-hit TN,
damage, self-risk summary, and failed restriction codes. Charge eligibility
SHALL use the attacker's represented movement mode, runtime conversion mode,
represented airborne VTOL/WiGE state, enabled optional rules, and vehicle
crew-stun state in addition to unit type and whether the attacker ran this turn.
For represented Land-Air 'Mechs in fighter conversion mode, non-charge physical
rows SHALL be blocked with `AttackerCannotUsePhysical`. Push eligibility SHALL
use the attacker's represented airborne VTOL/WiGE state and block airborne
AirMek push rows with `AttackerAirborne`.

#### Scenario: Airborne AirMek has no push highlight

- **GIVEN** a represented Land-Air 'Mech in AirMek conversion mode
- **AND** the unit is airborne as a VTOL/WiGE-style unit
- **AND** the unit is adjacent to an enemy Mek
- **WHEN** the shared physical projection derives physical attack options
- **THEN** the push row SHALL be blocked with `AttackerAirborne`
- **AND** declaration validation SHALL reject the same push with
  `AttackerAirborne`.
