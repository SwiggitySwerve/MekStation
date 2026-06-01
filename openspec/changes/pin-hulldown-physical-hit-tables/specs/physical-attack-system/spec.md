# Spec Delta: Physical Attack System

## MODIFIED Requirements

### Requirement: UI-Facing Eligibility Projection

The physical-attack system SHALL expose a `getEligiblePhysicalAttacks(attacker:
IUnitGameState, target: IUnitGameState | null, context: IEligibilityContext)`
projection that returns every represented physical attack type with its
computed to-hit TN, damage, self-risk summary, failed restriction codes, and
the hit-location table that the resolver will use if the attack hits.

#### Scenario: Hull-down punch projects MegaMek hit table

- **GIVEN** a hull-down represented Mek-style attacker has a legal punch target
- **AND** the target base elevation is at the attacker's arm elevation
- **WHEN** physical attack options are projected for that target
- **THEN** the punch row's damage summary SHALL use the kick hit-location table
- **AND** a later resolver consuming the declaration SHALL use the same table
  for hit-location resolution.

#### Scenario: Hull-down club projects MegaMek hit table

- **GIVEN** a hull-down represented Mek-style attacker has a represented
  Mek-style target and an equipped melee weapon
- **WHEN** physical attack options are projected for that target
- **THEN** the melee weapon row's damage summary SHALL use the kick
  hit-location table that MegaMek applies to hull-down club-style attacks.
