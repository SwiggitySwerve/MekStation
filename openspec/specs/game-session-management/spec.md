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
- **Encounter Store**: Manages encounter CRUD operations via API routes
- **Gameplay Store**: Manages interactive session state and UI state
- **Quick Game Store**: Manages standalone quick game sessions with session storage persistence

---

## Encounter Store

The Encounter Store is a Zustand store that manages encounter state in the UI layer. It uses API routes for persistence to avoid bundling SQLite in the browser.

**Implementation**: `src/stores/useEncounterStore.ts`

### Requirement: Encounter CRUD via API Routes

The store SHALL provide CRUD operations for encounters by calling API routes and maintaining local state.

#### Scenario: Load all encounters

- **GIVEN** the store is initialized
- **WHEN** `loadEncounters()` is called
- **THEN** a GET request SHALL be made to `/api/encounters`
- **AND** the response SHALL contain an array of IEncounter objects
- **AND** the store's `encounters` array SHALL be updated with the response
- **AND** `isLoading` SHALL be set to false

#### Scenario: Create a new encounter

- **GIVEN** valid ICreateEncounterInput data
- **WHEN** `createEncounter(input)` is called
- **THEN** a POST request SHALL be made to `/api/encounters` with the input as JSON
- **AND** on success, the response SHALL contain the new encounter ID
- **AND** `loadEncounters()` SHALL be called to refresh the list
- **AND** the new encounter ID SHALL be returned

#### Scenario: Update an encounter

- **GIVEN** an encounter ID and IUpdateEncounterInput data
- **WHEN** `updateEncounter(id, input)` is called
- **THEN** a PATCH request SHALL be made to `/api/encounters/{id}` with the input as JSON
- **AND** on success, `loadEncounters()` SHALL be called to refresh the list
- **AND** true SHALL be returned

#### Scenario: Delete an encounter

- **GIVEN** an encounter ID
- **WHEN** `deleteEncounter(id)` is called
- **THEN** a DELETE request SHALL be made to `/api/encounters/{id}`
- **AND** on success, if the deleted encounter was selected, `selectedEncounterId` SHALL be set to null
- **AND** `loadEncounters()` SHALL be called to refresh the list
- **AND** true SHALL be returned

### Requirement: Encounter Selection and Retrieval

The store SHALL maintain a selected encounter ID and provide retrieval methods.

#### Scenario: Select an encounter

- **GIVEN** an encounter ID
- **WHEN** `selectEncounter(id)` is called
- **THEN** `selectedEncounterId` SHALL be set to the provided ID

#### Scenario: Get selected encounter

- **GIVEN** a selected encounter ID exists
- **WHEN** `getSelectedEncounter()` is called
- **THEN** the IEncounter object with matching ID SHALL be returned from the `encounters` array
- **AND** if no encounter is selected, null SHALL be returned

#### Scenario: Get encounter by ID

- **GIVEN** an encounter ID
- **WHEN** `getEncounter(id)` is called
- **THEN** the IEncounter object with matching ID SHALL be returned from the `encounters` array
- **AND** if not found, undefined SHALL be returned

### Requirement: Force Assignment

The store SHALL provide methods to assign player and opponent forces to encounters.

#### Scenario: Set player force

- **GIVEN** an encounter ID and a force ID
- **WHEN** `setPlayerForce(encounterId, forceId)` is called
- **THEN** a PUT request SHALL be made to `/api/encounters/{encounterId}/player-force` with `{forceId}` as JSON
- **AND** on success, `loadEncounters()` SHALL be called to refresh the list
- **AND** true SHALL be returned

#### Scenario: Set opponent force

- **GIVEN** an encounter ID and a force ID
- **WHEN** `setOpponentForce(encounterId, forceId)` is called
- **THEN** a PUT request SHALL be made to `/api/encounters/{encounterId}/opponent-force` with `{forceId}` as JSON
- **AND** on success, `loadEncounters()` SHALL be called to refresh the list
- **AND** true SHALL be returned

#### Scenario: Clear opponent force

- **GIVEN** an encounter ID
- **WHEN** `clearOpponentForce(encounterId)` is called
- **THEN** a DELETE request SHALL be made to `/api/encounters/{encounterId}/opponent-force`
- **AND** on success, `loadEncounters()` SHALL be called to refresh the list
- **AND** true SHALL be returned

### Requirement: Template Application

The store SHALL support applying scenario templates to encounters.

#### Scenario: Apply a scenario template

- **GIVEN** an encounter ID and a ScenarioTemplateType
- **WHEN** `applyTemplate(encounterId, template)` is called
- **THEN** a PUT request SHALL be made to `/api/encounters/{encounterId}/template` with `{template}` as JSON
- **AND** on success, `loadEncounters()` SHALL be called to refresh the list
- **AND** true SHALL be returned

### Requirement: Encounter Validation

The store SHALL validate encounters and cache validation results.

#### Scenario: Validate an encounter

- **GIVEN** an encounter ID
- **WHEN** `validateEncounter(id)` is called
- **THEN** a GET request SHALL be made to `/api/encounters/{id}/validate`
- **AND** the response SHALL contain an IEncounterValidationResult object
- **AND** the validation result SHALL be stored in the `validations` Map keyed by encounter ID
- **AND** the validation result SHALL be returned

#### Scenario: Validation cache lookup

- **GIVEN** an encounter has been validated
- **WHEN** the `validations` Map is accessed with the encounter ID
- **THEN** the cached IEncounterValidationResult SHALL be returned

### Requirement: Encounter Launch

The store SHALL launch encounters and return the resulting game session ID.

#### Scenario: Launch an encounter

- **GIVEN** an encounter ID
- **WHEN** `launchEncounter(id)` is called
- **THEN** a POST request SHALL be made to `/api/encounters/{id}/launch`
- **AND** on success, the response SHALL contain a `gameSessionId`
- **AND** `loadEncounters()` SHALL be called to refresh the list
- **AND** the `gameSessionId` SHALL be returned

#### Scenario: Launch fails validation

- **GIVEN** an encounter that fails validation
- **WHEN** `launchEncounter(id)` is called
- **THEN** the API SHALL return success=false with an error message
- **AND** the error message SHALL be set in the store's `error` field
- **AND** null SHALL be returned

### Requirement: Encounter Cloning

