# vehicle-unit-system Delta — fix-combat-damage-crit-parity

## ADDED Requirements

### Requirement: Vehicle Engine Critical Immobilizes (Not Destroys)

A vehicle engine critical hit SHALL immobilize the vehicle rather than deterministically destroy
it. Engine hits SHALL increment the engine-hit counter and force the vehicle immobilized
(effective cruise/flank MP zero); a second engine hit SHALL NOT set `destroyed`. Deterministic
destruction on engine hit is removed — the MegaMek optional fusion-explosion destruction rule is
out of scope and SHALL NOT be applied as a guaranteed outcome.

#### Scenario: Second engine hit immobilizes but does not destroy

- **GIVEN** a combat vehicle that has already taken one engine critical hit
- **WHEN** the vehicle takes a second engine critical hit
- **THEN** `motive.engineHits` SHALL increment to 2
- **AND** the vehicle SHALL be immobilized (effective cruise and flank MP SHALL be 0)
- **AND** the vehicle SHALL NOT be flagged `destroyed` and SHALL NOT report
  `destructionCause: 'engine_destroyed'` from the engine-hit path alone

#### Scenario: First engine hit immobilizes

- **GIVEN** an undamaged combat vehicle
- **WHEN** the vehicle takes its first engine critical hit
- **THEN** `motive.engineHits` SHALL be 1
- **AND** the vehicle SHALL be immobilized

### Requirement: Motive Damage Roll Modifiers by Motion Type

Vehicle motive damage SHALL apply a flat per-motion-type modifier to the motive-damage 2d6 roll
(matching MegaMek), rather than escalating a "heavy" severity result directly to immobilized for
specific motion types. The resulting motive severity SHALL be derived from the modified roll on
the motive-damage table.

#### Scenario: Motion-type modifier feeds the motive roll

- **GIVEN** a hover vehicle (motive-roll modifier +3) and a wheeled vehicle (modifier +2)
- **WHEN** a motive-damage roll is resolved for each
- **THEN** each vehicle's motive-damage 2d6 roll SHALL be adjusted by its motion-type modifier
  before the motive-damage table is consulted
- **AND** the resulting severity SHALL be the table outcome of the modified roll, NOT a
  `heavy → immobilized` shortcut keyed on motion type

#### Scenario: Tracked vehicle takes the unmodified table outcome

- **GIVEN** a tracked vehicle (motive-roll modifier +0)
- **WHEN** a motive-damage roll is resolved
- **THEN** the motive severity SHALL be the unmodified table outcome of the roll

### Requirement: Single-Source Vehicle Crew Critical Effects

Vehicle crew critical effects (driver and commander hits) SHALL be resolved through a single
authoritative crew-crit escalation shared with the production vehicle-crit table layer, so the
BA-leg-attack-reachable helper and the table layer cannot diverge. The non-CASE ammo explosion
crew-wound value SHALL be 2 (per `ammo-explosion-system`), consistent across all vehicle and mech
crit paths.

#### Scenario: Driver/commander helper matches the table layer

- **GIVEN** a vehicle receives a driver or commander critical hit via the BA-leg-attack helper
- **WHEN** the crew-crit effect is resolved
- **THEN** the resulting crew state SHALL equal the state produced by the production
  vehicle-crit table layer for the same hit
- **AND** a commander hit SHALL still apply its crew-stun side effect

#### Scenario: Unprotected vehicle ammo explosion inflicts two crew wounds

- **GIVEN** an ammo bin explodes in a vehicle location without CASE
- **WHEN** crew damage is assessed
- **THEN** the crew SHALL take 2 wounds (not 1), consistent with the mech non-CASE explosion rule
