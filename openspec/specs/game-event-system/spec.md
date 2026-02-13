# Game Event System Specification

## Purpose

The Game Event System provides the event-sourcing foundation for all BattleTech gameplay mechanics. It defines 20+ event factory functions that create immutable, timestamped game events representing every action and state change during a battle—from game creation and initiative rolls to movement declarations, weapon attacks, damage application, heat generation, pilot injuries, and unit destruction. Each event carries a type-safe payload with specific data for that event type, enabling complete battle reconstruction, replay functionality, and state derivation. This system is the single source of truth for all gameplay state changes, consumed by the game state management system to derive current battle conditions.

## Requirements

### Requirement: Event ID Generation

The system SHALL provide unique event ID generation using UUID v4.

#### Scenario: Generate unique event ID

- **GIVEN** the `generateEventId` function
- **WHEN** called multiple times
- **THEN** each returned ID SHALL be a valid UUID v4 string
- **AND** all IDs SHALL be unique across calls

#### Scenario: Event IDs are globally unique

- **GIVEN** 1000 calls to `generateEventId`
- **WHEN** collecting all returned IDs
- **THEN** no duplicate IDs SHALL exist in the collection

### Requirement: Base Event Properties

The system SHALL create base event properties with gameId, sequence, timestamp, type, turn, phase, and optional actorId.

#### Scenario: Create base event with all properties

- **GIVEN** gameId="game-123", sequence=5, type=GameEventType.MovementDeclared, turn=3, phase=GamePhase.Movement, actorId="mech-1"
- **WHEN** creating a base event
- **THEN** the event SHALL have id (UUID), gameId="game-123", sequence=5, timestamp (ISO 8601), type=MovementDeclared, turn=3, phase=Movement, actorId="mech-1"

#### Scenario: Create base event without actorId

- **GIVEN** gameId="game-456", sequence=1, type=GameEventType.GameCreated, turn=0, phase=GamePhase.Initiative
- **WHEN** creating a base event without actorId
- **THEN** the event SHALL have actorId=undefined

#### Scenario: Timestamp is ISO 8601 format

- **GIVEN** any event creation
- **WHEN** the event is created
- **THEN** the timestamp SHALL be a valid ISO 8601 string (e.g., "2026-02-12T10:30:00.000Z")

### Requirement: Lifecycle Event Factories

The system SHALL provide factory functions for game lifecycle events: GameCreated, GameStarted, GameEnded.

#### Scenario: Create GameCreated event

- **GIVEN** gameId="game-1", config={mapSize: 20, turnLimit: 10}, units=[{id: "mech-1", ...}, {id: "mech-2", ...}]
- **WHEN** `createGameCreatedEvent(gameId, config, units)` is called
- **THEN** the event SHALL have type=GameCreated, sequence=0, turn=0, phase=Initiative
- **AND** payload SHALL contain config and units

#### Scenario: Create GameStarted event

- **GIVEN** gameId="game-1", sequence=1, firstSide=GameSide.Player
- **WHEN** `createGameStartedEvent(gameId, sequence, firstSide)` is called
- **THEN** the event SHALL have type=GameStarted, turn=1, phase=Initiative
- **AND** payload SHALL contain firstSide=Player

#### Scenario: Create GameEnded event with winner

- **GIVEN** gameId="game-1", sequence=50, turn=5, phase=GamePhase.WeaponAttack, winner=GameSide.Player, reason="destruction"
- **WHEN** `createGameEndedEvent(gameId, sequence, turn, phase, winner, reason)` is called
- **THEN** the event SHALL have type=GameEnded, turn=5, phase=WeaponAttack
- **AND** payload SHALL contain winner=Player, reason="destruction"

#### Scenario: Create GameEnded event with draw

- **GIVEN** gameId="game-1", sequence=100, turn=10, phase=GamePhase.End, winner="draw", reason="turn_limit"
- **WHEN** `createGameEndedEvent(gameId, sequence, turn, phase, winner, reason)` is called
- **THEN** payload SHALL contain winner="draw", reason="turn_limit"