The store SHALL support cloning encounters with a new name.

#### Scenario: Clone an encounter

- **GIVEN** an encounter ID and a new name
- **WHEN** `cloneEncounter(id, newName)` is called
- **THEN** a POST request SHALL be made to `/api/encounters/{id}/clone` with `{newName}` as JSON
- **AND** on success, the response SHALL contain the new encounter ID
- **AND** `loadEncounters()` SHALL be called to refresh the list
- **AND** the new encounter ID SHALL be returned

### Requirement: Filtering and Search

The store SHALL support filtering encounters by status and search query.

#### Scenario: Set status filter

- **GIVEN** a status value (EncounterStatus or 'all')
- **WHEN** `setStatusFilter(status)` is called
- **THEN** `statusFilter` SHALL be set to the provided value

#### Scenario: Set search query

- **GIVEN** a search query string
- **WHEN** `setSearchQuery(query)` is called
- **THEN** `searchQuery` SHALL be set to the provided value

#### Scenario: Get filtered encounters

- **GIVEN** a status filter of EncounterStatus.Ready and a search query of "test"
- **WHEN** `getFilteredEncounters()` is called
- **THEN** only encounters with status=Ready SHALL be included
- **AND** only encounters where name, description, playerForce.forceName, or opponentForce.forceName contains "test" (case-insensitive) SHALL be included
- **AND** the filtered array SHALL be returned

#### Scenario: Get all encounters when filter is 'all'

- **GIVEN** a status filter of 'all'
- **WHEN** `getFilteredEncounters()` is called
- **THEN** all encounters SHALL be included (no status filtering)
- **AND** search query filtering SHALL still apply

### Requirement: Error Handling

The store SHALL capture and expose API errors.

#### Scenario: API error during load

- **GIVEN** the API returns a non-OK response
- **WHEN** `loadEncounters()` is called
- **THEN** the error message SHALL be set in the store's `error` field
- **AND** `isLoading` SHALL be set to false

#### Scenario: Clear error

- **GIVEN** an error exists in the store
- **WHEN** `clearError()` is called
- **THEN** `error` SHALL be set to null

---

## Gameplay Store

The Gameplay Store is a Zustand store that manages game session state and UI state for interactive gameplay.

**Implementation**: `src/stores/useGameplayStore.ts`

### Requirement: Session State Management

The store SHALL manage IGameSession state and provide session loading methods.

#### Scenario: Load a session by ID

- **GIVEN** a session ID
- **WHEN** `loadSession(sessionId)` is called
- **THEN** `isLoading` SHALL be set to true
- **AND** if sessionId is "demo", `createDemoSession()` SHALL be called
- **AND** otherwise, an API call SHALL be made to load the session
- **AND** on success, `session` SHALL be set to the loaded session
- **AND** `isLoading` SHALL be set to false

#### Scenario: Set session directly

- **GIVEN** an IGameSession object
- **WHEN** `setSession(session)` is called
- **THEN** `session` SHALL be set to the provided session
- **AND** `isLoading` SHALL be set to false
- **AND** `error` SHALL be set to null

#### Scenario: Create demo session

- **GIVEN** the store is initialized
- **WHEN** `createDemoSession()` is called
- **THEN** a demo session SHALL be created via `createDemoSession()` fixture
- **AND** `unitWeapons` SHALL be populated via `createDemoWeapons()`
- **AND** `maxArmor` SHALL be populated via `createDemoMaxArmor()`
- **AND** `maxStructure` SHALL be populated via `createDemoMaxStructure()`
- **AND** `pilotNames` SHALL be populated via `createDemoPilotNames()`
- **AND** `heatSinks` SHALL be populated via `createDemoHeatSinks()`
- **AND** `isLoading` SHALL be set to false

### Requirement: Interactive Session Management

The store SHALL manage InteractiveSession state for player-controlled gameplay.

#### Scenario: Set interactive session

- **GIVEN** an InteractiveSession object
- **WHEN** `setInteractiveSession(interactiveSession)` is called
- **THEN** `session` SHALL be set to `interactiveSession.getSession()`
- **AND** `interactiveSession` SHALL be set to the provided object
- **AND** `interactivePhase` SHALL be set to InteractivePhase.SelectUnit
- **AND** `spectatorMode` SHALL be set to null
- **AND** `isLoading` SHALL be set to false

#### Scenario: Set spectator mode

- **GIVEN** an InteractiveSession object and a SpectatorMode config
- **WHEN** `setSpectatorMode(interactiveSession, spectatorMode)` is called
- **THEN** `session` SHALL be set to `interactiveSession.getSession()`
- **AND** `interactiveSession` SHALL be set to the provided object
- **AND** `interactivePhase` SHALL be set to InteractivePhase.AITurn
- **AND** `spectatorMode` SHALL be set to the provided config
- **AND** `isLoading` SHALL be set to false

### Requirement: UI State Management

The store SHALL manage IGameplayUIState for selected units, targets, and queued weapons.

#### Scenario: Select a unit

- **GIVEN** a unit ID
- **WHEN** `selectUnit(unitId)` is called
- **THEN** `ui.selectedUnitId` SHALL be set to the provided ID

#### Scenario: Set target unit

- **GIVEN** a unit ID
- **WHEN** `setTarget(unitId)` is called
- **THEN** `ui.targetUnitId` SHALL be set to the provided ID

#### Scenario: Select weapon for attack

- **GIVEN** a weapon ID
- **WHEN** `selectWeapon(weaponId)` is called
- **THEN** if the weapon is already in `ui.queuedWeaponIds`, it SHALL be removed
- **AND** if the weapon is not in `ui.queuedWeaponIds`, it SHALL be added
- **AND** `ui.queuedWeaponIds` SHALL be updated immutably

#### Scenario: Clear queued weapons

- **GIVEN** weapons are queued
- **WHEN** `handleAction('clear')` is called
- **THEN** `ui.queuedWeaponIds` SHALL be set to an empty array

### Requirement: Interactive Movement

The store SHALL manage interactive movement selection and execution.

#### Scenario: Select unit for movement

