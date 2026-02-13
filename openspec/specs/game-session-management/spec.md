# Game Session Management Specification

## Purpose

The Game Session Management system is the top-level orchestrator for BattleTech tactical gameplay. It creates, manages, and drives game sessions through the complete turn-based combat loop: initiative → movement → weapon attack → physical attack → heat → end. This module is the primary integration point that wires together all combat subsystems—to-hit calculation, hit location determination, damage resolution, critical hit processing, piloting skill rolls, fall mechanics, heat management, and ammo tracking—into a coherent gameplay experience.

The session operates on an immutable, event-sourced architecture. Every action (movement declaration, attack declaration, attack resolution, damage application, heat generation) produces an immutable event that is appended to the session's event log. The current game state is always derived from the full event sequence via the game-state-management system. This ensures deterministic replay, complete audit trails, and consistent state across all consumers. The session layer orchestrates the _flow_ of gameplay—it determines when actions are valid, sequences resolution steps correctly, and enforces phase discipline—while delegating the mechanics of each subsystem to their respective modules.

**Implementation**: `src/utils/gameplay/gameSession.ts`

## Requirements

### Requirement: Session Creation

The system SHALL create a new game session from a configuration and a list of units, producing an initial event log with a single GameCreated event and a derived initial state.

#### Scenario: Create session with valid config and units

- **GIVEN** a game config with mapId, turnLimit, and rules settings
- **AND** an array of 2 IGameUnit objects (one Player, one Opponent)
- **WHEN** `createGameSession(config, units)` is called
- **THEN** the returned session SHALL have a unique UUID v4 id
- **AND** createdAt and updatedAt SHALL be ISO 8601 timestamps
- **AND** the config and units SHALL be stored on the session
- **AND** the events array SHALL contain exactly 1 event of type GameCreated
- **AND** currentState SHALL be derived from that single event via `deriveState`

#### Scenario: Session initial state reflects setup status

- **GIVEN** a newly created session
- **WHEN** inspecting currentState
- **THEN** status SHALL be GameStatus.Setup
- **AND** turn SHALL be 0
- **AND** phase SHALL be GamePhase.Initiative

### Requirement: Session Lifecycle (Start and End)

The system SHALL enforce valid lifecycle transitions: Setup → Active → Completed.

#### Scenario: Start game from setup state

- **GIVEN** a session in GameStatus.Setup
- **AND** firstSide=GameSide.Player
- **WHEN** `startGame(session, GameSide.Player)` is called
- **THEN** a GameStarted event SHALL be appended
- **AND** the returned session's currentState.status SHALL be GameStatus.Active

#### Scenario: Start game rejects non-setup state

- **GIVEN** a session in GameStatus.Active
- **WHEN** `startGame(session, GameSide.Player)` is called
- **THEN** the system SHALL throw an error "Game is not in setup state"

#### Scenario: End game with destruction victory

- **GIVEN** an active session
- **WHEN** `endGame(session, GameSide.Player, 'destruction')` is called
- **THEN** a GameEnded event SHALL be appended with winner=Player and reason="destruction"
- **AND** currentState.status SHALL become GameStatus.Completed

#### Scenario: End game with draw by concession

- **GIVEN** an active session
- **WHEN** `endGame(session, 'draw', 'concede')` is called
- **THEN** the GameEnded event SHALL have winner="draw" and reason="concede"

#### Scenario: End game rejects non-active state

- **GIVEN** a session in GameStatus.Setup
- **WHEN** `endGame(session, GameSide.Player, 'destruction')` is called
- **THEN** the system SHALL throw an error "Game is not active"

### Requirement: Immutable Event Append

The system SHALL append events immutably, producing a new session with the event added and state re-derived.

#### Scenario: Append event produces new session

- **GIVEN** a session with N events
- **WHEN** `appendEvent(session, newEvent)` is called
- **THEN** the returned session SHALL have N+1 events
- **AND** the original session SHALL still have N events (immutable)
- **AND** currentState SHALL be re-derived from the full N+1 event array via `deriveState`
- **AND** updatedAt SHALL be refreshed to the current timestamp

#### Scenario: Event query by turn

- **GIVEN** a session with events spanning turns 1–3
- **WHEN** `getEventsForTurn(session, 2)` is called
- **THEN** only events with turn=2 SHALL be returned

