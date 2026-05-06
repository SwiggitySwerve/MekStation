# Combat Resolution (delta)

## ADDED Requirements

### Requirement: Critical Hit Trigger Return Value Captured

`resolveDamage()` at `src/utils/gameplay/damage/resolve.ts` SHALL capture the return value of `checkCriticalHitTrigger()` and propagate the trigger result to `resolveCriticalHits()` from `src/utils/gameplay/criticalHitResolution/resolver.ts`. The resulting per-slot critical outcomes MUST be appended to `IDamageResult.criticalHits[]` and returned to the caller. The current implementation discards the trigger return value, leaving `criticalHits[]` permanently empty.

#### Scenario: Structure damage with crit roll 8 produces 1 critical

- **GIVEN** a unit with structure damage applied to its CT
- **AND** a seeded `D6Roller` configured to return rolls summing to 8 on `roll2d6()`
- **WHEN** `resolveDamage` is called with that roller
- **THEN** the returned `IDamageResult.criticalHits` MUST contain exactly 1 critical hit entry

#### Scenario: Structure damage with crit roll 7 produces 0 criticals

- **GIVEN** a unit with structure damage applied
- **AND** a seeded roller returning sum 7
- **WHEN** `resolveDamage` is called
- **THEN** `IDamageResult.criticalHits` MUST be empty

#### Scenario: Structure damage with crit roll 12 produces 3 criticals or limb-blown-off

- **GIVEN** a unit with structure damage applied to a limb (e.g., LA)
- **AND** a seeded roller returning sum 12
- **WHEN** `resolveDamage` is called
- **THEN** the result MUST emit either 3 critical-hit entries OR a single "limb blown off" effect that destroys all remaining slots in that limb (per BattleTech Total Warfare rules)

### Requirement: Critical Hit Events Emitted by Runner

The weapon attack runner phase at `src/simulation/runner/phases/weaponAttack.ts` SHALL emit `CriticalHit`, `CriticalHitResolved`, and `ComponentDestroyed` events from the populated `IDamageResult.criticalHits[]` array. Event payloads MUST include sufficient identity to attribute the crit to a specific attacker, target, weapon, location, and component.

#### Scenario: Gyro destruction event chain

- **GIVEN** a seeded scenario where a critical hit destroys the gyro on a unit
- **WHEN** the runner processes the damage result
- **THEN** the event log MUST contain `CriticalHit { unitId, location: 'CT', count: 1 }`, `CriticalHitResolved { unitId, location: 'CT', slot: <gyro-slot>, component: 'gyro' }`, and `ComponentDestroyed { unitId, component: 'gyro' }`

#### Scenario: Engine-3-hit destruction triggers UnitDestroyed

- **GIVEN** a seeded scenario where 3 critical hits land on engine slots
- **WHEN** the third engine crit resolves
- **THEN** `UnitDestroyed { unitId, cause: 'engine_destroyed' }` MUST fire after the third `ComponentDestroyed { component: 'engine' }`

### Requirement: Weapon Attack Lifecycle Events

`weaponAttack.ts` SHALL emit `AttackDeclared` immediately before the to-hit roll, with payload containing `attackerId`, `targetId`, `weaponId`, `range`, `firingArc`, and the full modifier list contributing to the target number. Immediately after the roll resolves, `AttackResolved` MUST emit with `attackerId`, `targetId`, `weaponId`, `rolledTN`, `rolled2d6`, `hit: bool`, and (when `hit: true`) `hitLocation`. The current implementation emits neither event.

#### Scenario: AC/20 attack at short range vs stationary target

- **GIVEN** a seeded Atlas firing AC/20 at a stationary Locust at range 2 (short bracket)
- **AND** the to-hit calculation produces TN 4 (gunnery 4 + 0 modifiers)
- **WHEN** the attack resolves
- **THEN** `AttackDeclared { weaponId: 'ac20', range: 'short', modifiers: [{ key: 'gunnery', value: 4 }] }` MUST fire BEFORE the roll
- **AND** `AttackResolved { rolledTN: 4, hit: <bool>, hitLocation: <if hit> }` MUST fire AFTER the roll

#### Scenario: Out-of-range attack emits AttackInvalid

- **GIVEN** a weapon attack declared at range exceeding the weapon's longRange
- **WHEN** the runner validates the attack
- **THEN** `AttackInvalid { reason: 'out_of_range' }` MUST emit
- **AND** no `AttackDeclared` / `AttackResolved` for that attempt

### Requirement: Location Destruction and Damage Transfer Events

When a location's armor and internal structure both reach zero, `weaponAttack.ts` SHALL emit `LocationDestroyed { unitId, location }`. When residual damage transfers from a destroyed location to the next location in the canonical transfer chain (HD blocked, CT terminal, LT/RT → CT, LA → LT, RA → RT, LL → LT, RL → RT), `TransferDamage { unitId, fromLocation, toLocation, damage }` MUST emit before `DamageApplied` for the receiving location.