- **GIVEN** a unit ID
- **WHEN** `selectUnitForMovement(unitId)` is called
- **THEN** `interactiveSession.getAvailableActions(unitId)` SHALL be called
- **AND** `ui.selectedUnitId` SHALL be set to the unit ID
- **AND** `interactivePhase` SHALL be set to InteractivePhase.SelectMovement
- **AND** `validMovementHexes` SHALL be set to the available moves from the actions

#### Scenario: Move unit to target hex

- **GIVEN** a unit ID and a target hex
- **WHEN** `moveUnit(unitId, targetHex)` is called
- **THEN** `interactiveSession.applyMovement(unitId, targetHex, Facing.North, MovementType.Walk)` SHALL be called
- **AND** `session` SHALL be updated to `interactiveSession.getSession()`
- **AND** `interactivePhase` SHALL be set to InteractivePhase.SelectUnit
- **AND** `validMovementHexes` SHALL be cleared
- **AND** `ui.selectedUnitId` SHALL be set to null

### Requirement: Interactive Combat

The store SHALL manage interactive attack target selection and weapon firing.

#### Scenario: Select attack target

- **GIVEN** an attacker unit is selected and a target unit ID is provided
- **WHEN** `selectAttackTarget(targetUnitId)` is called
- **THEN** the attacker and target states SHALL be retrieved from `interactiveSession.getState()`
- **AND** a base hit chance SHALL be calculated (58% for gunnery 4)
- **AND** `ui.targetUnitId` SHALL be set to the target ID
- **AND** `interactivePhase` SHALL be set to InteractivePhase.SelectWeapons
- **AND** `hitChance` SHALL be set to the calculated value

#### Scenario: Fire weapons at target

- **GIVEN** a selected unit, target unit, and queued weapons
- **WHEN** `fireWeapons()` is called
- **THEN** `interactiveSession.applyAttack(selectedUnitId, targetUnitId, weaponIds)` SHALL be called
- **AND** if the game is over, `interactivePhase` SHALL be set to InteractivePhase.GameOver
- **AND** otherwise, `interactivePhase` SHALL be set to InteractivePhase.SelectUnit
- **AND** `validTargetIds`, `hitChance`, `selectedUnitId`, `targetUnitId`, and `queuedWeaponIds` SHALL be cleared

### Requirement: AI Turn Execution

The store SHALL execute AI turns for the opponent side.

#### Scenario: Run AI turn

- **GIVEN** an interactive session in Movement phase
- **WHEN** `runAITurn()` is called
- **THEN** `interactivePhase` SHALL be set to InteractivePhase.AITurn
- **AND** `interactiveSession.runAITurn(GameSide.Opponent)` SHALL be called
- **AND** `interactiveSession.advancePhase()` SHALL be called to advance to WeaponAttack
- **AND** `interactiveSession.runAITurn(GameSide.Opponent)` SHALL be called again
- **AND** `interactiveSession.advancePhase()` SHALL be called to advance to Heat
- **AND** `interactiveSession.advancePhase()` SHALL be called to advance to End
- **AND** if the game is over, `interactivePhase` SHALL be set to InteractivePhase.GameOver
- **AND** otherwise, `interactivePhase` SHALL be set to InteractivePhase.SelectUnit

### Requirement: Phase Advancement

The store SHALL advance game phases and handle phase transitions.

#### Scenario: Advance interactive phase

- **GIVEN** an interactive session in Initiative phase
- **WHEN** `advanceInteractivePhase()` is called
- **THEN** `interactiveSession.advancePhase()` SHALL be called (rolls initiative, goes to Movement)
- **AND** `session` SHALL be updated to `interactiveSession.getSession()`
- **AND** if the game is over, `interactivePhase` SHALL be set to InteractivePhase.GameOver
- **AND** otherwise, `interactivePhase` SHALL be set to InteractivePhase.SelectUnit
- **AND** `validMovementHexes`, `validTargetIds`, `hitChance`, and UI selections SHALL be cleared

#### Scenario: Skip phase

- **GIVEN** an interactive session
- **WHEN** `skipPhase()` is called
- **THEN** `interactiveSession.advancePhase()` SHALL be called
- **AND** `session` SHALL be updated to `interactiveSession.getSession()`
- **AND** if the game is over, `interactivePhase` SHALL be set to InteractivePhase.GameOver
- **AND** otherwise, `interactivePhase` SHALL be set to InteractivePhase.SelectUnit
- **AND** `validMovementHexes`, `validTargetIds`, `hitChance`, and UI selections SHALL be cleared

### Requirement: Game Actions

The store SHALL handle game actions like lock, undo, skip, next-turn, and concede.

#### Scenario: Lock movement

- **GIVEN** a selected unit in Movement phase
- **WHEN** `handleAction('lock')` is called
- **THEN** `lockMovement(session, selectedUnitId)` SHALL be called
- **AND** `session` SHALL be updated to the returned session

#### Scenario: Undo last event

- **GIVEN** a session with multiple events
- **WHEN** `handleAction('undo')` is called
- **THEN** the last event SHALL be removed from the events array
- **AND** `replayToSequence(session, previousSequence)` SHALL be called to derive the previous state
- **AND** `session` SHALL be updated with the new events array and replayed state

#### Scenario: Skip to next phase

- **GIVEN** a session where `canAdvancePhase(session)` returns true
- **WHEN** `handleAction('skip')` is called
- **THEN** `advancePhase(session)` SHALL be called
- **AND** `session` SHALL be updated to the returned session

#### Scenario: Next turn

- **GIVEN** a session in End or Initiative phase
- **WHEN** `handleAction('next-turn')` is called
- **THEN** if in End phase, `advancePhase(session)` SHALL be called to go to Initiative
- **AND** `rollInitiative(session)` SHALL be called
- **AND** `advancePhase(session)` SHALL be called to go to Movement
- **AND** `session` SHALL be updated to the final session

#### Scenario: Concede game

- **GIVEN** an active session
- **WHEN** `handleAction('concede')` is called
- **THEN** `endGame(session, GameSide.Opponent, 'concede')` SHALL be called
- **AND** `session` SHALL be updated to the returned session

### Requirement: Interactive Hex and Token Clicks

The store SHALL handle hex and token clicks for interactive gameplay.

#### Scenario: Click hex during movement selection

- **GIVEN** `interactivePhase` is SelectMovement and a unit is selected
- **WHEN** `handleInteractiveHexClick(hex)` is called
- **THEN** `moveUnit(selectedUnitId, hex)` SHALL be called

