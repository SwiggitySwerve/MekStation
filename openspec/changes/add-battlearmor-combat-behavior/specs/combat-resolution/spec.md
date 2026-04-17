# combat-resolution (delta)

## ADDED Requirements

### Requirement: BattleArmor Combat Dispatch

The combat resolution engine SHALL route BA targets to a BA-specific damage pipeline.

#### Scenario: BA target routing

- **GIVEN** an attack whose target has `unitType === UnitType.BATTLE_ARMOR`
- **WHEN** the engine resolves the hit
- **THEN** `battleArmorResolveDamage()` SHALL be invoked
- **AND** damage SHALL distribute across surviving troopers per the cluster-hits table

#### Scenario: No mech-style criticals on BA

- **GIVEN** damage applied to a BA squad
- **WHEN** critical-hit resolution runs
- **THEN** mech-style crit slot effects SHALL NOT be computed
- **AND** trooper death SHALL be the only structural consequence

### Requirement: Squad Damage Distribution

Damage to a BA squad SHALL distribute across surviving troopers one hit at a time.

#### Scenario: One hit kills one trooper

- **GIVEN** a BA squad with 4 troopers each having 5 armor
- **WHEN** a single 5-damage weapon hits the squad
- **THEN** exactly one random surviving trooper SHALL take 5 damage and be eliminated
- **AND** a `TrooperKilled` event SHALL fire

#### Scenario: Cluster weapon distributes per table

- **GIVEN** the same squad hit by an LRM-10 (10 missiles)
- **WHEN** damage is resolved
- **THEN** the cluster-hits table SHALL determine how many missiles hit
- **AND** each hit SHALL land on a random surviving trooper (seeded RNG)

#### Scenario: Squad eliminated

- **GIVEN** a BA squad with 1 surviving trooper on 2 armor
- **WHEN** 5 damage is dealt
- **THEN** the trooper SHALL die
- **AND** a `SquadEliminated` event SHALL fire
- **AND** the squad SHALL be removed from active play

### Requirement: Anti-Mech Leg Attack

BA in base contact with a mech SHALL be able to declare a Leg Attack during the physical-attack phase.

#### Scenario: Leg attack success

- **GIVEN** a BA squad adjacent to a mech with 4 surviving troopers
- **WHEN** Leg Attack is declared and the roll succeeds
- **THEN** the mech SHALL take `4 × 4 = 16` damage to the target leg
- **AND** the `LegAttack` event SHALL record success

#### Scenario: Leg attack failure

- **GIVEN** the same attack failing its roll
- **WHEN** failure effect is applied
- **THEN** the BA squad SHALL take 1d6 damage distributed across troopers

### Requirement: Anti-Mech Swarm Attack

BA with Magnetic Clamps SHALL be able to swarm an adjacent mech and deal damage each turn.

#### Scenario: Swarm attach

- **GIVEN** a clamped BA squad in base contact with a mech
- **WHEN** Swarm is declared and the roll succeeds
- **THEN** `swarmingUnitId` SHALL be set to the mech
- **AND** a `SwarmAttached` event SHALL fire

#### Scenario: Swarm damage per turn

- **GIVEN** a swarming BA squad with 3 surviving troopers
- **WHEN** a combat turn ends with the squad still swarming
- **THEN** the attached mech SHALL take `1d6 + 3 = 4-9` damage to a random location
- **AND** a `SwarmDamage` event SHALL fire

#### Scenario: Dismount attempt

- **GIVEN** a mech with a swarming BA squad
- **WHEN** the mech declares a dismount action with a successful Piloting roll
- **THEN** the BA squad SHALL take 2d6 damage
- **AND** the swarm SHALL end
- **AND** a `SwarmDismounted` event SHALL fire

### Requirement: Mimetic and Stealth Armor To-Hit Penalties

The system SHALL apply mimetic and stealth to-hit penalties to attackers targeting BA.

#### Scenario: Mimetic active

- **GIVEN** a BA squad that did not move this turn and is wearing Mimetic armor
- **WHEN** an attacker shoots at the squad
- **THEN** the attack's to-hit TN SHALL increase by 1

#### Scenario: Basic Stealth

- **GIVEN** a BA squad wearing Basic Stealth armor
- **WHEN** any attacker shoots at the squad
- **THEN** the to-hit TN SHALL increase by 1 at all ranges

#### Scenario: Improved Stealth with range

- **GIVEN** a BA squad wearing Improved Stealth armor
- **WHEN** an attacker shoots at long range
- **THEN** the to-hit TN SHALL increase by 3

## MODIFIED Requirements

### Requirement: Damage Distribution

The system SHALL distribute damage across units based on battle intensity and outcome.

#### Scenario: Victory results in light damage

- **GIVEN** a battle with outcome VICTORY and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 0-30% damage on average

#### Scenario: Defeat results in heavy damage

- **GIVEN** a battle with outcome DEFEAT and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 40-80% damage on average

#### Scenario: Draw results in moderate damage

- **GIVEN** a battle with outcome DRAW and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 20-50% damage on average

#### Scenario: Partial BA squad survival

- **GIVEN** a battle where a 4-trooper BA squad ends with 2 surviving troopers
- **WHEN** distributeDamage is called
- **THEN** the squad SHALL be counted at 50% strength for post-battle reporting