#### Scenario: Event query by turn and phase

- **GIVEN** a session with events in turn 2 across Movement and WeaponAttack phases
- **WHEN** `getEventsForPhase(session, 2, GamePhase.Movement)` is called
- **THEN** only events with turn=2 AND phase=Movement SHALL be returned

### Requirement: Phase Sequence and Advancement

The system SHALL enforce the canonical BattleTech phase order: Initiative → Movement → WeaponAttack → PhysicalAttack → Heat → End, wrapping back to Initiative with an incremented turn number.

#### Scenario: Phase order from Initiative through End

- **GIVEN** the current phase is Initiative
- **WHEN** `getNextPhase(GamePhase.Initiative)` is called
- **THEN** the result SHALL be GamePhase.Movement
- **AND** `getNextPhase(GamePhase.Movement)` SHALL return GamePhase.WeaponAttack
- **AND** `getNextPhase(GamePhase.WeaponAttack)` SHALL return GamePhase.PhysicalAttack
- **AND** `getNextPhase(GamePhase.PhysicalAttack)` SHALL return GamePhase.Heat
- **AND** `getNextPhase(GamePhase.Heat)` SHALL return GamePhase.End

#### Scenario: End phase wraps to Initiative

- **GIVEN** the current phase is End
- **WHEN** `getNextPhase(GamePhase.End)` is called
- **THEN** the result SHALL be GamePhase.Initiative

#### Scenario: Advance phase emits PhaseChanged event

- **GIVEN** a session in turn 1, phase Movement
- **WHEN** `advancePhase(session)` is called
- **THEN** a PhaseChanged event SHALL be appended with fromPhase=Movement, toPhase=WeaponAttack
- **AND** the event SHALL have turn=1

#### Scenario: Advance from End increments turn

- **GIVEN** a session in turn 2, phase End
- **WHEN** `advancePhase(session)` is called
- **THEN** the PhaseChanged event SHALL have turn=3 and toPhase=Initiative
- **AND** the session's currentState.turn SHALL be 3

### Requirement: Phase Advancement Guards

The system SHALL prevent phase advancement when units have not completed their required actions.

#### Scenario: Cannot advance Movement phase with unlocked units

- **GIVEN** an active session in Movement phase
- **AND** at least one unit has lockState != Locked
- **WHEN** `canAdvancePhase(session)` is called
- **THEN** the result SHALL be false

#### Scenario: Can advance Movement phase when all units locked

- **GIVEN** an active session in Movement phase
- **AND** all units have lockState=Locked (verified via `allUnitsLocked`)
- **WHEN** `canAdvancePhase(session)` is called
- **THEN** the result SHALL be true

#### Scenario: Cannot advance WeaponAttack phase with unlocked units

- **GIVEN** an active session in WeaponAttack phase with unlocked units
- **WHEN** `canAdvancePhase(session)` is called
- **THEN** the result SHALL be false

#### Scenario: Cannot advance PhysicalAttack phase with unlocked units

- **GIVEN** an active session in PhysicalAttack phase with unlocked units
- **WHEN** `canAdvancePhase(session)` is called
- **THEN** the result SHALL be false

#### Scenario: Initiative and Heat phases always advanceable

- **GIVEN** an active session in Initiative phase (or Heat phase)
- **WHEN** `canAdvancePhase(session)` is called
- **THEN** the result SHALL be true regardless of unit lock state

#### Scenario: Non-active game cannot advance

- **GIVEN** a session with status GameStatus.Setup
- **WHEN** `canAdvancePhase(session)` is called
- **THEN** the result SHALL be false

### Requirement: Initiative Phase Resolution

The system SHALL resolve initiative by rolling 2d6 for each side, determining a winner, and selecting which side moves first.

#### Scenario: Player wins initiative with higher roll

- **GIVEN** a session in Initiative phase
- **AND** Player rolls 8, Opponent rolls 5
- **WHEN** `rollInitiative(session)` is called
- **THEN** an InitiativeRolled event SHALL be appended with winner=Player
- **AND** movesFirst SHALL default to Opponent (winner moves second for tactical advantage)

#### Scenario: Opponent wins initiative

