# Ammo Explosion System (delta)

## ADDED Requirements

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

When an `AmmoExplosion` fires in a location that has CASE installed, the explosion damage MUST be confined to that location. NO `TransferDamage` event MUST follow. The location MUST be destroyed (`LocationDestroyed`) but cascade to adjacent locations is suppressed by CASE rules.

#### Scenario: AC/20 ammo cookoff in RT with CASE

- **GIVEN** an Atlas with AC/20 ammo bin in RT (5 rounds)
- **AND** CASE installed in the same RT location
- **WHEN** the bin takes a critical hit triggering an explosion
- **THEN** the event chain MUST be: `AmmoExplosion { location: 'RT', damage: 100 }`, `DamageApplied { location: 'RT', damage: 100 }`, `LocationDestroyed { location: 'RT' }`
- **AND** NO `TransferDamage { from: 'RT', to: 'CT' }` MUST emit
- **AND** the unit MUST survive (CT untouched)

### Requirement: CASE-II Confines Ammo Damage Within Location Without Destroying

When CASE-II is installed (Clan-style), `AmmoExplosion` damage MUST be vented externally — the bin slot is destroyed (`ComponentDestroyed`) but neither the location armor nor structure takes the explosion damage. `LocationDestroyed` MUST NOT emit unless other concurrent damage already destroyed the location.

#### Scenario: AC/20 ammo cookoff in RT with CASE-II

- **GIVEN** a Clan-tech Mad Cat with LB-X/20 ammo bin in RT (3 rounds)
- **AND** CASE-II installed in RT
- **WHEN** the bin takes a critical hit triggering explosion
- **THEN** `AmmoExplosion { source: 'critical_hit' }` MUST emit
- **AND** `ComponentDestroyed { component: 'lbx20-ammo' }` MUST emit
- **AND** NO damage MUST be applied to RT armor or structure (vented externally per CASE-II rules)
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