### Requirement: Turn/Phase Event Factories

The system SHALL provide factory functions for turn and phase management: PhaseChanged.

#### Scenario: Create PhaseChanged event

- **GIVEN** gameId="game-1", sequence=10, turn=2, fromPhase=GamePhase.Movement, toPhase=GamePhase.WeaponAttack
- **WHEN** `createPhaseChangedEvent(gameId, sequence, turn, fromPhase, toPhase)` is called
- **THEN** the event SHALL have type=PhaseChanged, turn=2, phase=WeaponAttack
- **AND** payload SHALL contain fromPhase=Movement, toPhase=WeaponAttack

#### Scenario: Phase transition from Initiative to Movement

- **GIVEN** fromPhase=GamePhase.Initiative, toPhase=GamePhase.Movement
- **WHEN** creating a PhaseChanged event
- **THEN** the event phase SHALL be Movement (the new phase)

### Requirement: Initiative Event Factories

The system SHALL provide factory functions for initiative resolution: InitiativeRolled.

#### Scenario: Create InitiativeRolled event with player winner

- **GIVEN** gameId="game-1", sequence=2, turn=1, playerRoll=8, opponentRoll=5, winner=GameSide.Player, movesFirst=GameSide.Player
- **WHEN** `createInitiativeRolledEvent(gameId, sequence, turn, playerRoll, opponentRoll, winner, movesFirst)` is called
- **THEN** the event SHALL have type=InitiativeRolled, turn=1, phase=Initiative
- **AND** payload SHALL contain playerRoll=8, opponentRoll=5, winner=Player, movesFirst=Player

#### Scenario: Create InitiativeRolled event with tie (winner loses next roll)

- **GIVEN** playerRoll=7, opponentRoll=7, winner=GameSide.Opponent, movesFirst=GameSide.Player
- **WHEN** creating an InitiativeRolled event
- **THEN** payload SHALL contain winner=Opponent (lost tie-breaker), movesFirst=Player (won this roll)

### Requirement: Movement Event Factories

The system SHALL provide factory functions for movement actions: MovementDeclared, MovementLocked.

#### Scenario: Create MovementDeclared event

- **GIVEN** gameId="game-1", sequence=5, turn=1, unitId="mech-1", from={q:0,r:0}, to={q:3,r:2}, facing=Facing.North, movementType=MovementType.Walk, mpUsed=5, heatGenerated=0
- **WHEN** `createMovementDeclaredEvent(gameId, sequence, turn, unitId, from, to, facing, movementType, mpUsed, heatGenerated)` is called
- **THEN** the event SHALL have type=MovementDeclared, turn=1, phase=Movement, actorId="mech-1"
- **AND** payload SHALL contain unitId="mech-1", from={q:0,r:0}, to={q:3,r:2}, facing=North, movementType=Walk, mpUsed=5, heatGenerated=0

#### Scenario: Create MovementDeclared event with jump heat

- **GIVEN** movementType=MovementType.Jump, mpUsed=4, heatGenerated=4
- **WHEN** creating a MovementDeclared event
- **THEN** payload SHALL contain heatGenerated=4 (1 heat per jump MP)

#### Scenario: Create MovementLocked event

- **GIVEN** gameId="game-1", sequence=6, turn=1, unitId="mech-1"
- **WHEN** `createMovementLockedEvent(gameId, sequence, turn, unitId)` is called
- **THEN** the event SHALL have type=MovementLocked, turn=1, phase=Movement, actorId="mech-1"
- **AND** payload SHALL contain unitId="mech-1"

### Requirement: Combat Event Factories

The system SHALL provide factory functions for combat actions: AttackDeclared, AttackLocked, AttackResolved, DamageApplied.

#### Scenario: Create AttackDeclared event