- **GIVEN** Player rolls 4, Opponent rolls 9
- **WHEN** `rollInitiative(session)` is called
- **THEN** winner SHALL be Opponent
- **AND** movesFirst SHALL default to Player

#### Scenario: Tied initiative defaults to player

- **GIVEN** Player rolls 7, Opponent rolls 7
- **WHEN** `rollInitiative(session)` is called
- **THEN** winner SHALL be Player (tie-breaking rule)

#### Scenario: Override movesFirst selection

- **GIVEN** Player wins initiative
- **WHEN** `rollInitiative(session, GameSide.Player)` is called with explicit movesFirst
- **THEN** movesFirst SHALL be Player (overriding default)

#### Scenario: Initiative requires correct phase

- **GIVEN** a session in Movement phase
- **WHEN** `rollInitiative(session)` is called
- **THEN** the system SHALL throw "Not in initiative phase"

### Requirement: Movement Declaration and Locking

The system SHALL allow units to declare movement (position, facing, type, MP, heat) and lock their movement declarations during the Movement phase.

#### Scenario: Declare walking movement

- **GIVEN** a session in Movement phase
- **AND** unit "mech-1" exists in currentState
- **WHEN** `declareMovement(session, "mech-1", {q:0,r:0}, {q:3,r:2}, Facing.North, MovementType.Walk, 5, 1)` is called
- **THEN** a MovementDeclared event SHALL be appended with unitId="mech-1"
- **AND** the event payload SHALL contain from, to, facing, movementType=Walk, mpUsed=5, heatGenerated=1

#### Scenario: Declare jumping movement with heat

- **GIVEN** a session in Movement phase
- **WHEN** `declareMovement(session, "mech-1", from, to, facing, MovementType.Jump, 4, 4)` is called
- **THEN** heatGenerated SHALL be 4 (jump heat = MP used, minimum 3)

#### Scenario: Lock movement for a unit

- **GIVEN** a session in Movement phase with a declared movement for "mech-1"
- **WHEN** `lockMovement(session, "mech-1")` is called
- **THEN** a MovementLocked event SHALL be appended for "mech-1"

#### Scenario: Movement rejects wrong phase

- **GIVEN** a session in WeaponAttack phase
- **WHEN** `declareMovement(session, ...)` is called
- **THEN** the system SHALL throw "Not in movement phase"

#### Scenario: Movement rejects unknown unit

- **GIVEN** a session in Movement phase
- **WHEN** `declareMovement(session, "nonexistent", ...)` is called
- **THEN** the system SHALL throw "Unit nonexistent not found"

### Requirement: Attack Declaration with To-Hit Integration

The system SHALL integrate with the to-hit-resolution system when declaring weapon attacks, computing the final to-hit number and modifiers before emitting the AttackDeclared event.

#### Scenario: Declare attack with to-hit calculation

- **GIVEN** a session in WeaponAttack phase
- **AND** attacker "mech-1" (gunnery 4) walked this turn
- **AND** target "mech-2" moved 3 hexes (TMM +1)
- **AND** range bracket is Medium (+2)
- **WHEN** `declareAttack(session, "mech-1", "mech-2", weapons, range, RangeBracket.Medium, firingArc)` is called
- **THEN** `calculateToHit` from to-hit-resolution SHALL be invoked with attacker state, target state, range bracket, and range
- **AND** an AttackDeclared event SHALL be appended with the computed toHitNumber
- **AND** modifiers array SHALL contain each modifier's name, value, and source

#### Scenario: Attack declaration includes weapon data

- **GIVEN** weapons=[{weaponId: "ml-1", weaponName: "Medium Laser", damage: 5, heat: 3}]
- **WHEN** declareAttack is called
- **THEN** the AttackDeclared event SHALL contain weaponAttacks with weaponId, weaponName, damage, and heat for each weapon

#### Scenario: Lock attack for a unit

- **GIVEN** a session in WeaponAttack phase
- **WHEN** `lockAttack(session, "mech-1")` is called
- **THEN** an AttackLocked event SHALL be appended for "mech-1"

#### Scenario: Attack rejects wrong phase

- **GIVEN** a session in Movement phase
- **WHEN** `declareAttack(session, ...)` is called
- **THEN** the system SHALL throw "Not in weapon attack phase"

