# damage-system (delta)

## ADDED Requirements

### Requirement: resolveDamage Called From Attack Path

When an attack hits, the engine SHALL call `resolveDamage()` from `src/utils/gameplay/damage.ts` to apply damage through the full armor → structure → transfer → pilot pipeline. The engine SHALL NOT apply damage directly or via `applySimpleDamage`.

#### Scenario: Attack hit invokes resolveDamage

- **GIVEN** an attack that hits
- **WHEN** the attack resolver processes the hit
- **THEN** `resolveDamage` SHALL be invoked with damage, hitLocation, arc, attackerState, targetState, and the seeded RNG
- **AND** the returned `ILocationDamageResult` SHALL be translated into events

#### Scenario: SimulationRunner uses resolveDamage

- **GIVEN** an autonomous simulation match
- **WHEN** an attack hits during the simulation
- **THEN** `resolveDamage` SHALL be used (not `applySimpleDamage`)

### Requirement: Full Damage Transfer Chain

Damage SHALL cascade armor → structure → adjacent location per the canonical transfer diagram.

#### Scenario: Damage exceeds armor transfers to structure

- **GIVEN** a location with 10 armor and 8 structure
- **WHEN** 15 damage is applied
- **THEN** armor SHALL be reduced to 0
- **AND** 5 damage SHALL apply to structure
- **AND** structure SHALL become 3

#### Scenario: Damage exceeds structure transfers to adjacent

- **GIVEN** damage exceeds both armor and structure at a location
- **WHEN** the transfer step runs
- **THEN** the location SHALL be marked destroyed
- **AND** excess damage SHALL transfer per the diagram (arm → side torso; leg → side torso; side torso → center torso; center torso destruction destroys the unit)
- **AND** transferred damage SHALL apply to the adjacent location's armor first

### Requirement: Side Torso Destruction Cascades to Arm

When a side torso is destroyed, the arm on that side SHALL also be destroyed.

#### Scenario: Left torso destroyed destroys left arm

- **GIVEN** the left torso reaches structure 0
- **WHEN** destruction is processed
- **THEN** the left arm SHALL be marked destroyed
- **AND** all equipment in the left arm SHALL be marked destroyed
- **AND** a `LocationDestroyed` event SHALL be emitted for LA

#### Scenario: Right torso cascade

- **GIVEN** the right torso reaches structure 0
- **WHEN** destruction is processed
- **THEN** the right arm SHALL also be destroyed

### Requirement: Head Damage Cap

A single standard-weapon hit to the head SHALL deal a maximum of 3 damage, with excess discarded (not transferred).

#### Scenario: AC/20 to head caps at 3

- **GIVEN** an AC/20 (20 damage) hits the head
- **WHEN** head damage is applied
- **THEN** only 3 damage SHALL be applied to the head
- **AND** the remaining 17 damage SHALL be discarded

#### Scenario: Cluster hits cap per group

- **GIVEN** an LRM volley producing multiple head hits
- **WHEN** each cluster group is applied
- **THEN** each group SHALL be independently capped at 3

### Requirement: 20+ Phase Damage Queues PSR

When a unit's accumulated damage in a single phase reaches 20 or more, a PSR SHALL be queued with trigger `TwentyPlusPhaseDamage`.

#### Scenario: Accumulate 22 damage in weapon phase

- **GIVEN** a unit takes 22 damage during the weapon attack phase
- **WHEN** the 20-point boundary is crossed
- **THEN** a PSR SHALL be queued with trigger `TwentyPlusPhaseDamage`
- **AND** `damageThisPhase` SHALL reflect 22

#### Scenario: Under 20 damage does not queue

- **GIVEN** a unit takes 18 damage during the phase
- **WHEN** the phase ends
- **THEN** no `TwentyPlusPhaseDamage` PSR SHALL be queued

### Requirement: Pilot Damage From Head Structure Hits

Damage that reaches head internal structure SHALL inflict 1 point of pilot damage and queue a consciousness check.

#### Scenario: Head structure exposed

- **GIVEN** an attack that damages head structure (armor breached)
- **WHEN** the damage is applied
- **THEN** the pilot SHALL take 1 damage
- **AND** a `PilotHit` event SHALL be emitted
- **AND** a consciousness check SHALL be queued