#### Scenario: LA destroyed transfers remaining damage to LT

- **GIVEN** a unit with LA at 1 armor + 1 structure
- **AND** an attack delivering 5 damage to LA
- **WHEN** damage resolves
- **THEN** events MUST emit in order: `DamageApplied { location: 'LA', damage: 2 }`, `LocationDestroyed { location: 'LA' }`, `TransferDamage { from: 'LA', to: 'LT', damage: 3 }`, `DamageApplied { location: 'LT', damage: 3 }`

#### Scenario: HD destruction does not transfer damage

- **GIVEN** a unit with HD at 1 armor + 1 structure
- **AND** an attack delivering 10 damage to HD
- **WHEN** damage resolves
- **THEN** `LocationDestroyed { location: 'HD' }` MUST emit
- **AND** no `TransferDamage` event MUST follow
- **AND** `UnitDestroyed { cause: 'head_destroyed' }` MUST emit

### Requirement: Heat Lifecycle Events

The heat phase at `src/simulation/runner/phases/postCombat.ts` SHALL emit `HeatGenerated`, `HeatDissipated`, and (when crossing thresholds) `HeatEffectApplied` events for every unit every turn. The current implementation mutates `unit.heat` silently with no events emitted, leaving downstream consumers blind.

#### Scenario: Atlas alpha-strike at heat 0 produces shutdown event chain

- **GIVEN** an Atlas at heat 0 firing AC/20 + LRM-20 + 4× ML + SRM-6 (~30 heat)
- **WHEN** the heat phase resolves
- **THEN** `HeatGenerated { unitId, amount: ~30, breakdown: { weapons: ~30, movement: 0, terrain: 0 } }` MUST fire
- **AND** `HeatDissipated { unitId, amount: 20 }` (Atlas has 20 single heat sinks) MUST fire
- **AND** `HeatEffectApplied { unitId, threshold: 30, effect: 'shutdown' }` MUST fire
- **AND** `ShutdownCheck { unitId, automatic: true }` MUST fire

### Requirement: Ammo Consumption and Explosion Events

When a weapon fires, the runner SHALL emit `AmmoConsumed { unitId, ammoBinId, amount }` for each round expended. When a critical hit lands on a loaded ammo bin, `AmmoExplosion { unitId, ammoBinId, location, damage }` MUST emit before the cascade damage is applied to the bin's location. CASE / CASE-II rules MUST confine the explosion damage to the bin's location when present.

#### Scenario: AC/20 ammo cookoff from internal critical

- **GIVEN** an Atlas with AC/20 ammo bin in RT (no CASE)
- **AND** a seeded scenario where a critical hit lands on the ammo bin
- **WHEN** the runner processes the crit
- **THEN** `AmmoExplosion { ammoBinId: 'ac20-ammo', location: 'RT', damage: 200 }` MUST fire
- **AND** the resulting damage cascade MUST destroy RT and transfer to CT (no CASE)

#### Scenario: With CASE, ammo explosion stays in source location

- **GIVEN** the same Atlas but with CASE installed in RT
- **WHEN** the same crit fires
- **THEN** `AmmoExplosion` MUST emit
- **AND** RT MUST be destroyed
- **AND** no `TransferDamage` to CT — the explosion MUST be confined per CASE rules

## ADDED Requirements (test infrastructure)

### Requirement: Hit Location Resolution Determinism Test

A unit test SHALL exercise every 2d6 outcome (2-12) per firing arc (front, left, right, rear) against `determineHitLocation()` and assert the resulting location matches the canonical BattleTech Total Warfare hit-location table. MegaMek's `Mek.innerRollHitLocation` (`Mek.java:1976-2034`) is cited as the verification reference.

#### Scenario: Front arc roll 7 hits CT

- **GIVEN** a 2d6 roll of 7
- **AND** firing arc FRONT
- **WHEN** `determineHitLocation` is called
- **THEN** the returned location MUST be `CT`

#### Scenario: Front arc roll 12 hits HD

- **GIVEN** a 2d6 roll of 12
- **AND** firing arc FRONT
- **WHEN** `determineHitLocation` is called
- **THEN** the returned location MUST be `HD`

### Requirement: Monte Carlo Hit Rate Distribution Test

A test SHALL execute 10,000 seeded medium-laser attacks at short, medium, and long range against a stationary gunnery-4 target and assert the resulting hit% falls within ±2σ of the analytic 2d6 cumulative distribution function for target numbers 4 (short), 7 (medium), and 10 (long).

#### Scenario: Medium laser at short range hits ~91.67% ± 2σ

- **GIVEN** 10000 seeded ML attacks at range 1-3 (short, TN 4)
- **WHEN** the test runs
- **THEN** the observed hit rate MUST be within 91.67% ± (2 × √(0.9167 × 0.0833 / 10000)) ≈ 91.67% ± 0.55%