### Requirement: Attack Resolution Pipeline

The system SHALL resolve attacks by rolling dice for each weapon, determining hit/miss, and on hit: computing firing arc, determining hit location, resolving damage through the damage pipeline, processing critical hits, triggering PSRs for leg damage, and checking for pilot hits and unit destruction.

#### Scenario: Single weapon hit — full pipeline

- **GIVEN** an AttackDeclared event with toHitNumber=8, weapon "Medium Laser" (damage 5)
- **AND** the attack roll is 9 (hit)
- **WHEN** `resolveAttack(session, attackEvent, diceRoller)` is called
- **THEN** the system SHALL compute the firing arc from attacker/target positions via spatial-combat-system
- **AND** roll for hit location via to-hit-resolution `determineHitLocationFromRoll`
- **AND** apply head-capping rule (max 3 damage if head hit)
- **AND** emit an AttackResolved event with hit=true, location, and damage
- **AND** resolve damage via damage-system `resolveDamage` pipeline
- **AND** emit DamageApplied events for each location damage result

#### Scenario: Single weapon miss

- **GIVEN** an AttackDeclared event with toHitNumber=8
- **AND** the attack roll is 6 (miss)
- **WHEN** `resolveAttack(session, attackEvent, diceRoller)` is called
- **THEN** an AttackResolved event SHALL be emitted with hit=false
- **AND** no DamageApplied, CriticalHitResolved, or PilotHit events SHALL be emitted for this weapon

#### Scenario: Critical hit processing on structure exposure

- **GIVEN** a weapon hit that deals damage reducing a location's structure (but not destroying it)
- **WHEN** the damage pipeline reports structureDamage > 0 and destroyed=false
- **THEN** `resolveCriticalHits` from critical-hit-resolution SHALL be called for that location
- **AND** any CriticalHitResolved, PSRTriggered, UnitDestroyed, or PilotHit events from the critical system SHALL be emitted

#### Scenario: Through-Armor Critical on location roll of 2

- **GIVEN** a successful weapon hit
- **AND** the hit location roll total is 2
- **WHEN** processing the hit
- **THEN** `checkTACTrigger(2, arcString)` SHALL be called to determine the TAC location
- **AND** if a TAC location is returned, `processTAC` from critical-hit-resolution SHALL be called
- **AND** resulting events SHALL be emitted to the session

#### Scenario: Leg damage triggers PSR

- **GIVEN** a weapon hit that deals structure damage to a leg location (left_leg or right_leg)
- **WHEN** the damage pipeline reports structureDamage > 0 for a leg
- **THEN** a PSRTriggered event SHALL be emitted with reason="Leg damage (internal structure exposed)" and triggerSource="leg_damage"
- **AND** only one PSR SHALL be triggered per weapon resolution regardless of how many leg hits occur

#### Scenario: Pilot hit from head damage

- **GIVEN** the damage pipeline reports pilotDamage with woundsInflicted > 0
- **WHEN** processing post-damage effects
- **THEN** a PilotHit event SHALL be emitted with wounds, totalWounds, source, consciousnessCheckRequired, and consciousnessCheckPassed

#### Scenario: Unit destruction from damage

- **GIVEN** the damage pipeline reports unitDestroyed=true with destructionCause="damage"
- **WHEN** processing post-damage effects
- **THEN** a UnitDestroyed event SHALL be emitted with cause="damage"

#### Scenario: Head-capping rule limits damage to 3

- **GIVEN** a weapon with damage 10 hits the head location
- **WHEN** resolving damage
- **THEN** the damage applied SHALL be capped at 3 (head-capping rule)

### Requirement: Ammo Consumption During Attack Resolution

The system SHALL consume ammunition for non-energy weapons before resolving each weapon's attack.

#### Scenario: Non-energy weapon consumes ammo

- **GIVEN** an attack with an AC/5 (non-energy weapon)
- **AND** the attacker has ammo bins with remaining rounds
- **WHEN** resolving the weapon
- **THEN** `consumeAmmo` SHALL be called before rolling to-hit
- **AND** an AmmoConsumed event SHALL be emitted with binId, weaponType, roundsConsumed, and roundsRemaining

#### Scenario: Energy weapon skips ammo consumption

