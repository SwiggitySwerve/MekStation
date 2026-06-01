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

### Requirement: Ammo Explosion Triggered by Critical Hit on Loaded Bin

When a critical hit lands on an ammo slot AND the bin contains at least one loaded round, the engine SHALL emit `AmmoExplosion { unitId, ammoBinId, location, damage, source: 'critical_hit' }`. The damage value MUST equal the sum of `roundsRemaining × damagePerRound` for the bin. The explosion damage MUST be applied to the bin's location BEFORE any cascade transfer.

#### Scenario: AC/20 ammo crit with 5 rounds remaining

- **GIVEN** an Atlas with an AC/20 ammo bin in RT containing 5 rounds (1 round = 20 damage)
- **AND** a critical hit lands on the bin slot
- **WHEN** the runner processes the crit
- **THEN** `AmmoExplosion { ammoBinId: 'ac20-ammo', location: 'RT', damage: 100, source: 'critical_hit' }` MUST emit
- **AND** the resulting `DamageApplied { location: 'RT', damage: 100 }` MUST follow

#### Scenario: Empty ammo bin crit produces no explosion

- **GIVEN** an Atlas with an AC/20 ammo bin in RT with `roundsRemaining: 0`
- **AND** a critical hit lands on the empty bin slot
- **WHEN** the runner processes the crit
- **THEN** `ComponentDestroyed { component: 'ac20-ammo' }` MUST emit
- **AND** NO `AmmoExplosion` event MUST emit

### Requirement: Heat-Triggered Ammo Explosion

When a unit's heat reaches 19+ on the post-attack heat phase, the engine SHALL roll an ammo-explosion check using the canonical BattleTech Total Warfare table (1d6 per loaded ammo bin in the unit). On any roll meeting or exceeding the threshold for that heat level, `AmmoExplosion { source: 'heat_overflow' }` MUST emit. The check MUST use the injected `D6Roller` per the determinism requirement in `simulation-system`.

#### Scenario: Heat 19 with seeded roller producing trigger roll

- **GIVEN** an Atlas at heat 19 with an AC/20 ammo bin containing 5 rounds
- **AND** a `SeededD6Roller` that returns a roll meeting the heat-19 ammo-explosion threshold
- **WHEN** the heat phase resolves
- **THEN** `AmmoExplosion { source: 'heat_overflow' }` MUST emit before any other heat-effect events

#### Scenario: Heat 19 with safe roll produces no explosion

- **GIVEN** the same Atlas state but a roller returning below threshold
- **WHEN** the heat phase resolves
- **THEN** NO `AmmoExplosion` event MUST emit

### Requirement: CASE Confines Ammo Explosion Damage

When an `AmmoExplosion` fires in a location that has CASE installed, the explosion damage MUST be confined to that location. NO `TransferDamage` event MUST follow. Standard CASE caps protected explosion damage before local runner damage resolution, so the source location is destroyed only when the capped damage exhausts its remaining local armor/structure in MekStation's current damage pipeline.

#### Scenario: AC/20 ammo cookoff in RT with CASE

- **GIVEN** an Atlas with AC/20 ammo bin in RT (5 rounds)
- **AND** CASE installed in the same RT location
- **WHEN** the bin takes a critical hit triggering an explosion
- **THEN** `AmmoExplosion { location: 'RT', damage: 100, caseProtection: 'case' }` MUST emit
- **AND** local runner damage MUST be capped before transfer is considered
- **AND** NO `TransferDamage { from: 'RT', to: 'CT' }` MUST emit
- **AND** the unit MUST survive (CT untouched)

### Requirement: CASE-II Confines Ammo Damage Within Location Without Destroying

When CASE-II is installed, `AmmoExplosion` damage MUST be capped to 1 point before local runner damage resolution. `LocationDestroyed` MUST NOT emit unless the capped damage, or other concurrent damage, destroyed the location.

#### Scenario: AC/20 ammo cookoff in RT with CASE-II

- **GIVEN** a Clan-tech Mad Cat with LB-X/20 ammo bin in RT (3 rounds)
- **AND** CASE-II installed in RT
- **WHEN** the bin takes a critical hit triggering explosion
- **THEN** `AmmoExplosion { source: 'critical_hit' }` MUST emit
- **AND** `ComponentDestroyed { component: 'lbx20-ammo' }` MUST emit
- **AND** local runner damage MUST be capped to 1 point before transfer is considered
- **AND** `LocationDestroyed { location: 'RT' }` MUST NOT emit unless the location was already destroyed by other damage

### Requirement: Ammo Explosion Without CASE Cascades Per Damage Transfer Chain

When `AmmoExplosion` fires in a location WITHOUT CASE or CASE-II, the explosion damage MUST follow the canonical damage transfer chain — overflow propagates to the parent location (LT/RT → CT, LA → LT, RA → RT, LL → LT, RL → RT) per `combat-resolution`'s `LocationDestroyed` + `TransferDamage` rules. HD damage does NOT transfer.

#### Scenario: Side-torso ammo explosion without CASE destroys CT

- **GIVEN** an Atlas with AC/20 ammo in RT (5 rounds = 100 damage)
- **AND** RT has 22 armor + 20 structure remaining = 42 total
- **AND** NO CASE in RT
- **WHEN** the explosion fires
- **THEN** events MUST emit in order: `AmmoExplosion { damage: 100 }`, `DamageApplied { location: 'RT', damage: 42 }`, `LocationDestroyed { location: 'RT' }`, `TransferDamage { from: 'RT', to: 'CT', damage: 58 }`, `DamageApplied { location: 'CT', damage: 58 }`
- **AND** if CT armor + structure < 58, `LocationDestroyed { location: 'CT' }` and `UnitDestroyed { cause: 'ct_destroyed' }` MUST follow
