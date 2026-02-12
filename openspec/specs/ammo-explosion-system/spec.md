# ammo-explosion-system Specification

## Purpose

TBD - created by archiving change full-combat-parity. Update Purpose after archive.

## Requirements

### Requirement: Critical Hit Ammo Explosion

When an ammo bin receives a critical hit, the system SHALL calculate explosion damage as `remainingRounds × damagePerRound` and apply it to the internal structure at the bin's location.

#### Scenario: Full ammo bin explosion

- **WHEN** an ammo bin with 15 remaining rounds of AC/10 ammo (10 damage per round) receives a critical hit
- **THEN** explosion damage SHALL be `15 × 10 = 150`
- **AND** damage SHALL be applied to internal structure at the bin's location
- **AND** excess damage SHALL transfer to adjacent locations per normal damage transfer rules

#### Scenario: Partially depleted ammo bin

- **WHEN** an ammo bin with 3 remaining rounds of SRM-6 ammo (2 damage × 6 missiles = 12 per round) receives a critical hit
- **THEN** explosion damage SHALL be `3 × 12 = 36`

#### Scenario: Empty ammo bin critical hit

- **WHEN** an ammo bin with 0 remaining rounds receives a critical hit
- **THEN** no explosion damage SHALL occur
- **AND** the bin SHALL simply be marked as destroyed

### Requirement: CASE Protection

CASE (Cellular Ammunition Storage Equipment) SHALL limit ammo explosion damage to the location containing the exploding ammo bin.

#### Scenario: CASE limits explosion to single location

- **WHEN** an ammo bin explodes in a side torso equipped with CASE
- **THEN** explosion damage SHALL be applied only to that side torso location
- **AND** excess damage SHALL NOT transfer to adjacent locations (center torso)
- **AND** the pilot SHALL take no damage from the explosion
- **AND** the side torso SHALL be destroyed if structure is exceeded

#### Scenario: CASE does not prevent location destruction

- **WHEN** CASE-protected location takes ammo explosion damage exceeding its structure
- **THEN** the location SHALL be destroyed
- **AND** the arm attached to that side torso SHALL be destroyed (cascade)
- **AND** no further damage transfer SHALL occur

### Requirement: CASE II Protection

CASE II SHALL provide superior protection, transferring only 1 point of damage to adjacent locations.

#### Scenario: CASE II limits damage transfer

- **WHEN** an ammo bin explodes in a location equipped with CASE II
- **THEN** only 1 point of damage SHALL transfer to adjacent locations
- **AND** the pilot SHALL take no damage from the explosion

### Requirement: No CASE Explosion Damage

When ammo explodes in a location without CASE, damage SHALL transfer normally and the pilot SHALL take damage.

#### Scenario: Unprotected ammo explosion

- **WHEN** an ammo bin explodes in a location without CASE
- **THEN** explosion damage SHALL apply to internal structure at that location
- **AND** excess damage SHALL transfer to adjacent locations per standard damage transfer rules
- **AND** the pilot SHALL take 1 point of damage

### Requirement: Heat-Induced Ammo Explosion

At heat level 19 or above, the system SHALL check for heat-induced ammo explosions during the heat phase.

#### Scenario: Ammo explosion check at heat 19-22

- **WHEN** a unit's heat level is 19-22 during the heat phase
- **THEN** the system SHALL roll 2d6 per ammo bin
- **AND** a roll of 4 or higher SHALL avoid explosion (target number 4)
- **AND** a roll below 4 SHALL cause that ammo bin to explode

#### Scenario: Ammo explosion check at heat 23-27

- **WHEN** a unit's heat level is 23-27 during the heat phase
- **THEN** the ammo explosion target number SHALL be 6

#### Scenario: Ammo explosion check at heat 28+

- **WHEN** a unit's heat level is 28 or above during the heat phase
- **THEN** the ammo explosion target number SHALL be 8

#### Scenario: Auto-explosion at heat 30+

- **WHEN** a unit's heat level is 30 or above
- **THEN** all ammo bins SHALL automatically explode without a roll

#### Scenario: Random bin selection for heat-induced explosion

- **WHEN** a heat-induced ammo explosion check fails
- **THEN** a random non-empty ammo bin SHALL be selected for the explosion

### Requirement: Gauss Rifle Explosion

A Gauss rifle SHALL explode for 20 damage when it receives a critical hit, independent of ammo.

#### Scenario: Gauss rifle critical hit explosion

- **WHEN** a Gauss rifle receives a critical hit
- **THEN** 20 points of explosion damage SHALL be applied to the Gauss rifle's location
- **AND** this explosion SHALL occur regardless of ammo state
- **AND** the Gauss rifle SHALL be destroyed

### Requirement: Clan OmniMech Default CASE

Clan OmniMech side torsos SHALL have CASE by default.

#### Scenario: Clan OmniMech CASE in side torsos

- **WHEN** a Clan OmniMech unit has ammo in a side torso
- **THEN** CASE protection SHALL apply to that side torso by default
- **AND** ammo explosions SHALL be contained per standard CASE rules

### Requirement: Ammo Explosion Events

Ammo explosions SHALL produce appropriate game events.

#### Scenario: AmmoExplosion event emitted

- **WHEN** an ammo bin explodes
- **THEN** an AmmoExplosion event SHALL be emitted
- **AND** the event SHALL include binId, location, totalDamage, isCASEProtected, and pilotDamage

### Requirement: Injectable Randomness for Ammo Explosions

All ammo explosion resolution SHALL use injectable DiceRoller for deterministic testing.

#### Scenario: Deterministic ammo explosion resolution

- **WHEN** resolving heat-induced ammo explosion checks with a seeded DiceRoller
- **THEN** identical inputs and seeds SHALL produce identical explosion outcomes