#### Scenario: Click player unit during movement phase

- **GIVEN** a player unit in Movement phase
- **WHEN** `handleInteractiveTokenClick(unitId)` is called
- **THEN** `selectUnitForMovement(unitId)` SHALL be called

#### Scenario: Click player unit during weapon attack phase

- **GIVEN** a player unit in WeaponAttack phase and interactivePhase is SelectUnit
- **WHEN** `handleInteractiveTokenClick(unitId)` is called
- **THEN** `ui.selectedUnitId` SHALL be set to the unit ID
- **AND** `interactivePhase` SHALL be set to InteractivePhase.SelectTarget
- **AND** `validTargetIds` SHALL be set to all opponent units that are not destroyed

#### Scenario: Click opponent unit during target selection

- **GIVEN** an opponent unit in WeaponAttack phase and interactivePhase is SelectTarget
- **WHEN** `handleInteractiveTokenClick(unitId)` is called
- **THEN** `selectAttackTarget(unitId)` SHALL be called

### Requirement: Game Over Check

The store SHALL check for game over conditions.

#### Scenario: Check game over

- **GIVEN** an interactive session where `isGameOver()` returns true
- **WHEN** `checkGameOver()` is called
- **THEN** `interactiveSession.getResult()` SHALL be called
- **AND** `interactivePhase` SHALL be set to InteractivePhase.GameOver
- **AND** true SHALL be returned

#### Scenario: Game not over

- **GIVEN** an interactive session where `isGameOver()` returns false
- **WHEN** `checkGameOver()` is called
- **THEN** false SHALL be returned

### Requirement: Store Reset

The store SHALL support resetting to initial state.

#### Scenario: Reset store

- **GIVEN** a store with active session and UI state
- **WHEN** `reset()` is called
- **THEN** all state fields SHALL be reset to `initialState` values

---

## Quick Game Store

The Quick Game Store is a Zustand store that manages standalone quick game sessions with session storage persistence. Quick sessions are designed for fast, standalone battles without campaign integration—units are added from the compendium, adapted for gameplay, and the session is auto-resolved or played interactively. Session storage ensures the game survives page refreshes but clears when the tab closes, maintaining the ephemeral nature of quick play.

**Implementation**: `src/stores/useQuickGameStore.ts`

**Source**: `src/stores/useQuickGameStore.ts:1-681`, `src/types/quickgame/QuickGameInterfaces.ts:1-336`, `src/engine/GameEngine.ts:1-631`

### Requirement: Session Storage Persistence

The store SHALL persist game state to session storage and restore on page refresh.

#### Scenario: Persist game state

- **GIVEN** a quick game instance exists
- **WHEN** any state-modifying action is called
- **THEN** the `game` field SHALL be persisted to session storage under the key `QUICK_GAME_STORAGE_KEY`
- **AND** `isDirty` SHALL be set to true

#### Scenario: Restore game state on page refresh

- **GIVEN** a persisted game exists in session storage
- **WHEN** the store is initialized
- **THEN** the `game` field SHALL be restored from session storage
- **AND** `restoreFromSession()` SHALL return true

#### Scenario: No persisted game

- **GIVEN** no persisted game exists in session storage
- **WHEN** the store is initialized
- **THEN** `game` SHALL be null
- **AND** `restoreFromSession()` SHALL return false

### Requirement: Game Lifecycle

The store SHALL manage quick game lifecycle (start, clear, save).

#### Scenario: Start new game

- **GIVEN** the store is initialized
- **WHEN** `startNewGame()` is called
- **THEN** a new IQuickGameInstance SHALL be created via `createQuickGameInstance()`
- **AND** `game` SHALL be set to the new instance
- **AND** `isDirty` SHALL be set to true
- **AND** `error` SHALL be set to null

#### Scenario: Clear game

- **GIVEN** an active game exists
- **WHEN** `clearGame()` is called
- **THEN** `game` SHALL be set to null
- **AND** `isDirty` SHALL be set to false
- **AND** `error` SHALL be set to null

#### Scenario: Save to session

- **GIVEN** an active game with isDirty=true
- **WHEN** `saveToSession()` is called
- **THEN** `isDirty` SHALL be set to false
- **AND** the game SHALL be persisted to session storage (handled by middleware)

### Requirement: Unit Management

The store SHALL manage player force units (add, remove, update skills).

#### Scenario: Add unit to player force

- **GIVEN** an active game and an IQuickGameUnitRequest
- **WHEN** `addUnit(request)` is called
- **THEN** a new IQuickGameUnit SHALL be created via `createQuickGameUnit(request)`
- **AND** the unit SHALL be added to `game.playerForce.units`
- **AND** `game.playerForce.totalBV` and `totalTonnage` SHALL be recalculated via `calculateForceTotals(units)`
- **AND** `isDirty` SHALL be set to true

#### Scenario: Remove unit from player force

- **GIVEN** an active game with units
- **WHEN** `removeUnit(instanceId)` is called
- **THEN** the unit with matching `instanceId` SHALL be removed from `game.playerForce.units`
- **AND** `game.playerForce.totalBV` and `totalTonnage` SHALL be recalculated via `calculateForceTotals(units)`
- **AND** `isDirty` SHALL be set to true

#### Scenario: Update unit skills

- **GIVEN** an active game with units
- **WHEN** `updateUnitSkills(instanceId, gunnery, piloting)` is called
- **THEN** the unit with matching `instanceId` SHALL have its `gunnery` and `piloting` fields updated
- **AND** `isDirty` SHALL be set to true

### Requirement: Scenario Configuration

The store SHALL manage scenario configuration and generation.

#### Scenario: Set scenario config

- **GIVEN** an active game and partial IQuickGameScenarioConfig
- **WHEN** `setScenarioConfig(config)` is called
- **THEN** `game.scenarioConfig` SHALL be updated with the provided config (merged)
- **AND** `isDirty` SHALL be set to true

#### Scenario: Generate scenario

