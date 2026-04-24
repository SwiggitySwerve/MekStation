# damage-system Specification

## Purpose

TBD - created by archiving change implement-phase4-validation. Update Purpose after archive.
## Requirements
### Requirement: Damage Types

The system SHALL support multiple damage types.

#### Scenario: Damage classification

- **WHEN** resolving damage
- **THEN** damage type SHALL be Standard, Cluster, Pulse, Streak, Explosive, Heat, or Special
- **AND** damage resolution SHALL vary by type

### Requirement: Hit Location Tables

The system SHALL support direction-based hit location tables per TechManual p.109.

#### Scenario: Front attack hit location (2d6)

- **WHEN** attacking from front arc
- **THEN** roll 2=CT(TAC), 3-4=RA, 5=RL, 6=RT, 7=CT, 8=LT, 9=LL, 10-11=LA, 12=Head
- **AND** the arc SHALL be computed from attacker position and target facing (not hardcoded)

#### Scenario: Injectable randomness for hit location

- **WHEN** determining hit location
- **THEN** the hit location roll SHALL use the injectable DiceRoller
- **AND** `Math.random()` SHALL NOT be used

### Requirement: Through Armor Critical (TAC)

Roll of 2 on hit location SHALL trigger TAC check.

#### Scenario: TAC by attack direction

- **WHEN** hit location roll is 2
- **THEN** Front/Rear attack TAC location SHALL be CT
- **AND** Left side attack TAC location SHALL be LT
- **AND** Right side attack TAC location SHALL be RT
- **AND** a critical hit determination roll SHALL be made regardless of remaining armor
- **AND** if the roll indicates critical hits, they SHALL be applied via the critical-hit-resolution system

### Requirement: Attack Direction Determination

The system SHALL determine attack direction from hex positions.

#### Scenario: Direction calculation

- **WHEN** calculating attack arc
- **THEN** relative direction from target's facing SHALL determine table
- **AND** 0,1,5 = Front, 2 = Right, 3 = Rear, 4 = Left

### Requirement: Cluster Hit Table

The system SHALL support cluster damage resolution per TechManual.

#### Scenario: Cluster hit determination with corrected values

- **WHEN** resolving cluster weapons (LRMs, SRMs, etc.)
- **THEN** 2d6 roll against cluster table determines hits
- **AND** hits SHALL vary by launcher size (2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20)
- **AND** cluster table values SHALL match MegaMek canonical values
- **AND** there SHALL be a single authoritative cluster table (no duplicates)

### Requirement: Damage Resolution

Damage SHALL be resolved against armor then structure.

#### Scenario: Damage application with full transfer chain

- **WHEN** applying damage to a location
- **THEN** armor SHALL absorb damage first
- **AND** excess damage SHALL transfer to internal structure
- **AND** if internal structure is reduced to 0, the location SHALL be destroyed
- **AND** excess damage beyond structure SHALL transfer to the adjacent location per the damage transfer diagram
- **AND** pilot damage SHALL be assessed for head hits and accumulated damage

### Requirement: Full Damage Transfer Chain

The damage system SHALL implement the complete armor → internal structure → transfer → pilot damage pipeline.

#### Scenario: Damage exceeds armor, transfers to structure

- **WHEN** 15 points of damage are applied to a location with 10 armor and 8 structure
- **THEN** armor SHALL be reduced to 0
- **AND** 5 remaining damage SHALL be applied to internal structure
- **AND** internal structure SHALL be reduced to 3

#### Scenario: Damage exceeds structure, transfers to adjacent location

- **WHEN** damage exceeds both armor and internal structure at a location
- **THEN** the location SHALL be destroyed
- **AND** excess damage SHALL transfer to the adjacent location per the transfer diagram:
  - Arms transfer to their respective side torso
  - Legs transfer to their respective side torso
  - Side torsos transfer to center torso
  - Center torso destruction destroys the unit

#### Scenario: Transfer damage applies to adjacent location armor first

- **WHEN** 20 points of damage transfer from a destroyed arm to the side torso
- **THEN** damage SHALL apply to the side torso's remaining armor first
- **AND** excess SHALL apply to side torso structure
- **AND** further excess SHALL transfer to center torso

### Requirement: Side Torso Destruction Cascades to Arm

When a side torso is destroyed, the arm on that side SHALL also be destroyed.

#### Scenario: Left torso destroyed cascades to left arm

- **WHEN** the left torso is destroyed (structure reduced to 0)
- **THEN** the left arm SHALL also be destroyed
- **AND** all equipment in the left arm SHALL be marked as destroyed

#### Scenario: Right torso destroyed cascades to right arm

- **WHEN** the right torso is destroyed
- **THEN** the right arm SHALL also be destroyed

### Requirement: Head Damage Cap Rule

A single standard weapon hit to the head SHALL deal a maximum of 3 damage to the head, with excess damage discarded.

#### Scenario: AC/20 hits head with standard rules

- **WHEN** a standard weapon dealing 20 damage hits the head
- **THEN** only 3 points of damage SHALL be applied to the head
- **AND** the remaining 17 damage SHALL be discarded (not transferred)

