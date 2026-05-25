# Spec Delta: Physical Attack System

## MODIFIED Requirements

### Requirement: Physical Attack Eligibility Projection

The physical-attack system SHALL expose a `getEligiblePhysicalAttacks(attacker:
IUnitGameState, target: IUnitGameState): IPhysicalAttackOption[]` function that
returns every represented physical attack type with its computed to-hit TN,
damage, self-risk summary, and failed restriction codes. Charge eligibility
SHALL use the attacker's represented movement mode and enabled optional rules in
addition to unit type and whether the attacker ran this turn.

#### Scenario: WiGE vehicle charge is blocked before commit

- **GIVEN** a WiGE vehicle that ran this turn and is adjacent to an enemy unit
- **WHEN** the shared physical projection derives charge options
- **THEN** the charge row SHALL be blocked with `AttackerCannotCharge`
- **AND** command preview and declaration validation SHALL agree on that reason.

#### Scenario: Hover charge follows the optional rule

- **GIVEN** a hover vehicle that ran this turn and is adjacent to an enemy unit
- **WHEN** `no_hover_charge` is not enabled
- **THEN** the charge row SHALL remain eligible unless another charge restriction
  applies
- **WHEN** `no_hover_charge` is enabled
- **THEN** the charge row SHALL be blocked with `AttackerCannotCharge`.
