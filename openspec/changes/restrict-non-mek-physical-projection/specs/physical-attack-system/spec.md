# Spec Delta: Physical Attack System

## MODIFIED Requirements

### Requirement: Physical Attack Eligibility Projection

The physical-attack system SHALL expose a `getEligiblePhysicalAttacks(attacker:
IUnitGameState, target: IUnitGameState): IPhysicalAttackOption[]` function that
returns every represented physical attack type with its computed to-hit TN,
damage, self-risk summary, and failed restriction codes. Generic Mek physical
attacks SHALL NOT be legal for represented non-mek attackers; those rows SHALL
remain disabled with `AttackerNotMek`. Represented unit types that cannot charge
in MegaMek SHALL keep the charge row disabled with `AttackerCannotCharge` rather
than becoming eligible solely because they ran this turn.

#### Scenario: Battle Armor does not create generic physical attack highlights

- **GIVEN** a Battle Armor unit adjacent to an enemy Mek during the Physical
  Attack phase
- **WHEN** the shared physical projection is derived for that target
- **THEN** generic punch, kick, DFA, and mech-melee rows SHALL be blocked with
  `AttackerNotMek`
- **AND** the charge row SHALL be blocked with `AttackerCannotCharge`
- **AND** those blocked rows SHALL NOT make the target eligible for a generic
  physical attack highlight.