- **GIVEN** an attack with a Medium Laser (energy weapon)
- **WHEN** resolving the weapon
- **THEN** `isEnergyWeapon` SHALL return true
- **AND** no AmmoConsumed event SHALL be emitted

### Requirement: Batch Attack Resolution

The system SHALL resolve all declared attacks for the current turn in sequence.

#### Scenario: Resolve all attacks in a turn

- **GIVEN** a session with 3 AttackDeclared events in turn 2
- **WHEN** `resolveAllAttacks(session, diceRoller)` is called
- **THEN** each attack SHALL be resolved in order via `resolveAttack`
- **AND** the session state SHALL accumulate all resolution events across all attacks

### Requirement: Damage PSR Queue

The system SHALL check for and queue 20+ damage PSRs at the end of the weapon attack phase.

#### Scenario: Queue PSR for 20+ damage

- **GIVEN** a unit that accumulated 22 damage during the weapon attack phase
- **WHEN** `checkAndQueueDamagePSRs(session)` is called
- **THEN** a PSRTriggered event SHALL be emitted for that unit
- **AND** the reason SHALL indicate "20+ damage"
- **AND** the triggerSource SHALL reflect the damage trigger

#### Scenario: Skip destroyed or unconscious units

- **GIVEN** a destroyed unit or a unit with pilotConscious=false
- **WHEN** `checkAndQueueDamagePSRs(session)` is called
- **THEN** no PSR SHALL be queued for that unit

### Requirement: PSR Resolution with Fall Integration

The system SHALL resolve all pending PSRs for each unit, applying the first-failure-clears-remaining rule, and on failure trigger fall mechanics including fall damage, prone status, facing change, and pilot damage.

#### Scenario: Successful PSR — unit stays standing

- **GIVEN** unit "mech-1" with piloting skill 5 and 1 pending PSR
- **AND** the 2d6 roll meets the target number
- **WHEN** `resolvePendingPSRs(session, diceRoller)` is called
- **THEN** a PSRResolved event SHALL be emitted with passed=true
- **AND** no UnitFell event SHALL be emitted

#### Scenario: Failed PSR triggers fall

- **GIVEN** unit "mech-1" with 1 pending PSR and a failed roll
- **WHEN** `resolvePendingPSRs(session, diceRoller)` is called
- **THEN** a PSRResolved event SHALL be emitted with passed=false
- **AND** `resolveFall` from fall-mechanics SHALL be called with tonnage=50, current facing, and height=0
- **AND** a UnitFell event SHALL be emitted with fallDamage, newFacing, and pilotDamage
- **AND** a PilotHit event SHALL be emitted with wounds=1 from the fall

#### Scenario: First failure clears remaining PSRs

- **GIVEN** unit "mech-1" with 3 pending PSRs
- **AND** the first PSR fails
- **WHEN** resolving PSRs via `resolveAllPSRs` from piloting-skill-rolls
- **THEN** the first PSR SHALL emit PSRResolved with passed=false
- **AND** the remaining 2 PSRs SHALL be cleared (emitted as PSRResolved with passed=false, roll=0)
- **AND** only one fall SHALL occur

#### Scenario: Gyro destroyed causes automatic fall

- **GIVEN** a unit with componentDamage.gyroHits indicating destroyed gyro
- **AND** pending PSRs exist
- **WHEN** `resolvePendingPSRs(session, diceRoller)` is called
- **THEN** `isGyroDestroyed` SHALL return true
- **AND** all PSRs SHALL be resolved as failed with targetNumber=Infinity, roll=0
- **AND** a UnitFell event SHALL be emitted (automatic fall, no dice roll)
- **AND** a PilotHit event SHALL be emitted for fall damage

#### Scenario: Skip destroyed and unconscious units

- **GIVEN** a destroyed unit with pending PSRs
- **WHEN** `resolvePendingPSRs(session, diceRoller)` is called
- **THEN** that unit's PSRs SHALL be skipped entirely

### Requirement: Heat Phase Resolution

The system SHALL resolve the heat phase by computing heat generation (movement + weapons + engine critical hits), applying heat dissipation (heat sinks minus destroyed sinks), and then evaluating heat thresholds for shutdown checks, ammo explosion checks, and pilot heat damage.