#### Scenario: Cluster weapons bypass head cap

- **WHEN** cluster weapon damage hits the head (each cluster is a separate group)
- **THEN** each cluster group SHALL be capped at 3 independently

### Requirement: 20+ Phase Damage Triggers PSR

When a unit takes 20 or more total damage in a single phase, a piloting skill roll SHALL be triggered.

#### Scenario: Accumulate 20+ damage triggers PSR

- **WHEN** a unit takes 22 points of total damage during the weapon attack phase
- **THEN** a PSR SHALL be queued with the trigger "20+ phase damage"
- **AND** the damageThisPhase counter SHALL track cumulative damage per phase

#### Scenario: Under 20 damage does not trigger PSR

- **WHEN** a unit takes 18 points of total damage during the weapon attack phase
- **THEN** no 20+ damage PSR SHALL be triggered

### Requirement: Connect damage.ts to Game Engine

The existing `damage.ts` `resolveDamage()` pipeline SHALL be connected to the game engine's attack resolution, replacing the current simplified damage application.

#### Scenario: Game engine uses resolveDamage()

- **WHEN** a weapon attack hits in the game engine
- **THEN** `resolveDamage()` from `damage.ts` SHALL be called to process the damage
- **AND** the returned `ILocationDamageResult` SHALL be used to emit `DamageApplied` events

#### Scenario: Simulation runner uses resolveDamage()

- **WHEN** a weapon attack hits in the simulation runner
- **THEN** `resolveDamage()` SHALL be used instead of `applySimpleDamage()`

### Requirement: Pilot Damage from Head Hits

When the head location takes damage that reaches internal structure, the pilot SHALL take 1 point of damage.

#### Scenario: Head structure damage causes pilot hit

- **WHEN** damage to the head location penetrates armor and reaches internal structure
- **THEN** the pilot SHALL take 1 point of damage
- **AND** a consciousness check SHALL be required
- **AND** a PilotHit event SHALL be emitted

### Requirement: Damage Value Flows From Weapon Catalog

The damage applied by the damage pipeline SHALL be the value sourced from the fired weapon's `IWeaponData.damage` field, not a placeholder constant.

#### Scenario: Attack event carries real damage

- **GIVEN** an AC/10 fires and hits
- **WHEN** the damage pipeline receives the hit
- **THEN** the damage amount entering the pipeline SHALL be 10

#### Scenario: Small Laser does 3 damage

- **GIVEN** a Small Laser fires and hits
- **WHEN** the damage pipeline receives the hit
- **THEN** the damage amount entering the pipeline SHALL be 3

#### Scenario: Test placeholder removed from production path

- **GIVEN** the production attack-resolution code path
- **WHEN** the path is statically searched for `damage: 5`
- **THEN** no occurrences SHALL remain outside of explicit test fixtures

### Requirement: Structured Damage Events For UI Feedback

The damage system SHALL emit structured `DamageApplied`, `CriticalHit`,
`PilotHit`, and `ConsciousnessRoll` events containing enough detail for
the UI to render pip decay, crit bursts, log entries, and pilot wound
flashes without additional queries.

#### Scenario: DamageApplied carries location, amount, source, transfer chain

- **GIVEN** a weapon attack that hits the Right Arm for 8 damage (5
  absorbed by armor, 3 transferred to structure)
- **WHEN** the damage pipeline resolves
- **THEN** a `DamageApplied` event SHALL be appended containing
  `{targetId, location: "RA", armorDamage: 5, structureDamage: 3,
sourceWeaponId, transferChain: []}`

#### Scenario: Transfer chain populated for overflow damage

- **GIVEN** 15 damage applied to a destroyed Right Arm (0 armor, 0
  structure), overflow transferring to Right Torso
- **WHEN** the damage pipeline resolves
- **THEN** a `DamageApplied` event SHALL be appended whose
  `transferChain` contains `[{from: "RA", to: "RT", overflow: 15}]`

#### Scenario: CriticalHit event emitted on critical resolution

- **GIVEN** a `resolveCriticalHit` call that destroys a Medium Laser
- **WHEN** the critical is applied
- **THEN** a `CriticalHit` event SHALL be appended with
  `{targetId, location, slotIndex, equipmentId, effect: "destroyed"}`

#### Scenario: ConsciousnessRoll event emitted whenever a roll fires

- **GIVEN** a pilot with 1 hit receives a second pilot hit that triggers
  a consciousness check
- **WHEN** the check runs
- **THEN** a `ConsciousnessRoll` event SHALL be appended with
  `{pilotId, wounds, targetNumber, roll, passed}`
- **AND** if `passed = false`, a `PilotHit` event SHALL follow with
  `{pilotId, consciousnessState: "unconscious"}`

### Requirement: Damage Event Ordering and Batching

The damage system SHALL emit damage events in canonical order so the UI
can animate them sequentially: armor decay → structure damage → transfer
→ critical → pilot hit → consciousness roll.

#### Scenario: Events ordered within one attack resolution