- **GIVEN** gameId="game-1", sequence=10, turn=1, attackerId="mech-1", targetId="mech-2", weapons=["medium-laser-1", "medium-laser-2"], toHitNumber=8, modifiers=[{source: "range", value: 2}]
- **WHEN** `createAttackDeclaredEvent(gameId, sequence, turn, attackerId, targetId, weapons, toHitNumber, modifiers)` is called
- **THEN** the event SHALL have type=AttackDeclared, turn=1, phase=WeaponAttack, actorId="mech-1"
- **AND** payload SHALL contain attackerId="mech-1", targetId="mech-2", weapons=["medium-laser-1", "medium-laser-2"], toHitNumber=8, modifiers=[{source: "range", value: 2}]

#### Scenario: Create AttackDeclared event with weapon attack data

- **GIVEN** weaponAttacks=[{weaponId: "ppc-1", toHitNumber: 7, damage: 10}]
- **WHEN** creating an AttackDeclared event with weaponAttacks
- **THEN** payload SHALL contain weaponAttacks array with weapon-specific data

#### Scenario: Create AttackLocked event

- **GIVEN** gameId="game-1", sequence=11, turn=1, unitId="mech-1"
- **WHEN** `createAttackLockedEvent(gameId, sequence, turn, unitId)` is called
- **THEN** the event SHALL have type=AttackLocked, turn=1, phase=WeaponAttack, actorId="mech-1"
- **AND** payload SHALL contain unitId="mech-1"

#### Scenario: Create AttackResolved event with hit

- **GIVEN** gameId="game-1", sequence=12, turn=1, attackerId="mech-1", targetId="mech-2", weaponId="medium-laser-1", roll=9, toHitNumber=8, hit=true, location="CT", damage=5
- **WHEN** `createAttackResolvedEvent(gameId, sequence, turn, attackerId, targetId, weaponId, roll, toHitNumber, hit, location, damage)` is called
- **THEN** the event SHALL have type=AttackResolved, turn=1, phase=WeaponAttack, actorId="mech-1"
- **AND** payload SHALL contain attackerId="mech-1", targetId="mech-2", weaponId="medium-laser-1", roll=9, toHitNumber=8, hit=true, location="CT", damage=5

#### Scenario: Create AttackResolved event with miss

- **GIVEN** roll=5, toHitNumber=8, hit=false, location=undefined, damage=undefined
- **WHEN** creating an AttackResolved event
- **THEN** payload SHALL contain hit=false, location=undefined, damage=undefined

#### Scenario: Create DamageApplied event

- **GIVEN** gameId="game-1", sequence=13, turn=1, unitId="mech-2", location="CT", damage=5, armorRemaining=10, structureRemaining=15, locationDestroyed=false
- **WHEN** `createDamageAppliedEvent(gameId, sequence, turn, unitId, location, damage, armorRemaining, structureRemaining, locationDestroyed)` is called
- **THEN** the event SHALL have type=DamageApplied, turn=1, phase=WeaponAttack, actorId="mech-2"
- **AND** payload SHALL contain unitId="mech-2", location="CT", damage=5, armorRemaining=10, structureRemaining=15, locationDestroyed=false

#### Scenario: Create DamageApplied event with criticals

- **GIVEN** criticals=["medium-laser-1", "heat-sink-2"]
- **WHEN** creating a DamageApplied event with criticals
- **THEN** payload SHALL contain criticals=["medium-laser-1", "heat-sink-2"]

#### Scenario: Create DamageApplied event with location destroyed

- **GIVEN** armorRemaining=0, structureRemaining=0, locationDestroyed=true
- **WHEN** creating a DamageApplied event
- **THEN** payload SHALL contain locationDestroyed=true

### Requirement: Heat Event Factories

The system SHALL provide factory functions for heat management: HeatGenerated, HeatDissipated.

#### Scenario: Create HeatGenerated event from movement