- **GIVEN** an active game with at least one player unit
- **WHEN** `generateScenario()` is called
- **THEN** `isLoading` SHALL be set to true
- **AND** `scenarioGenerator.generate()` SHALL be called with config mapped from `game.scenarioConfig` and `game.playerForce`
- **AND** the generated scenario SHALL be set in `game.scenario`
- **AND** opponent units SHALL be created from `scenario.opFor.units` via `createQuickGameUnit()`
- **AND** `game.opponentForce` SHALL be set with the opponent units and totals
- **AND** `isLoading` SHALL be set to false
- **AND** `isDirty` SHALL be set to true

#### Scenario: Generate scenario with no units

- **GIVEN** an active game with no player units
- **WHEN** `generateScenario()` is called
- **THEN** `error` SHALL be set to "Add at least one unit to generate scenario"

### Requirement: Step Navigation

The store SHALL manage step navigation (SelectUnits → ConfigureScenario → Review).

#### Scenario: Next step

- **GIVEN** an active game in SelectUnits step with at least one unit
- **WHEN** `nextStep()` is called
- **THEN** `game.step` SHALL be set to ConfigureScenario
- **AND** `isDirty` SHALL be set to true
- **AND** `error` SHALL be set to null

#### Scenario: Next step validation failure

- **GIVEN** an active game in SelectUnits step with no units
- **WHEN** `nextStep()` is called
- **THEN** `error` SHALL be set to "Add at least one unit to continue"
- **AND** `game.step` SHALL remain SelectUnits

#### Scenario: Previous step

- **GIVEN** an active game in ConfigureScenario step
- **WHEN** `previousStep()` is called
- **THEN** `game.step` SHALL be set to SelectUnits
- **AND** `isDirty` SHALL be set to true
- **AND** `error` SHALL be set to null

### Requirement: Game Control

The store SHALL manage game start, battle resolution, and spectator mode.

#### Scenario: Start game

- **GIVEN** an active game where `canStartGame(game)` returns true
- **WHEN** `startGame()` is called
- **THEN** `game.status` SHALL be set to GameStatus.Active
- **AND** `game.step` SHALL be set to QuickGameStep.Playing
- **AND** `game.turn` SHALL be set to 1
- **AND** `game.phase` SHALL be set to GamePhase.Initiative
- **AND** `isDirty` SHALL be set to true

#### Scenario: Start battle (auto-resolve)

- **GIVEN** an active game with player and opponent forces
- **WHEN** `startBattle()` is called
- **THEN** `isLoading` SHALL be set to true
- **AND** player units SHALL be adapted via `adaptUnit()` for each unit
- **AND** opponent units SHALL be adapted via `adaptUnit()` for each unit
- **AND** a GameEngine instance SHALL be created
- **AND** `engine.runToCompletion(playerAdapted, opponentAdapted, gameUnits)` SHALL be called
- **AND** the resulting session SHALL be set in the gameplay store via `useGameplayStore.getState().setSession(session)`
- **AND** `game.status` SHALL be set to GameStatus.Completed
- **AND** `game.step` SHALL be set to QuickGameStep.Results
- **AND** `game.winner` SHALL be set based on `session.currentState.result.winner`
- **AND** `game.victoryReason` SHALL be set from `session.currentState.result.reason`
- **AND** `game.endedAt` SHALL be set to the current ISO timestamp
- **AND** `game.events` SHALL be set to `session.events`
- **AND** `isLoading` SHALL be set to false

#### Scenario: Start spectator mode

- **GIVEN** an active game with player and opponent forces
- **WHEN** `startSpectatorMode()` is called
- **THEN** `isLoading` SHALL be set to true
- **AND** player and opponent units SHALL be adapted via `adaptUnit()`
- **AND** a GameEngine instance SHALL be created
- **AND** `engine.createInteractiveSession(playerAdapted, opponentAdapted, gameUnits)` SHALL be called
- **AND** the interactive session SHALL be set in the gameplay store via `useGameplayStore.getState().setSpectatorMode(interactiveSession, {enabled: true, playing: true, speed: 1})`
- **AND** `game.status` SHALL be set to GameStatus.Active
- **AND** `game.step` SHALL be set to QuickGameStep.Playing
- **AND** `isLoading` SHALL be set to false

### Requirement: Event Recording and Game End

The store SHALL record game events and handle game end.

#### Scenario: Record event

- **GIVEN** an active game
- **WHEN** `recordEvent(event)` is called
- **THEN** the event SHALL be appended to `game.events`
- **AND** `isDirty` SHALL be set to true

#### Scenario: End game

- **GIVEN** an active game
- **WHEN** `endGame(winner, reason)` is called
- **THEN** `game.status` SHALL be set to GameStatus.Completed
- **AND** `game.step` SHALL be set to QuickGameStep.Results
- **AND** `game.winner` SHALL be set to the provided winner
- **AND** `game.victoryReason` SHALL be set to the provided reason
- **AND** `game.endedAt` SHALL be set to the current ISO timestamp
- **AND** `isDirty` SHALL be set to true

### Requirement: Play Again

The store SHALL support restarting a game with or without resetting units.

#### Scenario: Play again with same units

- **GIVEN** a completed game
- **WHEN** `playAgain(resetUnits=false)` is called
- **THEN** a new IQuickGameInstance SHALL be created
- **AND** player units SHALL be copied from the previous game with new `instanceId` values
- **AND** unit damage SHALL be reset (heat=0, isDestroyed=false, armor/structure restored to max)
- **AND** `game.scenarioConfig` SHALL be copied from the previous game
- **AND** `isDirty` SHALL be set to true

#### Scenario: Play again with reset units

- **GIVEN** a completed game
- **WHEN** `playAgain(resetUnits=true)` is called
- **THEN** a new IQuickGameInstance SHALL be created with default empty player force
- **AND** `isDirty` SHALL be set to true

---

## Quick Session Workflow

The quick session workflow orchestrates the complete flow from unit selection through battle resolution. This section documents the detailed integration between the quick game store, compendium adapter, game engine, and gameplay store.

**Source**: `src/stores/useQuickGameStore.ts:361-551`, `src/engine/GameEngine.ts:113-328`, `src/engine/adapters/CompendiumAdapter.ts`

### Requirement: Unit Setup Flow

The system SHALL support adding units from the compendium, adapting them for gameplay, and configuring pilot skills.

#### Scenario: Add unit from compendium to quick game