#### Scenario: Heat generation from movement

- **GIVEN** unit "mech-1" declared movement with heatGenerated=2 this turn
- **WHEN** `resolveHeatPhase(session, diceRoller)` is called
- **THEN** movement heat of 2 SHALL be included in total heat generated

#### Scenario: Heat generation from weapons

- **GIVEN** unit "mech-1" declared attacks with weapons generating heat [3, 3, 1]
- **WHEN** resolving heat phase
- **THEN** weapon heat of 7 SHALL be included in total heat generated

#### Scenario: Engine critical hit heat generation

- **GIVEN** unit "mech-1" has componentDamage.engineHits=2
- **WHEN** resolving heat phase
- **THEN** engine heat SHALL be 2 × ENGINE_HIT_HEAT (5) = 10
- **AND** a HeatGenerated event SHALL be emitted with source="external"

#### Scenario: Heat dissipation with functional heat sinks

- **GIVEN** unit "mech-1" has 10 heat sinks and 0 destroyed
- **AND** current heat is 15
- **WHEN** dissipation is applied
- **THEN** a HeatDissipated event SHALL be emitted with dissipation=10 and newHeat=5

#### Scenario: Heat dissipation reduced by destroyed heat sinks

- **GIVEN** unit "mech-1" has 10 heat sinks and 3 destroyed
- **WHEN** calculating dissipation
- **THEN** effective dissipation SHALL be max(0, 10 - 3) = 7

#### Scenario: Automatic shutdown at heat >= 30

- **GIVEN** unit "mech-1" has final heat of 32 after dissipation
- **WHEN** evaluating heat thresholds
- **THEN** a ShutdownCheck event SHALL be emitted with targetNumber=Infinity and shutdownOccurred=true
- **AND** a PSRTriggered event SHALL be emitted with reason="Reactor shutdown" and triggerSource="heat_shutdown"

#### Scenario: Shutdown check at heat >= 14

- **GIVEN** unit "mech-1" has final heat of 18 after dissipation
- **AND** `getShutdownTN(18)` returns target number > 0
- **WHEN** evaluating shutdown check
- **THEN** a 2d6 roll SHALL be made against the shutdown target number
- **AND** a ShutdownCheck event SHALL be emitted with the roll and result
- **AND** if the roll fails, a PSRTriggered event SHALL be emitted for reactor shutdown

#### Scenario: Ammo explosion check at high heat (auto-explode at 30+)

- **GIVEN** unit "mech-1" has final heat >= 30
- **AND** the unit has explosive ammo bins with remaining rounds
- **WHEN** evaluating ammo explosion
- **THEN** `resolveAmmoExplosion` SHALL be called for each explosive bin
- **AND** if total damage > 0, a UnitDestroyed event SHALL be emitted with cause="ammo_explosion"

#### Scenario: Ammo explosion check at moderate heat

- **GIVEN** unit "mech-1" has final heat where `getAmmoExplosionTN` returns a finite target number
- **AND** the unit has explosive ammo
- **WHEN** a 2d6 roll fails the ammo explosion check
- **THEN** the first explosive ammo bin SHALL be resolved via `resolveAmmoExplosion`
- **AND** a UnitDestroyed event SHALL be emitted if explosion damage > 0

#### Scenario: Pilot heat damage at extreme heat

- **GIVEN** unit "mech-1" has final heat where `getPilotHeatDamage(heat, lifeSupportHits)` returns > 0
- **WHEN** evaluating pilot heat effects
- **THEN** a PilotHit event SHALL be emitted with the computed pilot damage

#### Scenario: Skip destroyed units in heat phase

- **GIVEN** a destroyed unit in the session
- **WHEN** resolving heat phase
- **THEN** that unit SHALL be skipped entirely (no heat generation, dissipation, or checks)

#### Scenario: Heat phase rejects wrong phase

- **GIVEN** a session in Movement phase
- **WHEN** `resolveHeatPhase(session)` is called
- **THEN** the system SHALL throw "Not in heat phase"

### Requirement: Replay and Time-Travel

The system SHALL support replaying game state to any point in the event history by sequence number or turn number.

#### Scenario: Replay to specific sequence