- **GIVEN** gameId="game-1", sequence=7, turn=1, phase=GamePhase.Movement, unitId="mech-1", amount=4, source="movement", newTotal=4
- **WHEN** `createHeatGeneratedEvent(gameId, sequence, turn, phase, unitId, amount, source, newTotal)` is called
- **THEN** the event SHALL have type=HeatGenerated, turn=1, phase=Movement, actorId="mech-1"
- **AND** payload SHALL contain unitId="mech-1", amount=4, source="movement", newTotal=4

#### Scenario: Create HeatGenerated event from weapons

- **GIVEN** amount=10, source="weapons", newTotal=14
- **WHEN** creating a HeatGenerated event
- **THEN** payload SHALL contain amount=10, source="weapons", newTotal=14

#### Scenario: Create HeatDissipated event

- **GIVEN** gameId="game-1", sequence=20, turn=1, unitId="mech-1", amount=10, newTotal=4
- **WHEN** `createHeatDissipatedEvent(gameId, sequence, turn, unitId, amount, newTotal)` is called
- **THEN** the event SHALL have type=HeatDissipated, turn=1, phase=Heat, actorId="mech-1"
- **AND** payload SHALL contain unitId="mech-1", amount=-10 (negative for dissipation), source="dissipation", newTotal=4

### Requirement: Pilot Status Event Factories

The system SHALL provide factory functions for pilot status: PilotHit, UnitDestroyed.

#### Scenario: Create PilotHit event from head hit

- **GIVEN** gameId="game-1", sequence=15, turn=1, phase=GamePhase.WeaponAttack, unitId="mech-2", wounds=1, totalWounds=1, source="head_hit", consciousnessCheckRequired=true, consciousnessCheckPassed=true
- **WHEN** `createPilotHitEvent(gameId, sequence, turn, phase, unitId, wounds, totalWounds, source, consciousnessCheckRequired, consciousnessCheckPassed)` is called
- **THEN** the event SHALL have type=PilotHit, turn=1, phase=WeaponAttack, actorId="mech-2"
- **AND** payload SHALL contain unitId="mech-2", wounds=1, totalWounds=1, source="head_hit", consciousnessCheckRequired=true, consciousnessCheckPassed=true

#### Scenario: Create PilotHit event from ammo explosion

- **GIVEN** source="ammo_explosion", wounds=2, totalWounds=3
- **WHEN** creating a PilotHit event
- **THEN** payload SHALL contain source="ammo_explosion", wounds=2, totalWounds=3

#### Scenario: Create PilotHit event without consciousness check

- **GIVEN** consciousnessCheckRequired=false, consciousnessCheckPassed=undefined
- **WHEN** creating a PilotHit event
- **THEN** payload SHALL contain consciousnessCheckRequired=false, consciousnessCheckPassed=undefined

#### Scenario: Create UnitDestroyed event from damage

- **GIVEN** gameId="game-1", sequence=16, turn=1, phase=GamePhase.WeaponAttack, unitId="mech-2", cause="damage"
- **WHEN** `createUnitDestroyedEvent(gameId, sequence, turn, phase, unitId, cause)` is called
- **THEN** the event SHALL have type=UnitDestroyed, turn=1, phase=WeaponAttack, actorId="mech-2"
- **AND** payload SHALL contain unitId="mech-2", cause="damage"

#### Scenario: Create UnitDestroyed event from pilot death

- **GIVEN** cause="pilot_death"
- **WHEN** creating a UnitDestroyed event
- **THEN** payload SHALL contain cause="pilot_death"

### Requirement: Critical Hit Event Factories

The system SHALL provide factory functions for critical hit resolution: CriticalHitResolved.

#### Scenario: Create CriticalHitResolved event with component destroyed

