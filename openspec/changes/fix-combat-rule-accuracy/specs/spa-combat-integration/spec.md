# spa-combat-integration (delta)

## MODIFIED Requirements

### Requirement: Gunnery SPA — Weapon Specialist

The Weapon Specialist SPA SHALL grant a -2 to-hit modifier (not -1) when firing the designated weapon type. This corrects the previous value which halved the intended benefit.

#### Scenario: Weapon Specialist with designated weapon

- **GIVEN** a pilot with Weapon Specialist (Medium Laser)
- **WHEN** the pilot fires a Medium Laser
- **THEN** the attack SHALL receive a -2 to-hit modifier

#### Scenario: Weapon Specialist with non-designated weapon

- **GIVEN** a pilot with Weapon Specialist (Medium Laser)
- **WHEN** the pilot fires an AC/10
- **THEN** no Weapon Specialist modifier SHALL apply

### Requirement: Gunnery SPA — Sniper

The Sniper SPA SHALL halve (floor-divide) every range modifier — short, medium, long, extreme — not merely zero the medium-range penalty.

#### Scenario: Sniper at short range

- **GIVEN** a pilot with Sniper firing at short range (base +0)
- **WHEN** the range modifier is computed
- **THEN** the range modifier SHALL be +0 (floor(0 / 2))

#### Scenario: Sniper at medium range

- **GIVEN** a pilot with Sniper firing at medium range (base +2)
- **WHEN** the range modifier is computed
- **THEN** the range modifier SHALL be +1 (floor(2 / 2))

#### Scenario: Sniper at long range

- **GIVEN** a pilot with Sniper firing at long range (base +4)
- **WHEN** the range modifier is computed
- **THEN** the range modifier SHALL be +2 (floor(4 / 2))

#### Scenario: Sniper at extreme range

- **GIVEN** a pilot with Sniper firing at extreme range (base +6)
- **WHEN** the range modifier is computed
- **THEN** the range modifier SHALL be +3 (floor(6 / 2))

### Requirement: Movement SPA — Jumping Jack

The Jumping Jack SPA SHALL modify the attacker's to-hit when the attacker jumped this turn, NOT the target's piloting roll.

When an attacker with Jumping Jack jumped, the jump-movement to-hit penalty (normally +3) SHALL be reduced by 1 (net +2). The SPA SHALL NOT affect any piloting-skill-roll calculation.

#### Scenario: Attacker with Jumping Jack jumps and fires

- **GIVEN** an attacker with the Jumping Jack SPA who jumped this turn
- **WHEN** the to-hit modifier is computed
- **THEN** the jumping-attacker penalty SHALL be +2 (reduced from +3)

#### Scenario: Attacker with Jumping Jack did not jump

- **GIVEN** an attacker with the Jumping Jack SPA who walked this turn
- **WHEN** the to-hit modifier is computed
- **THEN** no Jumping Jack modifier SHALL apply
- **AND** the standard walking penalty (+1) SHALL apply

#### Scenario: Jumping Jack no longer affects PSRs

- **GIVEN** an attacker with the Jumping Jack SPA who triggers a piloting-skill roll
- **WHEN** the PSR modifiers are aggregated
- **THEN** Jumping Jack SHALL NOT contribute any modifier to the PSR
