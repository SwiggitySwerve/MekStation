# damage-system Delta — fix-combat-damage-crit-parity

## MODIFIED Requirements

### Requirement: Head Damage Cap Rule

A single weapon or physical hit to the head SHALL apply its FULL damage through the
armor → internal-structure → destruction cascade with NO per-hit cap; the prior 3-point cap is
removed. The head retains 3 points of internal structure, so a hit that penetrates head armor
MAY destroy the head (and the unit) — restoring the possibility of head/cockpit kills. Exactly
one pilot wound SHALL be applied on a head hit (unchanged), and the roll-of-12 head-destruction
critical path SHALL remain in effect.

#### Scenario: AC/20 hits head and applies full damage

- **GIVEN** a head with 9 armor and 3 internal structure
- **WHEN** a standard weapon dealing 20 damage hits the head
- **THEN** all 9 armor SHALL be removed
- **AND** the remaining 11 damage SHALL apply to internal structure, exceeding the 3 head IS
- **AND** the head SHALL be destroyed and the unit SHALL be destroyed (head/cockpit kill)
- **AND** no per-hit 3-point cap SHALL be applied

#### Scenario: Head hit still applies exactly one pilot wound

- **WHEN** any hit lands on the head with positive damage
- **THEN** the pilot SHALL take exactly 1 wound for that head hit
- **AND** a consciousness check SHALL be required per the head-hit pilot-damage rule

#### Scenario: Cluster weapons apply full per-group head damage

- **WHEN** cluster weapon damage hits the head (each cluster is resolved as a separate group)
- **THEN** each cluster group SHALL apply its FULL damage to the head with no per-group cap
- **AND** accumulated head damage across groups SHALL follow the normal armor → IS cascade

### Requirement: Through Armor Critical (TAC)

Roll of 2 on hit location SHALL trigger TAC check in BOTH the interactive engine and the
simulation runner, so the two paths do not diverge on a roll-of-2.

#### Scenario: TAC by attack direction

- **WHEN** hit location roll is 2
- **THEN** Front/Rear attack TAC location SHALL be CT
- **AND** Left side attack TAC location SHALL be LT
- **AND** Right side attack TAC location SHALL be RT
- **AND** a critical hit determination roll SHALL be made regardless of remaining armor
- **AND** if the roll indicates critical hits, they SHALL be applied via the critical-hit-resolution system

#### Scenario: Simulation runner applies TAC on roll of 2

- **GIVEN** the simulation runner resolves a weapon hit whose hit-location roll is 2
- **WHEN** the hit is processed
- **THEN** the runner SHALL perform a TAC at the attack-direction TAC location
- **AND** the runner's roll-of-2 outcome SHALL match the interactive engine's outcome for the
  same unit state and dice seed
