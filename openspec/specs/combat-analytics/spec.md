# Combat Analytics Specification

## Purpose

The Combat Analytics system provides post-battle statistical analysis and performance metrics for units engaged in combat. It aggregates game events into three complementary views: a damage matrix showing damage dealt and received between units, kill credit tracking for determining unit destruction attribution, and individual unit performance summaries combining damage, kills, and survival status. These analytics enable players to review battle outcomes, analyze unit effectiveness, and track pilot performance across campaigns.

## Requirements

### Requirement: Damage Matrix Projection

The system SHALL project a complete damage matrix from game events, tracking damage dealt and received between all units.

#### Scenario: Damage matrix with single attacker and target

- **GIVEN** events containing a DamageApplied event where unit "mech-1" deals 15 damage to "mech-2"
- **WHEN** `projectDamageMatrix` is called
- **THEN** the matrix SHALL contain an entry for "mech-1" → "mech-2" with value 15
- **AND** totalDealt for "mech-1" SHALL be 15
- **AND** totalReceived for "mech-2" SHALL be 15

#### Scenario: Damage matrix accumulates multiple attacks

- **GIVEN** events containing three DamageApplied events: "mech-1" → "mech-2" (10 damage), "mech-1" → "mech-2" (5 damage), "mech-1" → "mech-2" (8 damage)
- **WHEN** `projectDamageMatrix` is called
- **THEN** the matrix entry for "mech-1" → "mech-2" SHALL be 23
- **AND** totalDealt for "mech-1" SHALL be 23
- **AND** totalReceived for "mech-2" SHALL be 23

#### Scenario: Damage matrix handles multiple attackers and targets

- **GIVEN** events containing: "mech-1" → "mech-2" (10), "mech-1" → "mech-3" (8), "mech-2" → "mech-1" (12), "mech-3" → "mech-1" (5)
- **WHEN** `projectDamageMatrix` is called
- **THEN** totalDealt for "mech-1" SHALL be 18
- **AND** totalDealt for "mech-2" SHALL be 12
- **AND** totalDealt for "mech-3" SHALL be 5
- **AND** totalReceived for "mech-1" SHALL be 17
- **AND** totalReceived for "mech-2" SHALL be 10
- **AND** totalReceived for "mech-3" SHALL be 8

#### Scenario: Damage matrix handles self/environment damage

- **GIVEN** events containing a DamageApplied event with sourceUnitId=null (self/environment damage) dealing 6 damage to "mech-1"
- **WHEN** `projectDamageMatrix` is called
- **THEN** the matrix SHALL contain an entry for "Self/Environment" → "mech-1" with value 6
- **AND** totalDealt for "Self/Environment" SHALL be 6
- **AND** totalReceived for "mech-1" SHALL be 6

#### Scenario: Damage matrix ignores non-DamageApplied events

- **GIVEN** events containing DamageApplied, UnitDestroyed, and other event types
- **WHEN** `projectDamageMatrix` is called
- **THEN** only DamageApplied events SHALL be processed
- **AND** the matrix SHALL not contain entries for non-damage events

#### Scenario: Damage matrix returns immutable structures

- **GIVEN** a damage matrix returned from `projectDamageMatrix`
- **WHEN** attempting to modify the matrix, totalDealt, or totalReceived maps
- **THEN** the operation SHALL fail (ReadonlyMap prevents mutation)
- **AND** the original matrix data SHALL remain unchanged

### Requirement: Kill Credit Tracking

The system SHALL track unit destruction events and attribute kill credits to responsible units.

#### Scenario: Kill credit with identified killer

- **GIVEN** events containing a UnitDestroyed event where "mech-1" kills "mech-2" on turn 5
- **WHEN** `projectKillCredits` is called
- **THEN** the credits array SHALL contain an entry with killerId="mech-1", victimId="mech-2", turn=5

#### Scenario: Kill credit with environment kill

- **GIVEN** events containing a UnitDestroyed event where killerUnitId=undefined (environment kill) destroys "mech-3" on turn 8
- **WHEN** `projectKillCredits` is called
- **THEN** the credits array SHALL contain an entry with killerId=undefined, victimId="mech-3", turn=8

#### Scenario: Kill credits accumulate multiple destructions

- **GIVEN** events containing three UnitDestroyed events: "mech-1" kills "mech-2" (turn 3), "mech-1" kills "mech-3" (turn 5), "mech-2" kills "mech-4" (turn 6)
- **WHEN** `projectKillCredits` is called
- **THEN** the credits array SHALL have length 3
- **AND** credits[0] SHALL have killerId="mech-1", victimId="mech-2", turn=3
- **AND** credits[1] SHALL have killerId="mech-1", victimId="mech-3", turn=5
- **AND** credits[2] SHALL have killerId="mech-2", victimId="mech-4", turn=6

