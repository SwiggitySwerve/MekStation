# simulation-system Specification

## Purpose

TBD - created by archiving change full-combat-parity. Update Purpose after archive.

## Requirements

### Requirement: Replace applySimpleDamage with Full CombatResolver Pipeline

The simulation runner SHALL replace its simplified damage application (`applySimpleDamage()`) with the full `CombatResolver` pipeline used by the interactive game engine.

#### Scenario: Simulation uses CombatResolver for weapon attacks

- **WHEN** the simulation runner resolves a weapon attack
- **THEN** it SHALL call `CombatResolver.resolveWeaponAttack()` instead of `applySimpleDamage()`
- **AND** the full damage pipeline (armor → structure → transfer → critical → cascade) SHALL be executed

#### Scenario: Simulation damage matches interactive damage

- **WHEN** identical attack scenarios are processed by both the simulation runner and the interactive game engine
- **THEN** the damage results SHALL be identical for the same random seed
- **AND** both paths SHALL produce the same event sequence

#### Scenario: Simulation applies all damage events

- **WHEN** the CombatResolver returns events from a weapon attack
- **THEN** the simulation SHALL apply all returned events (DamageApplied, CriticalHitRolled, AmmoExplosion, PilotHit, UnitDestroyed)
- **AND** the simulation state SHALL be updated accordingly

### Requirement: Physical Attack AI Decisions

The simulation runner SHALL include AI logic for deciding and executing physical attacks during the physical attack phase.

#### Scenario: AI considers physical attacks

- **WHEN** the physical attack phase begins in a simulation
- **THEN** the AI SHALL evaluate whether to punch, kick, charge, DFA, or push
- **AND** the decision SHALL be based on to-hit probability, potential damage, and risk (PSR consequences)

#### Scenario: AI executes physical attack

- **WHEN** the AI decides to perform a physical attack
- **THEN** the attack SHALL be resolved through `CombatResolver.resolvePhysicalAttack()`
- **AND** all resulting events SHALL be applied to the simulation state

#### Scenario: AI respects physical attack restrictions

- **WHEN** the AI evaluates physical attacks
- **THEN** the AI SHALL NOT attempt punches with arms that fired weapons
- **AND** the AI SHALL NOT attempt kicks with legs that have destroyed hip actuators

### Requirement: PSR Resolution in Simulation

The simulation runner SHALL resolve all piloting skill rolls that are triggered during the simulation.

#### Scenario: PSR resolved during simulation turn

- **WHEN** a PSR is triggered (20+ damage, critical hit, physical attack, terrain, etc.)
- **THEN** the simulation SHALL resolve the PSR using the piloting-skill-rolls system
- **AND** if the PSR fails, the fall-mechanics system SHALL be invoked

#### Scenario: Multiple PSRs in a phase

- **WHEN** multiple PSRs are queued in a single simulation phase
- **THEN** they SHALL be resolved in order
- **AND** the first failure SHALL cause a fall and clear remaining PSRs

### Requirement: SeededRandom for All Combat Randomness

All combat randomness in the simulation SHALL flow through SeededRandom to ensure reproducibility.

#### Scenario: Simulation uses SeededRandom for combat rolls

- **WHEN** the simulation resolves attacks, critical hits, PSRs, and other random events
- **THEN** all dice rolls SHALL use SeededRandom (or injectable DiceRoller backed by SeededRandom)
- **AND** the same seed SHALL produce identical simulation results

#### Scenario: Seed reported for reproduction

- **WHEN** a simulation completes or fails
- **THEN** the seed used SHALL be included in the simulation result
- **AND** re-running with the same seed SHALL reproduce the exact same outcome

### Requirement: Turn Loop Phase Expansion

The simulation turn loop SHALL include the physical attack phase in its phase sequence.

#### Scenario: Physical attack phase in simulation turn loop

- **WHEN** executing a simulation turn
- **THEN** phases SHALL execute in order: Initiative → Movement → WeaponAttack → PhysicalAttack → Heat → End
- **AND** the PhysicalAttack phase SHALL be processed between WeaponAttack and Heat

### Requirement: Victory Condition Checks with New Combat Effects

The simulation SHALL check for victory conditions that account for new combat effects.

#### Scenario: Unit destroyed by critical hit cascade

- **WHEN** a unit is destroyed by an engine critical hit cascade or ammo explosion during simulation
- **THEN** the simulation SHALL detect the unit's destruction
- **AND** victory conditions SHALL be checked

#### Scenario: Pilot killed ends unit participation

- **WHEN** a pilot is killed by cockpit hit or consciousness failure during simulation
- **THEN** the unit SHALL be marked as inoperable
- **AND** victory conditions SHALL be checked