- **GIVEN** gameId="game-1", sequence=14, turn=1, phase=GamePhase.WeaponAttack, unitId="mech-2", location="RT", slotIndex=3, componentType="weapon", componentName="medium-laser-1", effect="destroyed", destroyed=true
- **WHEN** `createCriticalHitResolvedEvent(gameId, sequence, turn, phase, unitId, location, slotIndex, componentType, componentName, effect, destroyed)` is called
- **THEN** the event SHALL have type=CriticalHitResolved, turn=1, phase=WeaponAttack, actorId="mech-2"
- **AND** payload SHALL contain unitId="mech-2", location="RT", slotIndex=3, componentType="weapon", componentName="medium-laser-1", effect="destroyed", destroyed=true

#### Scenario: Create CriticalHitResolved event with component damaged

- **GIVEN** effect="damaged", destroyed=false
- **WHEN** creating a CriticalHitResolved event
- **THEN** payload SHALL contain effect="damaged", destroyed=false

### Requirement: Piloting Skill Roll Event Factories

The system SHALL provide factory functions for piloting skill rolls: PSRTriggered, PSRResolved, UnitFell.

#### Scenario: Create PSRTriggered event

- **GIVEN** gameId="game-1", sequence=17, turn=1, phase=GamePhase.WeaponAttack, unitId="mech-2", reason="20+ damage", additionalModifier=1, triggerSource="damage"
- **WHEN** `createPSRTriggeredEvent(gameId, sequence, turn, phase, unitId, reason, additionalModifier, triggerSource)` is called
- **THEN** the event SHALL have type=PSRTriggered, turn=1, phase=WeaponAttack, actorId="mech-2"
- **AND** payload SHALL contain unitId="mech-2", reason="20+ damage", additionalModifier=1, triggerSource="damage"

#### Scenario: Create PSRResolved event with pass

- **GIVEN** gameId="game-1", sequence=18, turn=1, phase=GamePhase.WeaponAttack, unitId="mech-2", targetNumber=7, roll=9, modifiers=2, passed=true, reason="20+ damage"
- **WHEN** `createPSRResolvedEvent(gameId, sequence, turn, phase, unitId, targetNumber, roll, modifiers, passed, reason)` is called
- **THEN** the event SHALL have type=PSRResolved, turn=1, phase=WeaponAttack, actorId="mech-2"
- **AND** payload SHALL contain unitId="mech-2", targetNumber=7, roll=9, modifiers=2, passed=true, reason="20+ damage"

#### Scenario: Create PSRResolved event with fail

- **GIVEN** roll=5, passed=false
- **WHEN** creating a PSRResolved event
- **THEN** payload SHALL contain roll=5, passed=false

#### Scenario: Create UnitFell event

- **GIVEN** gameId="game-1", sequence=19, turn=1, phase=GamePhase.WeaponAttack, unitId="mech-2", fallDamage=10, newFacing=Facing.South, pilotDamage=1
- **WHEN** `createUnitFellEvent(gameId, sequence, turn, phase, unitId, fallDamage, newFacing, pilotDamage)` is called
- **THEN** the event SHALL have type=UnitFell, turn=1, phase=WeaponAttack, actorId="mech-2"
- **AND** payload SHALL contain unitId="mech-2", fallDamage=10, newFacing=South, pilotDamage=1

### Requirement: Shutdown/Startup Event Factories

The system SHALL provide factory functions for heat-induced shutdown: ShutdownCheck, StartupAttempt.

#### Scenario: Create ShutdownCheck event with shutdown

- **GIVEN** gameId="game-1", sequence=21, turn=1, phase=GamePhase.Heat, unitId="mech-1", heatLevel=30, targetNumber=13, roll=10, shutdownOccurred=true
- **WHEN** `createShutdownCheckEvent(gameId, sequence, turn, phase, unitId, heatLevel, targetNumber, roll, shutdownOccurred)` is called
- **THEN** the event SHALL have type=ShutdownCheck, turn=1, phase=Heat, actorId="mech-1"
- **AND** payload SHALL contain unitId="mech-1", heatLevel=30, targetNumber=13, roll=10, shutdownOccurred=true

#### Scenario: Create ShutdownCheck event without shutdown