- **GIVEN** an attack that damages armor, transfers into structure,
  triggers a crit, and causes a pilot hit via head damage
- **WHEN** the attack resolves
- **THEN** events SHALL be appended in the order `DamageApplied`
  (armor portion), `DamageApplied` (structure portion), `CriticalHit`,
  `PilotHit`, `ConsciousnessRoll`
- **AND** each event's `sequence` SHALL be strictly increasing

#### Scenario: Cluster attacks batched under parent declaration

- **GIVEN** a cluster weapon that produces 4 hits
- **WHEN** each hit resolves
- **THEN** each `DamageApplied` event SHALL reference the same
  `parentDeclarationId`
- **AND** the UI SHALL use that id to group entries in the event log

### Requirement: Expected Damage Helper

The damage system SHALL expose `expectedDamage(weapon: IWeapon,
hitProbability: number): number` that returns the statistical mean
damage for a weapon given its hit probability, with cluster weapons
integrating the cluster hit table expectation.

#### Scenario: Single-shot weapon expected damage

- **GIVEN** a Medium Laser (single-shot, 5 damage) and
  `hitProbability = 0.72`
- **WHEN** `expectedDamage(weapon, 0.72)` is called
- **THEN** the result SHALL equal 3.6 (= 0.72 × 5)

#### Scenario: Cluster weapon expected damage

- **GIVEN** an LRM-10 (1 damage per missile, 10-rack) and
  `hitProbability = 0.5`
- **WHEN** `expectedDamage(weapon, 0.5)` is called
- **THEN** the result SHALL equal 3.07 (= 0.5 × 6.14 × 1) within ±0.01
- **AND** the expected cluster hits SHALL be 6.14 (standard 10-rack
  cluster table expectation)

#### Scenario: Streak weapon all-or-nothing

- **GIVEN** a Streak SRM-4 (2 damage per missile, 4-rack) and
  `hitProbability = 0.6`
- **WHEN** `expectedDamage(weapon, 0.6)` is called
- **THEN** the result SHALL equal 4.8 (= 0.6 × 4 × 2, Streak fires all
  missiles on a successful lock-on)

#### Scenario: Zero hit probability yields zero damage

- **GIVEN** any weapon with `hitProbability = 0`
- **WHEN** `expectedDamage(weapon, 0)` is called
- **THEN** the result SHALL equal 0

#### Scenario: One-shot weapon respects remaining shots

- **GIVEN** a one-shot SRM-2 launcher that has already fired
- **WHEN** `expectedDamage(weapon, 0.5)` is called
- **THEN** the result SHALL equal 0 (no remaining shots)

### Requirement: Damage Variance Helper

The damage system SHALL expose `damageVariance(weapon: IWeapon,
hitProbability: number): number` that returns the standard deviation
(not raw variance) of damage so that the UI can display `±stddev`
directly without additional math.

#### Scenario: Single-shot weapon stddev

- **GIVEN** a Medium Laser (5 damage) with `hitProbability = 0.5`
- **WHEN** `damageVariance(weapon, 0.5)` is called
- **THEN** the result SHALL equal 2.5 (= sqrt(0.5 × 0.5) × 5)

#### Scenario: Stddev clamps to zero at extreme probabilities

- **GIVEN** a Medium Laser with `hitProbability = 1.0`
- **WHEN** `damageVariance(weapon, 1.0)` is called
- **THEN** the result SHALL equal 0 (certain hit, no variance)

- **GIVEN** the same weapon with `hitProbability = 0.0`
- **WHEN** `damageVariance(weapon, 0.0)` is called
- **THEN** the result SHALL equal 0 (certain miss, no variance)

#### Scenario: Cluster weapon stddev includes cluster distribution

- **GIVEN** an LRM-10 with `hitProbability = 0.5`
- **WHEN** `damageVariance(weapon, 0.5)` is called
- **THEN** the result SHALL combine the Bernoulli hit variance with
  the cluster table variance (formula documented in implementation)
- **AND** the result SHALL be strictly greater than the non-cluster
  variance for the same expected damage

### Requirement: Cluster Hit Table Expectations

The damage system SHALL pre-compute and cache
`expectedClusterHits[rackSize]` for each cluster rack size (2, 3, 4, 5,
6, 7, 8, 9, 10, 12, 15, 20) as the dot product of the 2d6 probability
mass and the cluster table row, avoiding re-computation during UI
interaction.

#### Scenario: Expected hits for 10-missile rack

- **GIVEN** the standard TechManual cluster table
- **WHEN** `expectedClusterHits[10]` is read
- **THEN** the result SHALL equal 6.14 within ±0.01

#### Scenario: Expected hits for 2-missile rack

- **GIVEN** the standard TechManual cluster table
- **WHEN** `expectedClusterHits[2]` is read
- **THEN** the result SHALL equal 1.42 within ±0.01

#### Scenario: Constant cached after first access

- **GIVEN** `expectedClusterHits` has been accessed once
- **WHEN** the same index is accessed 1000 more times
- **THEN** the underlying computation SHALL run exactly once (cached
  module-level constant)