- **GIVEN** a session with 50 events (sequences 0–49)
- **WHEN** `replayToSequence(session, 25)` is called
- **THEN** only events with sequence <= 25 SHALL be applied
- **AND** the returned state SHALL reflect the game at that point

#### Scenario: Replay to specific turn

- **GIVEN** a session with events spanning turns 1–5
- **WHEN** `replayToTurn(session, 3)` is called
- **THEN** only events with turn <= 3 SHALL be applied

### Requirement: Game Log Generation

The system SHALL generate human-readable text logs of all game events.

#### Scenario: Generate log with all event types

- **GIVEN** a session with events including game_created, phase_changed, movement_declared, attack_declared, attack_resolved, damage_applied, unit_destroyed
- **WHEN** `generateGameLog(session)` is called
- **THEN** each event SHALL produce a formatted line: `[Turn N/Phase] HH:MM:SS: Description`
- **AND** movement events SHALL include unit ID
- **AND** attack events SHALL include unit ID
- **AND** destruction events SHALL include unit ID

#### Scenario: Unknown event types displayed as raw type

- **GIVEN** an event with an unrecognized type string
- **WHEN** generating the game log
- **THEN** the event SHALL be rendered with its raw type string

### Requirement: Full Turn Orchestration Flow

The system SHALL support a complete turn flow by composing phase-level functions in sequence: rollInitiative → declareMovement/lockMovement for all units → advancePhase → declareAttack/lockAttack for all units → resolveAllAttacks → checkAndQueueDamagePSRs → resolvePendingPSRs → advancePhase → (physical attacks) → advancePhase → resolveHeatPhase → advancePhase → advancePhase (End → next Initiative).

#### Scenario: Complete turn 1 with movement, attack, and heat

- **GIVEN** a started session with 2 units ("mech-1" Player, "mech-2" Opponent) in turn 1, Initiative phase
- **WHEN** executing a full turn:
  1. `rollInitiative(session)` — InitiativeRolled event
  2. `advancePhase` — to Movement
  3. `declareMovement` for "mech-1" (Walk, 3 MP, 1 heat)
  4. `lockMovement("mech-1")`
  5. `declareMovement` for "mech-2" (Walk, 4 MP, 1 heat)
  6. `lockMovement("mech-2")`
  7. `advancePhase` — to WeaponAttack
  8. `declareAttack` for "mech-1" targeting "mech-2" with Medium Laser
  9. `lockAttack("mech-1")`
  10. `declareAttack` for "mech-2" targeting "mech-1" with AC/5
  11. `lockAttack("mech-2")`
  12. `resolveAllAttacks` — AttackResolved + DamageApplied events
  13. `checkAndQueueDamagePSRs` — PSRTriggered if 20+ damage
  14. `resolvePendingPSRs` — PSRResolved + UnitFell if failed
  15. `advancePhase` — to PhysicalAttack
  16. Lock all units (no physical attacks declared)
  17. `advancePhase` — to Heat
  18. `resolveHeatPhase` — HeatGenerated + HeatDissipated events
  19. `advancePhase` — to End
  20. `advancePhase` — to Initiative (turn 2)
- **THEN** the session SHALL have turn=2, phase=Initiative
- **AND** all events from the turn SHALL be in the event log
- **AND** currentState SHALL reflect all cumulative damage, heat, and status changes

#### Scenario: Multi-turn combat with unit destruction

- **GIVEN** a session where "mech-2" has accumulated significant damage over turns 1-2
- **AND** in turn 3, "mech-1" fires weapons that destroy "mech-2" (center torso destroyed)
- **WHEN** the attack resolution pipeline completes
- **THEN** a UnitDestroyed event SHALL be emitted for "mech-2"
- **AND** subsequent phases SHALL skip "mech-2" for heat, PSR, and movement
- **AND** `endGame` may be called with winner=Player if only one side survives

### Requirement: Combat Subsystem Integration Map

The system SHALL integrate with all combat subsystems through explicit function calls, not implicit coupling.

#### Scenario: To-hit integration via calculateToHit

- **GIVEN** an attack declaration
- **WHEN** computing the to-hit number
- **THEN** `calculateToHit` from to-hit-resolution SHALL be called with attacker state (gunnery, movementType, heat, damageModifiers), target state (movementType, hexesMoved, prone, immobile, partialCover), rangeBracket, and range

