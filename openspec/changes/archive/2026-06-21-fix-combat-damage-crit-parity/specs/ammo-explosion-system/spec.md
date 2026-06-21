# ammo-explosion-system Delta — fix-combat-damage-crit-parity

## MODIFIED Requirements

### Requirement: CASE Protection

CASE (Cellular Ammunition Storage Equipment) SHALL limit ammo explosion damage to the location
containing the exploding ammo bin. Standard CASE SHALL apply up to the location's remaining
internal structure and VENT all excess to the environment — NO arbitrary fixed cap (the prior
10-point cap is removed), and NO transfer to the adjacent/parent location.

#### Scenario: CASE limits explosion to single location

- **WHEN** an ammo bin explodes in a side torso equipped with CASE
- **THEN** explosion damage SHALL be applied only to that side torso location
- **AND** excess damage SHALL NOT transfer to adjacent locations (center torso)
- **AND** the pilot SHALL take no damage from the explosion
- **AND** the side torso SHALL be destroyed if structure is exceeded

#### Scenario: Standard CASE vents all excess beyond internal structure

- **GIVEN** a side torso with CASE and 18 remaining internal structure
- **WHEN** an ammo bin explodes for 40 damage in that location
- **THEN** up to 18 damage SHALL be applied to that location's internal structure
- **AND** the remaining 22 damage SHALL be VENTED (discarded to the environment), NOT capped at
  10 and NOT transferred to the center torso
- **AND** the side torso SHALL be destroyed (internal structure exhausted)

#### Scenario: CASE does not prevent location destruction

- **WHEN** CASE-protected location takes ammo explosion damage exceeding its structure
- **THEN** the location SHALL be destroyed
- **AND** the arm attached to that side torso SHALL be destroyed (cascade)
- **AND** no further damage transfer SHALL occur

### Requirement: No CASE Explosion Damage

When ammo explodes in a location without CASE, damage SHALL transfer normally and the pilot SHALL
take 2 points of damage (the canonical unprotected ammo cook-off crew-wound value).

#### Scenario: Unprotected ammo explosion

- **WHEN** an ammo bin explodes in a location without CASE
- **THEN** explosion damage SHALL apply to internal structure at that location
- **AND** excess damage SHALL transfer to adjacent locations per standard damage transfer rules
- **AND** the pilot SHALL take 2 points of damage

### Requirement: CASE Confines Ammo Explosion Damage

An `AmmoExplosion` firing in a location with standard CASE installed SHALL be confined to that
location, and NO `TransferDamage` event SHALL follow. Standard CASE SHALL apply explosion damage
up to the location's remaining internal structure and SHALL vent all excess (no fixed cap), so the
source location is destroyed exactly when the explosion exhausts its remaining internal structure.

#### Scenario: AC/20 ammo cookoff in RT with CASE

- **GIVEN** an Atlas with AC/20 ammo bin in RT (5 rounds = 100 damage)
- **AND** CASE installed in the same RT location
- **WHEN** the bin takes a critical hit triggering an explosion
- **THEN** `AmmoExplosion { location: 'RT', damage: 100, caseProtection: 'case' }` MUST emit
- **AND** local runner damage MUST apply up to RT's remaining internal structure and vent the rest
- **AND** NO `TransferDamage { from: 'RT', to: 'CT' }` MUST emit
- **AND** the unit MUST survive (CT untouched), even though RT is destroyed
