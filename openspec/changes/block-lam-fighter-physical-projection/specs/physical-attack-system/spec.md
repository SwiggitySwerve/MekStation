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
rows SHALL be blocked with `AttackerCannotUsePhysical`.

#### Scenario: Fighter-mode LAM has no normal physical attack highlights

- **GIVEN** a represented Land-Air 'Mech in fighter conversion mode
- **AND** the unit is adjacent to an enemy unit
- **WHEN** the shared physical projection derives physical attack options
- **THEN** punch, kick, push, DFA, and represented melee-weapon rows SHALL be
  blocked with `AttackerCannotUsePhysical`
- **AND** declaration validation SHALL reject the same non-charge physical
  attack with `AttackerCannotUsePhysical`.