#### Scenario: Firing arc integration via calculateFiringArc

- **GIVEN** a successful hit requiring hit location
- **WHEN** determining the firing arc
- **THEN** `calculateFiringArc` from spatial-combat-system SHALL be called with attacker position, target position, and target facing

#### Scenario: Hit location integration via determineHitLocationFromRoll

- **GIVEN** a firing arc and a dice roll
- **WHEN** determining hit location
- **THEN** `determineHitLocationFromRoll` from to-hit-resolution SHALL be called to determine the body location struck

#### Scenario: Damage pipeline integration via resolveDamage

- **GIVEN** a hit with location and damage amount
- **WHEN** applying damage
- **THEN** `resolveDamage` from damage-system SHALL be called with the target's current damage state, location, and damage amount
- **AND** the result SHALL include locationDamages array, pilotDamage, unitDestroyed flag, and destructionCause

#### Scenario: Critical hit integration via resolveCriticalHits

- **GIVEN** internal structure exposed (structureDamage > 0, not destroyed)
- **WHEN** checking for critical hits
- **THEN** `resolveCriticalHits` from critical-hit-resolution SHALL be called with unitId, location, critical slot manifest, and component damage

#### Scenario: TAC integration via checkTACTrigger and processTAC

- **GIVEN** a hit location roll of 2
- **WHEN** checking for Through-Armor Critical
- **THEN** `checkTACTrigger` SHALL determine the TAC location
- **AND** `processTAC` SHALL apply the TAC if applicable

#### Scenario: PSR integration via resolveAllPSRs

- **GIVEN** a unit with pending PSRs and functional gyro
- **WHEN** resolving PSRs
- **THEN** `resolveAllPSRs` from piloting-skill-rolls SHALL be called with piloting skill, pending PSRs, component damage, and pilot wounds

#### Scenario: Fall integration via resolveFall

- **GIVEN** a failed PSR
- **WHEN** the unit falls
- **THEN** `resolveFall` from fall-mechanics SHALL be called with tonnage, facing, height, and d6 roller

#### Scenario: Ammo integration via consumeAmmo and isEnergyWeapon

- **GIVEN** a weapon being resolved
- **WHEN** determining ammo consumption
- **THEN** `isEnergyWeapon` SHALL be checked first
- **AND** if non-energy, `consumeAmmo` from ammo tracking SHALL be called

#### Scenario: Heat constants integration

- **GIVEN** engine critical hits exist
- **WHEN** computing heat generation
- **THEN** `ENGINE_HIT_HEAT` from heat constants SHALL be used (5 per engine hit)
- **AND** `getShutdownTN`, `getAmmoExplosionTN`, `getPilotHeatDamage` SHALL be used for heat threshold checks

## Dependencies

- **game-event-system**: All 22+ event factory functions for creating typed game events
- **game-state-management**: `deriveState` for state derivation, `allUnitsLocked` for phase guards
- **to-hit-resolution**: `calculateToHit` for modifier aggregation, `determineHitLocationFromRoll` for hit locations, `isHeadHit` for head-capping
- **spatial-combat-system**: `calculateFiringArc` for arc determination from positions
- **damage-system**: `resolveDamage` pipeline for armor/structure/pilot damage resolution
- **critical-hit-resolution**: `resolveCriticalHits`, `checkTACTrigger`, `processTAC`, `buildDefaultCriticalSlotManifest` for crit processing
- **piloting-skill-rolls**: `resolveAllPSRs`, `checkPhaseDamagePSR`, `isLegLocation`, `isGyroDestroyed` for PSR handling
- **fall-mechanics**: `resolveFall` for fall damage, facing change, and pilot damage
- **weapon-resolution-system**: Cluster/special weapon mechanics (referenced via weapon attack data)
- **combat-resolution**: ACAR system for non-tactical resolution (separate flow)

## Used By

- **Campaign System**: Session results feed into campaign progression, pilot XP, and unit repair
- **Battle Replay**: Event log enables complete battle reconstruction and step-through
- **Combat Analytics**: Event stream provides data for damage matrices, kill credits, and performance metrics
- **Multiplayer Sync**: Event-sourced architecture enables consistent state across clients
- **AI System**: Session API provides the action interface for AI decision-making
