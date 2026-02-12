## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Damage Resolution

Damage SHALL be resolved against armor then structure.

#### Scenario: Damage application with full transfer chain

- **WHEN** applying damage to a location
- **THEN** armor SHALL absorb damage first
- **AND** excess damage SHALL transfer to internal structure
- **AND** if internal structure is reduced to 0, the location SHALL be destroyed
- **AND** excess damage beyond structure SHALL transfer to the adjacent location per the damage transfer diagram
- **AND** pilot damage SHALL be assessed for head hits and accumulated damage

### Requirement: Through Armor Critical (TAC)

Roll of 2 on hit location SHALL trigger TAC check.

#### Scenario: TAC by attack direction

- **WHEN** hit location roll is 2
- **THEN** Front/Rear attack TAC location SHALL be CT
- **AND** Left side attack TAC location SHALL be LT
- **AND** Right side attack TAC location SHALL be RT
- **AND** a critical hit determination roll SHALL be made regardless of remaining armor
- **AND** if the roll indicates critical hits, they SHALL be applied via the critical-hit-resolution system

### Requirement: Cluster Hit Table

The system SHALL support cluster damage resolution per TechManual.

#### Scenario: Cluster hit determination with corrected values

- **WHEN** resolving cluster weapons (LRMs, SRMs, etc.)
- **THEN** 2d6 roll against cluster table determines hits
- **AND** hits SHALL vary by launcher size (2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20)
- **AND** cluster table values SHALL match MegaMek canonical values
- **AND** there SHALL be a single authoritative cluster table (no duplicates)

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
