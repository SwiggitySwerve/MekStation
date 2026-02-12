## ADDED Requirements

### Requirement: Real Weapon Data in Attack Resolution

Weapon attack resolution SHALL use actual weapon damage, heat, and range values from `IWeaponData` instead of hardcoded constants.

#### Scenario: Weapon damage from IWeaponData

- **WHEN** resolving a weapon attack
- **THEN** damage SHALL be read from the weapon's `IWeaponData.damage` field
- **AND** the hardcoded `damage = 5` SHALL NOT be used

#### Scenario: Weapon heat from IWeaponData

- **WHEN** resolving a weapon attack and calculating heat generated
- **THEN** heat SHALL be read from the weapon's `IWeaponData.heat` field
- **AND** the hardcoded `heat = 3` SHALL NOT be used

#### Scenario: Weapon range from IWeaponData

- **WHEN** determining range modifiers for an attack
- **THEN** range brackets SHALL be read from the weapon's `IWeaponData` short/medium/long range fields
- **AND** the hardcoded range brackets `(3, 6, 9)` SHALL NOT be used

### Requirement: Firing Arc Computed from Positions

Attack resolution SHALL compute the firing arc from the attacker's position relative to the target's facing, replacing the hardcoded `FiringArc.Front`.

#### Scenario: Firing arc computed dynamically

- **WHEN** resolving a weapon attack
- **THEN** the firing arc SHALL be computed using the firing-arc-calculation system
- **AND** the appropriate hit location table (front/left/right/rear) SHALL be selected based on the computed arc
- **AND** `FiringArc.Front` SHALL NOT be used as a default

### Requirement: Unified CombatResolver for Both Paths

Both the interactive game session and the simulation runner SHALL use the same `CombatResolver` module for weapon attack resolution.

#### Scenario: Interactive session uses CombatResolver

- **WHEN** a weapon attack is resolved in an interactive game session
- **THEN** the attack SHALL be processed through the unified `CombatResolver.resolveWeaponAttack()` function

#### Scenario: Simulation uses CombatResolver

- **WHEN** a weapon attack is resolved in a simulation run
- **THEN** the attack SHALL be processed through the same `CombatResolver.resolveWeaponAttack()` function
- **AND** both paths SHALL produce identical results for identical inputs

### Requirement: Injectable DiceRoller for All Randomness

All randomness in combat resolution SHALL flow through an injectable `DiceRoller` function for deterministic testing and replay.

#### Scenario: DiceRoller used for to-hit rolls

- **WHEN** rolling to-hit for a weapon attack
- **THEN** the injectable DiceRoller SHALL be used instead of `Math.random()`

#### Scenario: DiceRoller used for hit location

- **WHEN** determining hit location after a successful attack
- **THEN** the injectable DiceRoller SHALL be used for the 2d6 hit location roll

#### Scenario: DiceRoller used for critical hit determination

- **WHEN** checking for critical hits after damage application
- **THEN** the injectable DiceRoller SHALL be used for the 2d6 critical hit roll

#### Scenario: Seeded random produces deterministic results

- **WHEN** the same seed is provided to two identical attack resolutions
- **THEN** both resolutions SHALL produce identical outcomes

### Requirement: Physical Attack Phase Integration

The combat resolution system SHALL include a physical attack phase after weapon attacks and before heat resolution.

#### Scenario: Physical attack phase in turn sequence

- **WHEN** the weapon attack phase completes
- **THEN** the physical attack phase SHALL be activated
- **AND** physical attacks SHALL be resolved through `CombatResolver.resolvePhysicalAttack()`
- **AND** the heat phase SHALL follow after physical attacks complete

### Requirement: Fine-Grained Combat Events

Weapon attack resolution SHALL emit fine-grained events for each combat effect.

#### Scenario: Single weapon hit generates multiple events

- **WHEN** a weapon attack hits and causes a critical hit
- **THEN** the following events SHALL be emitted in order:
  1. `AttackResolved` (hit/miss, weapon data, target)
  2. `DamageApplied` (location, armor/structure changes)
  3. `CriticalHitRolled` (if structure exposed, slot selection, component hit)
  4. Additional cascade events as appropriate (AmmoExplosion, PilotHit, UnitDestroyed)