- **GIVEN** a user selects a unit from the compendium with sourceUnitId "atlas-as7-d"
- **AND** the unit has chassis="Atlas", variant="AS7-D", bv=1897, tonnage=100
- **WHEN** `addUnit(request)` is called with the unit data
- **THEN** a new IQuickGameUnit SHALL be created via `createQuickGameUnit(request)`
- **AND** the unit SHALL have a unique `instanceId` generated as `unit-${Date.now()}-${random}`
- **AND** default pilot skills SHALL be set (gunnery=4, piloting=5) if not provided
- **AND** `maxArmor` and `maxStructure` SHALL be copied from the request
- **AND** current `armor` and `structure` SHALL be initialized to max values
- **AND** `heat`, `isDestroyed`, and `isWithdrawn` SHALL be initialized to 0/false/false
- **AND** the unit SHALL be added to `game.playerForce.units`
- **AND** force totals SHALL be recalculated via `calculateForceTotals(units)`

**Source**: `src/stores/useQuickGameStore.ts:94-116`, `src/types/quickgame/QuickGameInterfaces.ts:280-302`

#### Scenario: Configure unit pilot skills

- **GIVEN** a quick game unit with instanceId "unit-123"
- **AND** the unit has default skills (gunnery=4, piloting=5)
- **WHEN** `updateUnitSkills("unit-123", 3, 4)` is called
- **THEN** the unit's `gunnery` SHALL be updated to 3
- **AND** the unit's `piloting` SHALL be updated to 4
- **AND** `isDirty` SHALL be set to true
- **AND** the unit's BV SHALL remain unchanged (BV recalculation is out of scope for quick games)

**Source**: `src/stores/useQuickGameStore.ts:143-169`

#### Scenario: Unit adaptation for game engine

- **GIVEN** a quick game unit with sourceUnitId "atlas-as7-d"
- **AND** the unit has gunnery=3, piloting=4
- **WHEN** `startBattle()` or `startSpectatorMode()` is called
- **THEN** `adaptUnit(sourceUnitId, {side, gunnery, piloting})` SHALL be called from CompendiumAdapter
- **AND** the adapter SHALL return an IAdaptedUnit with:
  - `id`: unique game unit ID
  - `weapons`: array of IWeapon objects with damage, heat, range
  - `walkMP`, `runMP`, `jumpMP`: movement capabilities
  - `armor`, `structure`: location-based damage tracking
- **AND** the adapted unit SHALL be passed to GameEngine for session creation

**Source**: `src/stores/useQuickGameStore.ts:371-387`, `src/engine/adapters/CompendiumAdapter.ts` (referenced)

### Requirement: Session Storage Persistence Behavior

The system SHALL persist quick game state to session storage, survive page refreshes, and clear on tab close.

#### Scenario: Persist on state change

- **GIVEN** a quick game instance exists
- **WHEN** any state-modifying action is called (addUnit, setScenarioConfig, etc.)
- **THEN** the `game` field SHALL be serialized to JSON
- **AND** the JSON SHALL be stored in sessionStorage under key `QUICK_GAME_STORAGE_KEY` ("mekstation-quick-game")
- **AND** `isDirty` SHALL be set to true
- **AND** the persistence SHALL be handled automatically by zustand persist middleware

**Source**: `src/stores/useQuickGameStore.ts:628-635`, `src/types/quickgame/QuickGameInterfaces.ts:335`

#### Scenario: Restore after page refresh

- **GIVEN** a persisted quick game exists in sessionStorage
- **AND** the user refreshes the page (F5 or browser reload)
- **WHEN** the store is initialized
- **THEN** the `game` field SHALL be deserialized from sessionStorage
- **AND** the game state SHALL be restored exactly as it was before refresh
- **AND** `restoreFromSession()` SHALL return true
- **AND** the user SHALL be able to continue from the same step (SelectUnits, ConfigureScenario, Review, Playing, Results)

**Source**: `src/stores/useQuickGameStore.ts:616-621`

#### Scenario: Clear on tab close

- **GIVEN** a persisted quick game exists in sessionStorage
- **WHEN** the user closes the browser tab or window
- **THEN** sessionStorage SHALL be cleared by the browser
- **AND** the quick game state SHALL be lost
- **AND** opening a new tab SHALL start with `game=null` (no persisted state)

**Note**: This is browser-native sessionStorage behavior. Unlike localStorage, sessionStorage is scoped to the tab/window and clears on close.

#### Scenario: Partialize excludes transient state

- **GIVEN** the store has `game`, `isLoading`, `error`, and `isDirty` fields
- **WHEN** the persist middleware serializes state
- **THEN** only the `game` field SHALL be persisted
- **AND** `isLoading`, `error`, and `isDirty` SHALL NOT be persisted (transient UI state)
- **AND** on restore, `isLoading` and `error` SHALL be initialized to false/null

**Source**: `src/stores/useQuickGameStore.ts:631-633`

### Requirement: Game Engine Integration

The system SHALL integrate with GameEngine for auto-resolved battles and InteractiveSession for spectator mode.

#### Scenario: Auto-resolve battle via GameEngine

- **GIVEN** a quick game with player and opponent forces configured
- **WHEN** `startBattle()` is called
- **THEN** `isLoading` SHALL be set to true
- **AND** all player units SHALL be adapted via `adaptUnit(sourceUnitId, {side: GameSide.Player, gunnery, piloting})`
- **AND** all opponent units SHALL be adapted via `adaptUnit(sourceUnitId, {side: GameSide.Opponent, gunnery, piloting})`
- **AND** a GameEngine instance SHALL be created with `seed: Date.now()`
- **AND** `engine.runToCompletion(playerAdapted, opponentAdapted, gameUnits)` SHALL be called
- **AND** the engine SHALL run the full battle simulation (all turns, all phases) until completion
- **AND** the resulting IGameSession SHALL be passed to `useGameplayStore.getState().setSession(session)`
- **AND** the winner SHALL be extracted from `session.currentState.result.winner`
- **AND** `game.status` SHALL be set to GameStatus.Completed
- **AND** `game.step` SHALL be set to QuickGameStep.Results
- **AND** `game.winner` SHALL be set to 'player', 'opponent', or 'draw'
- **AND** `game.victoryReason` SHALL be set from `session.currentState.result.reason`
- **AND** `game.events` SHALL be set to `session.events` (full event log)
- **AND** `isLoading` SHALL be set to false