#### Scenario: Kill credits ignores non-UnitDestroyed events

- **GIVEN** events containing UnitDestroyed, DamageApplied, and other event types
- **WHEN** `projectKillCredits` is called
- **THEN** only UnitDestroyed events SHALL be processed
- **AND** the credits array SHALL not contain entries for non-destruction events

#### Scenario: Kill credits returns immutable array

- **GIVEN** kill credits returned from `projectKillCredits`
- **WHEN** attempting to modify the returned array
- **THEN** the operation SHALL fail (readonly array prevents mutation)
- **AND** the original credits data SHALL remain unchanged

### Requirement: Unit Performance Aggregation

The system SHALL aggregate combat statistics for a specific unit, combining damage dealt, damage received, kills, and survival status.

#### Scenario: Unit performance with damage dealt only

- **GIVEN** events containing a DamageApplied event where "mech-1" deals 25 damage to "mech-2"
- **WHEN** `projectUnitPerformance` is called with unitId="mech-1"
- **THEN** the performance object SHALL have damageDealt=25, damageReceived=0, kills=0, survived=true

#### Scenario: Unit performance with damage received only

- **GIVEN** events containing a DamageApplied event where "mech-2" deals 18 damage to "mech-1"
- **WHEN** `projectUnitPerformance` is called with unitId="mech-1"
- **THEN** the performance object SHALL have damageDealt=0, damageReceived=18, kills=0, survived=true

#### Scenario: Unit performance with kills

- **GIVEN** events containing two UnitDestroyed events where "mech-1" kills "mech-2" and "mech-3"
- **WHEN** `projectUnitPerformance` is called with unitId="mech-1"
- **THEN** the performance object SHALL have kills=2, survived=true

#### Scenario: Unit performance with unit destroyed

- **GIVEN** events containing a UnitDestroyed event where "mech-1" is destroyed
- **WHEN** `projectUnitPerformance` is called with unitId="mech-1"
- **THEN** the performance object SHALL have survived=false

#### Scenario: Unit performance aggregates all metrics

- **GIVEN** events containing: "mech-1" deals 30 damage, receives 22 damage, kills 2 units, and is destroyed on turn 7
- **WHEN** `projectUnitPerformance` is called with unitId="mech-1"
- **THEN** the performance object SHALL have damageDealt=30, damageReceived=22, kills=2, survived=false, unitId="mech-1"

#### Scenario: Unit performance with no events

- **GIVEN** events containing no DamageApplied or UnitDestroyed events for "mech-1"
- **WHEN** `projectUnitPerformance` is called with unitId="mech-1"
- **THEN** the performance object SHALL have damageDealt=0, damageReceived=0, kills=0, survived=true, unitId="mech-1"

#### Scenario: Unit performance ignores other units' events

- **GIVEN** events containing damage between "mech-2" and "mech-3" (not involving "mech-1")
- **WHEN** `projectUnitPerformance` is called with unitId="mech-1"
- **THEN** the performance object SHALL have damageDealt=0, damageReceived=0, kills=0, survived=true

### Requirement: Event Payload Extraction

The system SHALL use type-safe event payload extractors from the game-event-system to safely extract damage and destruction data.

#### Scenario: Damage matrix uses getDamageAppliedPayload

- **GIVEN** events containing DamageApplied events with valid payloads
- **WHEN** `projectDamageMatrix` is called
- **THEN** it SHALL invoke `getDamageAppliedPayload` for each DamageApplied event
- **AND** it SHALL skip events where `getDamageAppliedPayload` returns null

#### Scenario: Kill credits uses getUnitDestroyedPayload

- **GIVEN** events containing UnitDestroyed events with valid payloads
- **WHEN** `projectKillCredits` is called
- **THEN** it SHALL invoke `getUnitDestroyedPayload` for each UnitDestroyed event
- **AND** it SHALL skip events where `getUnitDestroyedPayload` returns null

#### Scenario: Unit performance uses both payload extractors

- **GIVEN** events containing both DamageApplied and UnitDestroyed events
- **WHEN** `projectUnitPerformance` is called
- **THEN** it SHALL use `getDamageAppliedPayload` for damage events
- **AND** it SHALL use `getUnitDestroyedPayload` for destruction events
- **AND** it SHALL handle null payloads gracefully

## Dependencies

### Depends On

- **game-event-system**: Provides `IGameEvent`, `GameEventType` enum, and event type definitions
- **event-payloads**: Provides `getDamageAppliedPayload` and `getUnitDestroyedPayload` extractors

### Used By

- **Battle Replay System**: Reviews unit performance and damage dealt/received
- **Campaign Tracking**: Aggregates unit statistics across multiple battles
- **Pilot Experience System**: Tracks kills and survival for pilot advancement
- **Battle Statistics UI**: Displays post-battle analytics and performance metrics
