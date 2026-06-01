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

#### Scenario: Grounded AirMek charge follows Mek charge rules

- **GIVEN** a represented Land-Air 'Mech in AirMek conversion mode
- **AND** the AirMek is not airborne
- **AND** the unit ran this turn and is adjacent to an enemy unit
- **WHEN** the shared physical projection derives charge options
- **THEN** the charge row SHALL remain eligible unless another charge
  restriction applies
- **AND** declaration validation SHALL accept the same charge.

#### Scenario: Fighter mode and airborne AirMek charge are blocked

- **GIVEN** a represented Land-Air 'Mech in fighter conversion mode
- **OR** a represented Land-Air 'Mech in airborne AirMek conversion mode
- **WHEN** the shared physical projection derives charge options
- **THEN** the charge row SHALL be blocked with `AttackerCannotCharge`
- **AND** declaration validation SHALL reject the same charge with
  `AttackerCannotCharge`.