**Source**: `src/stores/useQuickGameStore.ts:361-460`, `src/engine/GameEngine.ts:132-285`

#### Scenario: Launch spectator mode via InteractiveSession

- **GIVEN** a quick game with player and opponent forces configured
- **WHEN** `startSpectatorMode()` is called
- **THEN** `isLoading` SHALL be set to true
- **AND** all player and opponent units SHALL be adapted via `adaptUnit()`
- **AND** a GameEngine instance SHALL be created
- **AND** `engine.createInteractiveSession(playerAdapted, opponentAdapted, gameUnits)` SHALL be called
- **AND** the InteractiveSession SHALL be passed to `useGameplayStore.getState().setSpectatorMode(interactiveSession, {enabled: true, playing: true, speed: 1})`
- **AND** `game.status` SHALL be set to GameStatus.Active
- **AND** `game.step` SHALL be set to QuickGameStep.Playing
- **AND** `isLoading` SHALL be set to false
- **AND** the gameplay store SHALL manage turn-by-turn AI execution

**Source**: `src/stores/useQuickGameStore.ts:462-551`, `src/engine/GameEngine.ts:290-304`

#### Scenario: Handoff to gameplay store

- **GIVEN** a completed auto-resolved battle or active spectator mode session
- **WHEN** the session is set in the gameplay store
- **THEN** the gameplay store SHALL take ownership of the IGameSession
- **AND** the quick game store SHALL retain the `game.events` for replay
- **AND** the user SHALL be able to view the battle in the gameplay UI
- **AND** the quick game store SHALL remain in Results or Playing step
- **AND** the user SHALL be able to return to the quick game UI to start a new game via `playAgain()`

**Source**: `src/stores/useQuickGameStore.ts:426`, `src/stores/useGameplayStore.ts` (referenced)

### Requirement: Scenario Generation Integration

The system SHALL generate scenarios using the scenario generator service and create opponent forces.

#### Scenario: Generate scenario with faction and difficulty

- **GIVEN** a quick game with player force (totalBV=5000, 2 units)
- **AND** scenarioConfig with difficulty=1.2, enemyFaction=Faction.PIRATES, biome=BiomeType.DESERT
- **WHEN** `generateScenario()` is called
- **THEN** `scenarioGenerator.generate()` SHALL be called with:
  - `playerBV: 5000`
  - `playerUnitCount: 2`
  - `faction: Faction.PIRATES`
  - `era: Era.LATE_SUCCESSION_WARS`
  - `difficulty: 1.2`
  - `maxModifiers: scenarioConfig.modifierCount`
  - `allowNegativeModifiers: scenarioConfig.allowNegativeModifiers`
  - `biome: BiomeType.DESERT`
  - `scenarioType: scenarioConfig.scenarioType`
  - `seed: Date.now()`
- **AND** the generator SHALL return an IGeneratedScenario with opFor units
- **AND** opponent units SHALL be created from `scenario.opFor.units` via `createQuickGameUnit()`
- **AND** `game.opponentForce` SHALL be set with units, totalBV, and totalTonnage
- **AND** `game.scenario` SHALL be set to the generated scenario
- **AND** `isLoading` SHALL be set to false

**Source**: `src/stores/useQuickGameStore.ts:191-277`, `src/services/generators` (referenced)

#### Scenario: Scenario generation failure

- **GIVEN** a quick game with no player units
- **WHEN** `generateScenario()` is called
- **THEN** `error` SHALL be set to "Add at least one unit to generate scenario"
- **AND** `isLoading` SHALL remain false
- **AND** no scenario SHALL be generated

**Source**: `src/stores/useQuickGameStore.ts:198-201`

---

## Encounter Status Utilities

The Encounter Status Utilities provide shared functions for displaying encounter status across the UI.

**Implementation**: `src/utils/encounterStatus.ts`

### Requirement: Status Color Mapping

The utilities SHALL map EncounterStatus values to StatusBadgeColor variants.

#### Scenario: Get color for Draft status

- **GIVEN** EncounterStatus.Draft
- **WHEN** `getStatusColor(status)` is called
- **THEN** 'slate' SHALL be returned

#### Scenario: Get color for Ready status

- **GIVEN** EncounterStatus.Ready
- **WHEN** `getStatusColor(status)` is called
- **THEN** 'success' SHALL be returned

#### Scenario: Get color for Launched status

- **GIVEN** EncounterStatus.Launched
- **WHEN** `getStatusColor(status)` is called
- **THEN** 'info' SHALL be returned

#### Scenario: Get color for Completed status

- **GIVEN** EncounterStatus.Completed
- **WHEN** `getStatusColor(status)` is called
- **THEN** 'slate' SHALL be returned

#### Scenario: Get color for unknown status

- **GIVEN** an unknown status value
- **WHEN** `getStatusColor(status)` is called
- **THEN** 'slate' SHALL be returned (default)

### Requirement: Status Label Mapping

The utilities SHALL map EncounterStatus values to human-readable labels.

#### Scenario: Get label for Draft status

- **GIVEN** EncounterStatus.Draft
- **WHEN** `getStatusLabel(status)` is called
- **THEN** 'Draft' SHALL be returned

#### Scenario: Get label for Ready status (non-verbose)

- **GIVEN** EncounterStatus.Ready and verbose=false
- **WHEN** `getStatusLabel(status, verbose)` is called
- **THEN** 'Ready' SHALL be returned

#### Scenario: Get label for Ready status (verbose)

- **GIVEN** EncounterStatus.Ready and verbose=true
- **WHEN** `getStatusLabel(status, verbose)` is called
- **THEN** 'Ready to Launch' SHALL be returned

#### Scenario: Get label for Launched status

- **GIVEN** EncounterStatus.Launched
- **WHEN** `getStatusLabel(status)` is called
- **THEN** 'In Progress' SHALL be returned

#### Scenario: Get label for Completed status

- **GIVEN** EncounterStatus.Completed
- **WHEN** `getStatusLabel(status)` is called
- **THEN** 'Completed' SHALL be returned

#### Scenario: Get label for unknown status

- **GIVEN** an unknown status value
- **WHEN** `getStatusLabel(status)` is called
- **THEN** the raw status string SHALL be returned

---

## Data Model Requirements

### IEncounter

