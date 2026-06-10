# Spec Delta: Physical Attack System

## MODIFIED Requirements

### Requirement: Physical Attack Eligibility Projection

The physical-attack system SHALL expose a `getEligiblePhysicalAttacks(attacker:
IUnitGameState, target: IUnitGameState): IPhysicalAttackOption[]` function that
returns every represented physical attack type with its computed to-hit TN,
damage, self-risk summary, and failed restriction codes. Charge eligibility
SHALL use the attacker's represented movement mode, enabled optional rules, and
vehicle crew-stun state in addition to unit type and whether the attacker ran
this turn.

#### Scenario: Stunned vehicle charge is blocked before commit

- **GIVEN** a vehicle that ran this turn and has `crewStunnedPhases > 0`
- **AND** the vehicle is adjacent to an enemy unit
- **WHEN** the shared physical projection derives charge options
- **THEN** the charge row SHALL be blocked with `AttackerCannotCharge`
- **AND** declaration validation SHALL reject the same charge with
  `AttackerCannotCharge`.