- **GIVEN** roll=14, shutdownOccurred=false
- **WHEN** creating a ShutdownCheck event
- **THEN** payload SHALL contain roll=14, shutdownOccurred=false

#### Scenario: Create StartupAttempt event with success

- **GIVEN** gameId="game-1", sequence=22, turn=2, phase=GamePhase.Heat, unitId="mech-1", targetNumber=8, roll=10, success=true
- **WHEN** `createStartupAttemptEvent(gameId, sequence, turn, phase, unitId, targetNumber, roll, success)` is called
- **THEN** the event SHALL have type=StartupAttempt, turn=2, phase=Heat, actorId="mech-1"
- **AND** payload SHALL contain unitId="mech-1", targetNumber=8, roll=10, success=true

#### Scenario: Create StartupAttempt event with failure

- **GIVEN** roll=5, success=false
- **WHEN** creating a StartupAttempt event
- **THEN** payload SHALL contain roll=5, success=false

### Requirement: Ammo Consumption Event Factories

The system SHALL provide factory functions for ammunition tracking: AmmoConsumed.

#### Scenario: Create AmmoConsumed event

- **GIVEN** gameId="game-1", sequence=23, turn=1, phase=GamePhase.WeaponAttack, unitId="mech-1", binId="lrm-ammo-1", weaponType="LRM 10", roundsConsumed=10, roundsRemaining=230
- **WHEN** `createAmmoConsumedEvent(gameId, sequence, turn, phase, unitId, binId, weaponType, roundsConsumed, roundsRemaining)` is called
- **THEN** the event SHALL have type=AmmoConsumed, turn=1, phase=WeaponAttack, actorId="mech-1"
- **AND** payload SHALL contain unitId="mech-1", binId="lrm-ammo-1", weaponType="LRM 10", roundsConsumed=10, roundsRemaining=230

#### Scenario: Create AmmoConsumed event with ammo depleted

- **GIVEN** roundsConsumed=10, roundsRemaining=0
- **WHEN** creating an AmmoConsumed event
- **THEN** payload SHALL contain roundsRemaining=0 (ammo bin empty)

### Requirement: Event Serialization

The system SHALL provide serialization and deserialization functions for events and event arrays.

#### Scenario: Serialize single event

- **GIVEN** an event object with id="evt-1", type=GameEventType.MovementDeclared, payload={unitId: "mech-1", ...}
- **WHEN** `serializeEvent(event)` is called
- **THEN** the result SHALL be a valid JSON string
- **AND** the JSON SHALL contain all event properties

#### Scenario: Deserialize single event

- **GIVEN** a JSON string representing a valid event
- **WHEN** `deserializeEvent(json)` is called
- **THEN** the result SHALL be an IGameEvent object
- **AND** all properties SHALL match the original event

#### Scenario: Serialize event array

- **GIVEN** an array of 3 events
- **WHEN** `serializeEvents(events)` is called
- **THEN** the result SHALL be a valid JSON string
- **AND** the JSON SHALL contain all 3 events

#### Scenario: Deserialize event array

- **GIVEN** a JSON string representing an array of events
- **WHEN** `deserializeEvents(json)` is called
- **THEN** the result SHALL be an array of IGameEvent objects
- **AND** the array length SHALL match the original

#### Scenario: Round-trip serialization preserves data

- **GIVEN** an event with all properties populated
- **WHEN** serializing then deserializing the event
- **THEN** the result SHALL be deeply equal to the original event

## Dependencies

- **game-state-management**: Consumes events to derive current battle state
- **combat-analytics**: Aggregates events for damage matrix, kill credits, unit performance
- **battle-replay**: Uses serialized events for replay functionality
- **campaign-system**: Stores events for historical battle records

## Used By

- **game-state-management**: Derives state from event stream
- **combat-analytics**: Projects statistics from events
- **battle-replay**: Reconstructs battles from event log
- **campaign-system**: Archives battle history
- **multiplayer-sync**: Transmits events between clients