```typescript
interface IEncounter {
  id: string;
  name: string;
  description: string | null;
  status: EncounterStatus;
  playerForceId: string | null;
  opponentForceId: string | null;
  playerForce: {
    forceId: string;
    forceName: string;
    totalBV: number;
    unitCount: number;
  } | null;
  opponentForce: {
    forceId: string;
    forceName: string;
    totalBV: number;
    unitCount: number;
  } | null;
  scenarioTemplate: ScenarioTemplateType | null;
  mapId: string | null;
  turnLimit: number | null;
  createdAt: string;
  updatedAt: string;
}
```

### IEncounterValidationResult

```typescript
interface IEncounterValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

### EncounterStatus

```typescript
enum EncounterStatus {
  Draft = 'draft',
  Ready = 'ready',
  Launched = 'launched',
  Completed = 'completed',
}
```

### ScenarioTemplateType

```typescript
type ScenarioTemplateType = 'skirmish' | 'ambush' | 'holdout' | 'custom';
```

### IGameSession

```typescript
interface IGameSession {
  id: string;
  config: IGameConfig;
  units: IGameUnit[];
  events: IGameEvent[];
  currentState: IGameState;
  createdAt: string;
  updatedAt: string;
}
```

### IGameplayUIState

```typescript
interface IGameplayUIState {
  selectedUnitId: string | null;
  targetUnitId: string | null;
  queuedWeaponIds: string[];
}

const DEFAULT_UI_STATE: IGameplayUIState = {
  selectedUnitId: null,
  targetUnitId: null,
  queuedWeaponIds: [],
};
```

### IWeaponStatus

```typescript
interface IWeaponStatus {
  id: string;
  name: string;
  damage: number;
  heat: number;
  minRange: number;
  shortRange: number;
  mediumRange: number;
  longRange: number;
  isEnabled: boolean;
  ammoRemaining?: number;
}
```

### GamePhase

```typescript
enum GamePhase {
  Initiative = 'initiative',
  Movement = 'movement',
  WeaponAttack = 'weapon_attack',
  PhysicalAttack = 'physical_attack',
  Heat = 'heat',
  End = 'end',
}
```

### GameSide

```typescript
enum GameSide {
  Player = 'player',
  Opponent = 'opponent',
}
```

### Facing

```typescript
enum Facing {
  North = 0,
  NorthEast = 1,
  SouthEast = 2,
  South = 3,
  SouthWest = 4,
  NorthWest = 5,
}
```

### MovementType

```typescript
enum MovementType {
  None = 'none',
  Walk = 'walk',
  Run = 'run',
  Jump = 'jump',
}
```

### IQuickGameState

```typescript
interface IQuickGameState {
  game: IQuickGameInstance | null;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
}
```

### IQuickGameActions

```typescript
interface IQuickGameActions {
  startNewGame: () => void;
  clearGame: () => void;
  clearError: () => void;
  addUnit: (request: IQuickGameUnitRequest) => void;
  removeUnit: (instanceId: string) => void;
  updateUnitSkills: (
    instanceId: string,
    gunnery: number,
    piloting: number,
  ) => void;
  setScenarioConfig: (config: Partial<IQuickGameScenarioConfig>) => void;
  generateScenario: () => void;
  nextStep: () => void;
  previousStep: () => void;
  startGame: () => void;
  startBattle: () => Promise<void>;
  startSpectatorMode: () => Promise<void>;
  recordEvent: (event: IGameEvent) => void;
  endGame: (winner: 'player' | 'opponent' | 'draw', reason: string) => void;
  playAgain: (resetUnits: boolean) => void;
  restoreFromSession: () => boolean;
  saveToSession: () => void;
}
```

### IQuickGameUnitRequest

```typescript
interface IQuickGameUnitRequest {
  readonly sourceUnitId: string;
  readonly name: string;
  readonly chassis: string;
  readonly variant: string;
  readonly bv: number;
  readonly tonnage: number;
  readonly gunnery?: number; // Default 4
  readonly piloting?: number; // Default 5
  readonly pilotName?: string;
  readonly maxArmor: Record<string, number>;
  readonly maxStructure: Record<string, number>;
}
```

**Source**: `src/types/quickgame/QuickGameInterfaces.ts:79-102`

### IQuickGameUnit

```typescript
interface IQuickGameUnit {
  readonly instanceId: string; // Generated: unit-${Date.now()}-${random}
  readonly sourceUnitId: string;
  readonly name: string;
  readonly chassis: string;
  readonly variant: string;
  readonly bv: number;
  readonly tonnage: number;
  readonly gunnery: number;
  readonly piloting: number;
  readonly pilotName?: string;
  readonly maxArmor: Record<string, number>;
  readonly maxStructure: Record<string, number>;
  armor: Record<string, number>; // Mutable (damage tracking)
  structure: Record<string, number>; // Mutable (damage tracking)
  heat: number; // Mutable
  isDestroyed: boolean; // Mutable
  isWithdrawn: boolean; // Mutable
}
```

**Source**: `src/types/quickgame/QuickGameInterfaces.ts:39-74`

### IAdaptedUnit

```typescript
interface IAdaptedUnit {
  id: string;
  weapons: readonly IWeapon[];
  walkMP: number;
  runMP: number;
  jumpMP: number;
  armor: Record<string, number>;
  structure: Record<string, number>;
  // ... additional game engine fields
}
```

**Source**: `src/engine/types.ts` (referenced)

### GameStatus

```typescript
enum GameStatus {
  Setup = 'setup',
  Active = 'active',
  Completed = 'completed',
}
```

**Source**: `src/types/gameplay/GameSessionInterfaces.ts` (referenced)

### Faction

```typescript
enum Faction {
  PIRATES = 'pirates',
  HOUSE_STEINER = 'house_steiner',
  HOUSE_DAVION = 'house_davion',
  HOUSE_LIAO = 'house_liao',
  HOUSE_MARIK = 'house_marik',
  HOUSE_KURITA = 'house_kurita',
  // ... additional factions
}
```

**Source**: `src/constants/scenario/rats.ts` (referenced)

### QUICK_GAME_STORAGE_KEY

```typescript
export const QUICK_GAME_STORAGE_KEY = 'mekstation-quick-game';
```

**Source**: `src/types/quickgame/QuickGameInterfaces.ts:335`
