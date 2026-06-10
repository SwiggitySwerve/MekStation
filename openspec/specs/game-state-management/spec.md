# Game State Management Specification

## Purpose

The Game State Management system implements the event-sourced state derivation pattern for BattleTech gameplay. It receives an ordered sequence of immutable game events (produced by the game-event-system) and reduces them into a complete, current game state through pure functional application. The core `deriveState` function creates an initial empty state and folds each event through `applyEvent`, a switch-based reducer that dispatches to 20+ type-specific handler functions. This architecture ensures deterministic state reconstruction from any event history, enabling replay, time-travel debugging, and consistent multiplayer synchronization.

The system tracks all unit-level combat state including position, facing, armor, internal structure, heat, ammunition, pilot condition, component damage, prone/shutdown status, pending piloting skill rolls, and lock state. It also manages game-level state such as status (Setup/Active/Completed/Abandoned), current turn and phase, initiative results, activation index, and victory conditions. State consistency invariants guarantee that destroyed locations cascade correctly, phase transitions reset per-phase tracking, and victory conditions are evaluated against surviving forces.
## Requirements
### Requirement: Initial Game State Creation

The system SHALL create a default initial game state with sensible defaults for all fields.

#### Scenario: Create empty game state

- **GIVEN** a gameId="game-001"
- **WHEN** `createInitialGameState("game-001")` is called
- **THEN** the state SHALL have gameId="game-001"
- **AND** status SHALL be GameStatus.Setup
- **AND** turn SHALL be 0
- **AND** phase SHALL be GamePhase.Initiative
- **AND** activationIndex SHALL be 0
- **AND** units SHALL be an empty record {}
- **AND** turnEvents SHALL be an empty array []

### Requirement: Initial Unit State Creation

The system SHALL create initial unit state with full health, zero heat, no damage, and default position.

#### Scenario: Create initial unit state with defaults

- **GIVEN** a unit with id="mech-1", side=GameSide.Player
- **AND** startPosition={q: 0, r: 5}
- **WHEN** `createInitialUnitState(unit, startPosition)` is called
- **THEN** the unit state SHALL have id="mech-1", side=Player
- **AND** position SHALL be {q: 0, r: 5}
- **AND** facing SHALL be Facing.North (default)
- **AND** heat SHALL be 0
- **AND** movementThisTurn SHALL be MovementType.Stationary
- **AND** hexesMovedThisTurn SHALL be 0
- **AND** pilotWounds SHALL be 0
- **AND** pilotConscious SHALL be true
- **AND** destroyed SHALL be false
- **AND** lockState SHALL be LockState.Pending
- **AND** prone SHALL be false
- **AND** shutdown SHALL be false

#### Scenario: Create initial unit state with explicit facing

- **GIVEN** a unit with id="mech-2", side=GameSide.Opponent
- **AND** startPosition={q: 1, r: -5}, startFacing=Facing.South
- **WHEN** `createInitialUnitState(unit, startPosition, Facing.South)` is called
- **THEN** facing SHALL be Facing.South

#### Scenario: Initial unit has empty damage tracking

- **GIVEN** any newly created unit state
- **WHEN** inspecting damage-related fields
- **THEN** destroyedLocations SHALL be an empty array
- **AND** destroyedEquipment SHALL be an empty array
- **AND** pendingPSRs SHALL be an empty array
- **AND** weaponsFiredThisTurn SHALL be an empty array
- **AND** jammedWeapons SHALL be an empty array
- **AND** componentDamage SHALL have engineHits=0, gyroHits=0, sensorHits=0, lifeSupport=0, cockpitHit=false, weaponsDestroyed=[], heatSinksDestroyed=0, jumpJetsDestroyed=0, actuators={}

### Requirement: Event-Sourced State Derivation

The system SHALL derive complete game state by sequentially applying all events from an initial empty state.

#### Scenario: Derive state from empty event list

- **GIVEN** gameId="game-001" and an empty event array []
- **WHEN** `deriveState("game-001", [])` is called
- **THEN** the result SHALL equal `createInitialGameState("game-001")`

#### Scenario: Derive state from event sequence

- **GIVEN** gameId="game-001" and events [GameCreated, GameStarted, PhaseChanged]
- **WHEN** `deriveState("game-001", events)` is called
- **THEN** each event SHALL be applied in order via `applyEvent`
- **AND** the final state SHALL reflect all three events applied sequentially

#### Scenario: Derive state at specific sequence number

- **GIVEN** gameId="game-001" and 50 events with sequences 1-50
- **WHEN** `deriveStateAtSequence("game-001", events, 25)` is called
- **THEN** only events with sequence <= 25 SHALL be applied
- **AND** events with sequence > 25 SHALL be ignored

#### Scenario: Derive state at specific turn

- **GIVEN** gameId="game-001" and events spanning turns 1-5
- **WHEN** `deriveStateAtTurn("game-001", events, 3)` is called
- **THEN** only events with turn <= 3 SHALL be applied
- **AND** events from turns 4-5 SHALL be ignored

#### Scenario: Deterministic replay produces identical state

- **GIVEN** the same gameId and the same event sequence
- **WHEN** `deriveState` is called twice with identical inputs
- **THEN** both resulting states SHALL be deeply equal

### Requirement: GameCreated Event Handler

The system SHALL initialize units with deployment positions when a GameCreated event is applied.

#### Scenario: Apply GameCreated with two units

- **GIVEN** an initial game state
- **AND** a GameCreated event with units=[{id: "mech-1", side: Player}, {id: "mech-2", side: Opponent}]
- **WHEN** the event is applied
- **THEN** state.status SHALL be GameStatus.Setup
- **AND** state.units SHALL contain "mech-1" and "mech-2"
- **AND** "mech-1" (Player) SHALL be positioned at row 5 (south edge) facing North
- **AND** "mech-2" (Opponent) SHALL be positioned at row -5 (north edge) facing South

#### Scenario: Multiple player units get sequential columns

- **GIVEN** a GameCreated event with 3 Player units
- **WHEN** the event is applied
- **THEN** player units SHALL be placed at columns q=-2, q=-1, q=0 respectively
- **AND** all player units SHALL be at row r=5

### Requirement: GameStarted Event Handler

The system SHALL transition game to Active status when GameStarted is applied.

#### Scenario: Apply GameStarted event

- **GIVEN** a game state with status=Setup
- **AND** a GameStarted event with firstSide=GameSide.Player
- **WHEN** the event is applied
- **THEN** state.status SHALL be GameStatus.Active
- **AND** state.turn SHALL be 1
- **AND** state.phase SHALL be GamePhase.Initiative
- **AND** state.firstMover SHALL be GameSide.Player
- **AND** state.turnEvents SHALL be reset to empty []

### Requirement: GameEnded Event Handler

The system SHALL record game completion with winner and reason when GameEnded is applied.

#### Scenario: Apply GameEnded with winner

- **GIVEN** an active game state
- **AND** a GameEnded event with winner=GameSide.Player, reason="destruction"
- **WHEN** the event is applied
- **THEN** state.status SHALL be GameStatus.Completed
- **AND** state.result.winner SHALL be GameSide.Player
- **AND** state.result.reason SHALL be "destruction"

#### Scenario: Apply GameEnded with draw

- **GIVEN** an active game state
- **AND** a GameEnded event with winner="draw", reason="turn_limit"
- **WHEN** the event is applied
- **THEN** state.result.winner SHALL be "draw"
- **AND** state.result.reason SHALL be "turn_limit"

### Requirement: Phase Transition Handler

The system SHALL reset per-phase unit tracking and advance phase when PhaseChanged is applied.

#### Scenario: Apply PhaseChanged resets lock states

- **GIVEN** a game state where unit "mech-1" has lockState=Locked and damageThisPhase=15
- **AND** a PhaseChanged event with toPhase=WeaponAttack
- **WHEN** the event is applied
- **THEN** all units SHALL have lockState=Pending
- **AND** all units SHALL have pendingAction=undefined
- **AND** all units SHALL have damageThisPhase=0
- **AND** state.phase SHALL be GamePhase.WeaponAttack
- **AND** state.activationIndex SHALL be 0

#### Scenario: PhaseChanged to Movement resets movement tracking

- **GIVEN** a game state where unit "mech-1" has movementThisTurn=Walk, hexesMovedThisTurn=5
- **AND** a PhaseChanged event with toPhase=GamePhase.Movement
- **WHEN** the event is applied
- **THEN** all units SHALL have movementThisTurn=MovementType.Stationary
- **AND** all units SHALL have hexesMovedThisTurn=0

#### Scenario: PhaseChanged appends to turnEvents

- **GIVEN** a game state with turnEvents containing 2 existing events
- **AND** a PhaseChanged event
- **WHEN** the event is applied
- **THEN** state.turnEvents SHALL contain 3 events (2 existing + the PhaseChanged event)

### Requirement: Turn Started Handler

The system SHALL advance turn number and reset per-turn tracking when TurnStarted is applied.

#### Scenario: Apply TurnStarted event

- **GIVEN** a game state at turn=2
- **AND** a TurnStarted event with event.turn=3
- **WHEN** the event is applied
- **THEN** state.turn SHALL be 3
- **AND** state.phase SHALL be GamePhase.Initiative
- **AND** state.activationIndex SHALL be 0
- **AND** state.turnEvents SHALL contain only the TurnStarted event

#### Scenario: TurnStarted resets weapons fired

- **GIVEN** a game state where unit "mech-1" has weaponsFiredThisTurn=["ppc-1", "laser-2"]
- **AND** a TurnStarted event
- **WHEN** the event is applied
- **THEN** all units SHALL have weaponsFiredThisTurn=[]

### Requirement: Initiative Handler

The system SHALL record initiative winner and first mover when InitiativeRolled is applied.

#### Scenario: Apply InitiativeRolled event

- **GIVEN** a game state at Initiative phase
- **AND** an InitiativeRolled event with winner=GameSide.Opponent, movesFirst=GameSide.Player
- **WHEN** the event is applied
- **THEN** state.initiativeWinner SHALL be GameSide.Opponent
- **AND** state.firstMover SHALL be GameSide.Player

### Requirement: Movement Event Handlers

Movement replay SHALL preserve whether a unit entered its current hull-down
state through a backward movement step so downstream combat projection can
apply vehicle backed-entry side-table rules.

#### Scenario: Hull-down entry records backward movement

- **GIVEN** a `MovementDeclared` payload with `hullDownEntryAttempt: true`
- **AND** its `steps` include a `kind: "forward"` step whose direction is
  `"backward"`
- **WHEN** game state is derived from the event stream
- **THEN** the unit SHALL have `hullDown: true`
- **AND** the unit SHALL have `hullDownEnteredBackwards: true`.

#### Scenario: Hull-down exit clears backward-entry state

- **GIVEN** a unit state has `hullDown: true`
- **AND** `hullDownEnteredBackwards: true`
- **WHEN** a `MovementDeclared` payload exits, goes prone from, or successfully
  stands out of hull-down
- **THEN** the unit SHALL have `hullDown: false`
- **AND** `hullDownEnteredBackwards` SHALL no longer be true.

### Requirement: Attack Event Handlers

The system SHALL update attacker lock state and activation index when attack events are applied.

#### Scenario: Apply AttackDeclared event

- **GIVEN** a unit "mech-1" with lockState=Pending
- **AND** an AttackDeclared event with attackerId="mech-1"
- **WHEN** the event is applied
- **THEN** unit "mech-1" lockState SHALL be LockState.Planning

#### Scenario: Apply AttackLocked event

- **GIVEN** a unit "mech-1" with lockState=Planning
- **AND** state.activationIndex=1
- **AND** an AttackLocked event with actorId="mech-1"
- **WHEN** the event is applied
- **THEN** unit "mech-1" lockState SHALL be LockState.Locked
- **AND** state.activationIndex SHALL be 2

### Requirement: Damage Applied Handler

The system SHALL update armor, structure, destroyed locations, and track damage cascading when DamageApplied is applied.

#### Scenario: Apply DamageApplied to armor only

- **GIVEN** a unit "mech-2" with armor.CT=20, structure.CT=15
- **AND** a DamageApplied event with unitId="mech-2", location="CT", damage=5, armorRemaining=15, structureRemaining=15, locationDestroyed=false
- **WHEN** the event is applied
- **THEN** unit "mech-2" armor.CT SHALL be 15
- **AND** structure.CT SHALL be 15
- **AND** destroyedLocations SHALL remain unchanged
- **AND** damageThisPhase SHALL increase by 5

#### Scenario: Apply DamageApplied with location destruction

- **GIVEN** a unit "mech-2" with destroyedLocations=[]
- **AND** a DamageApplied event with location="RA", armorRemaining=0, structureRemaining=0, locationDestroyed=true
- **WHEN** the event is applied
- **THEN** "RA" SHALL be added to destroyedLocations

#### Scenario: Side torso destruction cascades to arm

- **GIVEN** a unit "mech-2" with destroyedLocations=[]
- **AND** a DamageApplied event with location="left_torso", locationDestroyed=true
- **WHEN** the event is applied
- **THEN** "left_torso" SHALL be added to destroyedLocations
- **AND** "left_arm" SHALL also be added to destroyedLocations (cascading destruction)
- **AND** armor.left_arm SHALL be set to 0
- **AND** structure.left_arm SHALL be set to 0

#### Scenario: Right torso destruction cascades to right arm

- **GIVEN** a unit "mech-2" with destroyedLocations=[]
- **AND** a DamageApplied event with location="right_torso", locationDestroyed=true
- **WHEN** the event is applied
- **THEN** "right_torso" SHALL be in destroyedLocations
- **AND** "right_arm" SHALL also be in destroyedLocations

#### Scenario: Side torso rear destruction cascades to arm

- **GIVEN** a unit "mech-2" with destroyedLocations=[]
- **AND** a DamageApplied event with location="left_torso_rear", locationDestroyed=true
- **WHEN** the event is applied
- **THEN** "left_arm" SHALL also be in destroyedLocations

#### Scenario: No duplicate destroyed locations on repeated damage

- **GIVEN** a unit "mech-2" with destroyedLocations=["left_torso", "left_arm"]
- **AND** a DamageApplied event with location="left_torso", locationDestroyed=true
- **WHEN** the event is applied
- **THEN** destroyedLocations SHALL NOT contain duplicate "left_torso" entries
- **AND** "left_arm" SHALL NOT be duplicated

#### Scenario: DamageApplied with criticals adds to destroyed equipment

- **GIVEN** a unit "mech-2" with destroyedEquipment=[]
- **AND** a DamageApplied event with criticals=["medium-laser-1", "heat-sink-2"]
- **WHEN** the event is applied
- **THEN** destroyedEquipment SHALL contain ["medium-laser-1", "heat-sink-2"]

#### Scenario: DamageApplied accumulates damageThisPhase

- **GIVEN** a unit "mech-2" with damageThisPhase=10
- **AND** a DamageApplied event with damage=8
- **WHEN** the event is applied
- **THEN** damageThisPhase SHALL be 18 (10 + 8)

### Requirement: Heat Change Handler

The system SHALL update unit heat total when HeatGenerated or HeatDissipated events are applied.

#### Scenario: Apply HeatGenerated event

- **GIVEN** a unit "mech-1" with heat=5
- **AND** a HeatGenerated event with unitId="mech-1", newTotal=15
- **WHEN** the event is applied
- **THEN** unit "mech-1" heat SHALL be 15

#### Scenario: Apply HeatDissipated event

- **GIVEN** a unit "mech-1" with heat=20
- **AND** a HeatDissipated event with unitId="mech-1", newTotal=10
- **WHEN** the event is applied
- **THEN** unit "mech-1" heat SHALL be 10

#### Scenario: Both HeatGenerated and HeatDissipated use same handler

- **GIVEN** either a HeatGenerated or HeatDissipated event
- **WHEN** the event is applied
- **THEN** unit heat SHALL be set to payload.newTotal regardless of event type

### Requirement: Pilot Status Handlers

The system SHALL update pilot wounds, consciousness, and unit destruction when pilot events are applied.

#### Scenario: Apply PilotHit with consciousness check passed

- **GIVEN** a unit "mech-2" with pilotWounds=0, pilotConscious=true
- **AND** a PilotHit event with totalWounds=1, consciousnessCheckRequired=true, consciousnessCheckPassed=true
- **WHEN** the event is applied
- **THEN** pilotWounds SHALL be 1
- **AND** pilotConscious SHALL be true

#### Scenario: Apply PilotHit with consciousness check failed

- **GIVEN** a unit "mech-2" with pilotWounds=1, pilotConscious=true
- **AND** a PilotHit event with totalWounds=2, consciousnessCheckRequired=true, consciousnessCheckPassed=false
- **WHEN** the event is applied
- **THEN** pilotWounds SHALL be 2
- **AND** pilotConscious SHALL be false

#### Scenario: Apply PilotHit without consciousness check

- **GIVEN** a unit "mech-2" with pilotConscious=true
- **AND** a PilotHit event with consciousnessCheckRequired=false
- **WHEN** the event is applied
- **THEN** pilotConscious SHALL remain true (unchanged)

#### Scenario: Apply UnitDestroyed event

- **GIVEN** a unit "mech-2" with destroyed=false
- **AND** a UnitDestroyed event with unitId="mech-2"
- **WHEN** the event is applied
- **THEN** unit "mech-2" destroyed SHALL be true

### Requirement: Critical Hit Handler

The system SHALL update component damage records for each component type when CriticalHitResolved is applied.

#### Scenario: Apply CriticalHitResolved for engine

- **GIVEN** a unit "mech-2" with componentDamage.engineHits=0
- **AND** a CriticalHitResolved event with componentType="engine"
- **WHEN** the event is applied
- **THEN** componentDamage.engineHits SHALL be 1

#### Scenario: Apply CriticalHitResolved for gyro

- **GIVEN** a unit "mech-2" with componentDamage.gyroHits=0
- **AND** a CriticalHitResolved event with componentType="gyro"
- **WHEN** the event is applied
- **THEN** componentDamage.gyroHits SHALL be 1

#### Scenario: Apply CriticalHitResolved for sensor

- **GIVEN** a unit "mech-2" with componentDamage.sensorHits=1
- **AND** a CriticalHitResolved event with componentType="sensor"
- **WHEN** the event is applied
- **THEN** componentDamage.sensorHits SHALL be 2

#### Scenario: Apply CriticalHitResolved for cockpit

- **GIVEN** a unit "mech-2" with componentDamage.cockpitHit=false
- **AND** a CriticalHitResolved event with componentType="cockpit"
- **WHEN** the event is applied
- **THEN** componentDamage.cockpitHit SHALL be true

#### Scenario: Apply CriticalHitResolved for weapon

- **GIVEN** a unit "mech-2" with componentDamage.weaponsDestroyed=[]
- **AND** a CriticalHitResolved event with componentType="weapon", componentName="ppc-1"
- **WHEN** the event is applied
- **THEN** componentDamage.weaponsDestroyed SHALL contain ["ppc-1"]

#### Scenario: Apply CriticalHitResolved for heat sink

- **GIVEN** a unit "mech-2" with componentDamage.heatSinksDestroyed=2
- **AND** a CriticalHitResolved event with componentType="heat_sink"
- **WHEN** the event is applied
- **THEN** componentDamage.heatSinksDestroyed SHALL be 3

#### Scenario: Apply CriticalHitResolved for jump jet

- **GIVEN** a unit "mech-2" with componentDamage.jumpJetsDestroyed=0
- **AND** a CriticalHitResolved event with componentType="jump_jet"
- **WHEN** the event is applied
- **THEN** componentDamage.jumpJetsDestroyed SHALL be 1

#### Scenario: Apply CriticalHitResolved for actuator

- **GIVEN** a unit "mech-2" with componentDamage.actuators={}
- **AND** a CriticalHitResolved event with componentType="actuator", componentName="lower_leg"
- **WHEN** the event is applied
- **THEN** componentDamage.actuators SHALL contain { lower_leg: true }

#### Scenario: Apply CriticalHitResolved for life support

- **GIVEN** a unit "mech-2" with componentDamage.lifeSupport=0
- **AND** a CriticalHitResolved event with componentType="life_support"
- **WHEN** the event is applied
- **THEN** componentDamage.lifeSupport SHALL be 1

### Requirement: Piloting Skill Roll Handlers

The system SHALL manage pending PSR queue and fallen/prone status when PSR events are applied.

#### Scenario: Apply PSRTriggered adds to pending queue

- **GIVEN** a unit "mech-2" with pendingPSRs=[]
- **AND** a PSRTriggered event with reason="20+ damage", additionalModifier=1, triggerSource="damage"
- **WHEN** the event is applied
- **THEN** pendingPSRs SHALL contain one entry with entityId="mech-2", reason="20+ damage", additionalModifier=1, triggerSource="damage"

#### Scenario: Apply PSRResolved removes from pending queue

- **GIVEN** a unit "mech-2" with pendingPSRs=[{reason: "20+ damage", ...}, {reason: "gyro_hit", ...}]
- **AND** a PSRResolved event with reason="20+ damage"
- **WHEN** the event is applied
- **THEN** pendingPSRs SHALL contain only [{reason: "gyro_hit", ...}]

#### Scenario: Apply UnitFell sets prone and clears PSRs

- **GIVEN** a unit "mech-2" with prone=false, facing=North, pendingPSRs=[{reason: "20+ damage"}]
- **AND** a UnitFell event with newFacing=South
- **WHEN** the event is applied
- **THEN** prone SHALL be true
- **AND** facing SHALL be South
- **AND** pendingPSRs SHALL be empty []

### Requirement: Physical Attack Handlers

The system SHALL update attacker lock state and target damage tracking when physical attack events are applied.

#### Scenario: Apply PhysicalAttackDeclared event

- **GIVEN** a unit "mech-1" with lockState=Pending
- **AND** a PhysicalAttackDeclared event with attackerId="mech-1"
- **WHEN** the event is applied
- **THEN** unit "mech-1" lockState SHALL be LockState.Planning

#### Scenario: Apply PhysicalAttackResolved with hit

- **GIVEN** a unit "mech-2" with damageThisPhase=5
- **AND** a PhysicalAttackResolved event with targetId="mech-2", hit=true, damage=10
- **WHEN** the event is applied
- **THEN** unit "mech-2" damageThisPhase SHALL be 15 (5 + 10)

#### Scenario: Apply PhysicalAttackResolved with miss

- **GIVEN** a unit "mech-2" with damageThisPhase=5
- **AND** a PhysicalAttackResolved event with hit=false
- **WHEN** the event is applied
- **THEN** state SHALL be returned unchanged (no damage tracked for miss)

### Requirement: Shutdown and Startup Handlers

The system SHALL toggle unit shutdown status when ShutdownCheck and StartupAttempt events are applied.

#### Scenario: Apply ShutdownCheck with shutdown occurred

- **GIVEN** a unit "mech-1" with shutdown=false
- **AND** a ShutdownCheck event with shutdownOccurred=true
- **WHEN** the event is applied
- **THEN** unit "mech-1" shutdown SHALL be true

#### Scenario: Apply ShutdownCheck without shutdown

- **GIVEN** a unit "mech-1" with shutdown=false
- **AND** a ShutdownCheck event with shutdownOccurred=false
- **WHEN** the event is applied
- **THEN** state SHALL be returned unchanged

#### Scenario: Apply StartupAttempt with success

- **GIVEN** a unit "mech-1" with shutdown=true
- **AND** a StartupAttempt event with success=true
- **WHEN** the event is applied
- **THEN** unit "mech-1" shutdown SHALL be false

#### Scenario: Apply StartupAttempt with failure

- **GIVEN** a unit "mech-1" with shutdown=true
- **AND** a StartupAttempt event with success=false
- **WHEN** the event is applied
- **THEN** state SHALL be returned unchanged (shutdown remains true)

### Requirement: Ammo Consumption Handler

The system SHALL update ammunition bin remaining rounds when AmmoConsumed is applied.

#### Scenario: Apply AmmoConsumed event

- **GIVEN** a unit "mech-1" with ammoState containing bin "lrm-ammo-1" with remainingRounds=240
- **AND** an AmmoConsumed event with binId="lrm-ammo-1", roundsRemaining=230
- **WHEN** the event is applied
- **THEN** ammoState["lrm-ammo-1"].remainingRounds SHALL be 230

#### Scenario: Apply AmmoConsumed for nonexistent bin is no-op

- **GIVEN** a unit "mech-1" with ammoState containing no bin "lrm-ammo-99"
- **AND** an AmmoConsumed event with binId="lrm-ammo-99"
- **WHEN** the event is applied
- **THEN** the state SHALL be returned unchanged

### Requirement: Info-Only Events

The system SHALL return state unchanged for info-only events that carry no state mutation.

#### Scenario: TurnEnded event is no-op

- **GIVEN** any game state
- **AND** a TurnEnded event
- **WHEN** the event is applied
- **THEN** the state SHALL be returned unchanged

#### Scenario: InitiativeOrderSet event is no-op

- **GIVEN** any game state
- **AND** an InitiativeOrderSet event
- **WHEN** the event is applied
- **THEN** the state SHALL be returned unchanged (initiative already set via InitiativeRolled)

#### Scenario: AttacksRevealed event is no-op

- **GIVEN** any game state
- **AND** an AttacksRevealed event (simultaneous resolution marker)
- **WHEN** the event is applied
- **THEN** the state SHALL be returned unchanged

#### Scenario: AttackResolved event is no-op

- **GIVEN** any game state
- **AND** an AttackResolved event
- **WHEN** the event is applied
- **THEN** the state SHALL be returned unchanged (damage applied via separate DamageApplied events)

#### Scenario: HeatEffectApplied event is no-op

- **GIVEN** any game state
- **AND** a HeatEffectApplied event
- **WHEN** the event is applied
- **THEN** the state SHALL be returned unchanged (heat state managed via HeatGenerated/HeatDissipated)

#### Scenario: CriticalHit event is no-op

- **GIVEN** any game state
- **AND** a CriticalHit event (legacy/info-only)
- **WHEN** the event is applied
- **THEN** the state SHALL be returned unchanged (actual handling via CriticalHitResolved)

#### Scenario: FacingChanged event is no-op

- **GIVEN** any game state
- **AND** a FacingChanged event (legacy/unused)
- **WHEN** the event is applied
- **THEN** the state SHALL be returned unchanged (facing updated via MovementDeclared)

#### Scenario: AmmoExplosion event is no-op

- **GIVEN** any game state
- **AND** an AmmoExplosion event (info-only for logging)
- **WHEN** the event is applied
- **THEN** the state SHALL be returned unchanged (damage applied via separate DamageApplied events)

#### Scenario: Unknown event type is no-op

- **GIVEN** any game state
- **AND** an event with an unrecognized event type
- **WHEN** the event is applied
- **THEN** the state SHALL be returned unchanged

### Requirement: State Query Functions

The system SHALL provide query functions for active units, awaiting actions, and lock status.

#### Scenario: Get active units for a side

- **GIVEN** a game state with units: "mech-1" (Player, alive, conscious), "mech-2" (Player, destroyed), "mech-3" (Opponent, alive, conscious), "mech-4" (Player, alive, unconscious)
- **WHEN** `getActiveUnits(state, GameSide.Player)` is called
- **THEN** the result SHALL contain only "mech-1"
- **AND** "mech-2" SHALL be excluded (destroyed)
- **AND** "mech-4" SHALL be excluded (unconscious pilot)

#### Scenario: Get units awaiting action

- **GIVEN** a game state with units: "mech-1" (alive, Pending), "mech-2" (alive, Locked), "mech-3" (destroyed, Pending)
- **WHEN** `getUnitsAwaitingAction(state)` is called
- **THEN** the result SHALL contain only "mech-1"
- **AND** "mech-2" SHALL be excluded (already Locked)
- **AND** "mech-3" SHALL be excluded (destroyed)

#### Scenario: All units locked check

- **GIVEN** a game state where all non-destroyed, conscious units have lockState=Locked or Resolved
- **WHEN** `allUnitsLocked(state)` is called
- **THEN** the result SHALL be true

#### Scenario: Not all units locked

- **GIVEN** a game state where one alive, conscious unit has lockState=Pending
- **WHEN** `allUnitsLocked(state)` is called
- **THEN** the result SHALL be false

#### Scenario: Check if game is over

- **GIVEN** a game state with status=GameStatus.Completed
- **WHEN** `isGameOver(state)` is called
- **THEN** the result SHALL be true

#### Scenario: Game not over when active

- **GIVEN** a game state with status=GameStatus.Active
- **WHEN** `isGameOver(state)` is called
- **THEN** the result SHALL be false

### Requirement: Victory Condition Evaluation

The system SHALL evaluate victory conditions based on elimination, mutual destruction, and turn limits.

#### Scenario: Player wins by elimination

- **GIVEN** a game state where all Opponent units have destroyed=true
- **AND** at least one Player unit has destroyed=false
- **AND** a config with turnLimit=10
- **WHEN** `checkVictoryConditions(state, config)` is called
- **THEN** the result SHALL be GameSide.Player

#### Scenario: Opponent wins by elimination

- **GIVEN** a game state where all Player units have destroyed=true
- **AND** at least one Opponent unit has destroyed=false
- **WHEN** `checkVictoryConditions(state, config)` is called
- **THEN** the result SHALL be GameSide.Opponent

#### Scenario: Mutual destruction results in draw

- **GIVEN** a game state where all Player units AND all Opponent units have destroyed=true
- **WHEN** `checkVictoryConditions(state, config)` is called
- **THEN** the result SHALL be "draw"

#### Scenario: Turn limit reached with player advantage

- **GIVEN** a game state at turn=11
- **AND** Player has 2 surviving units, Opponent has 1 surviving unit
- **AND** config.turnLimit=10
- **WHEN** `checkVictoryConditions(state, config)` is called
- **THEN** the result SHALL be GameSide.Player (more surviving units)

#### Scenario: Turn limit reached with equal forces

- **GIVEN** a game state at turn=11
- **AND** Player has 2 surviving units, Opponent has 2 surviving units
- **AND** config.turnLimit=10
- **WHEN** `checkVictoryConditions(state, config)` is called
- **THEN** the result SHALL be "draw"

#### Scenario: No turn limit (turnLimit=0)

- **GIVEN** a game state at turn=50
- **AND** both sides have surviving units
- **AND** config.turnLimit=0
- **WHEN** `checkVictoryConditions(state, config)` is called
- **THEN** the result SHALL be null (game continues, no turn limit enforced)

#### Scenario: Game continues when both sides have surviving units

- **GIVEN** a game state at turn=5
- **AND** both sides have at least one surviving unit
- **AND** config.turnLimit=10
- **WHEN** `checkVictoryConditions(state, config)` is called
- **THEN** the result SHALL be null (game continues)

### Requirement: State Consistency Invariants

The system SHALL maintain state consistency across event sequences.

#### Scenario: Destroyed unit remains destroyed through subsequent events

- **GIVEN** a unit "mech-2" with destroyed=true
- **AND** subsequent MovementDeclared, AttackDeclared events referencing "mech-2"
- **WHEN** these events are applied
- **THEN** the unit SHALL remain destroyed=true
- **AND** no state changes SHALL occur for the destroyed unit (handler returns early for nonexistent/destroyed units)

#### Scenario: Phase changes preserve unit damage state

- **GIVEN** a unit "mech-1" with armor.CT=5, structure.CT=10, pilotWounds=1
- **AND** a PhaseChanged event
- **WHEN** the event is applied
- **THEN** armor.CT SHALL remain 5
- **AND** structure.CT SHALL remain 10
- **AND** pilotWounds SHALL remain 1
- **AND** only lockState, pendingAction, and damageThisPhase SHALL be reset

#### Scenario: Full battle event sequence produces valid end state

- **GIVEN** events: [GameCreated(2 units), GameStarted, TurnStarted(turn 1), InitiativeRolled, PhaseChanged(Movement), MovementDeclared(mech-1), MovementLocked(mech-1), PhaseChanged(WeaponAttack), AttackDeclared(mech-1 targets mech-2), AttackLocked(mech-1), DamageApplied(mech-2 CT, locationDestroyed=false)]
- **WHEN** `deriveState` is called with this sequence
- **THEN** state.status SHALL be Active
- **AND** state.turn SHALL be 1
- **AND** "mech-1" SHALL have updated position and lockState=Locked
- **AND** "mech-2" SHALL have reduced armor at the damaged location

### Requirement: Per-Unit Combat-Behavior Envelope

`IUnitGameState` SHALL carry an optional `combatState` slot whose shape is a discriminated union keyed by `kind`. The slot envelopes the per-type combat-behavior structs that the four archived combat-behavior changes (`add-aerospace-combat-behavior`, `add-protomech-combat-behavior`, `add-infantry-combat-behavior`, `add-battlearmor-combat-behavior`) each declared at `unit.combatState.{aero|proto|platoon|squad}`.

The envelope MUST be the single channel through which per-type combat data flows from the game state to consumers (renderers, fog redaction, multiplayer sync). Per-type side-channels are PROHIBITED.

The envelope MUST be immutable from the consumer's perspective: producers (reducers, init helpers) construct a new `combatState` object when the per-type struct changes; consumers never mutate it in place.

#### Scenario: Envelope shape

- **GIVEN** an `IUnitGameState` for any unit
- **WHEN** the type is inspected
- **THEN** `combatState` SHALL be one of `{ kind: 'aero'; state: IAerospaceCombatState }`, `{ kind: 'proto'; state: IProtoMechCombatState }`, `{ kind: 'platoon'; state: IInfantryCombatState }`, or `{ kind: 'squad'; state: IBattleArmorCombatState }`
- **AND** the slot SHALL be optional (legacy mech-only callers continue to omit it without breakage)

#### Scenario: Single-channel rule

- **GIVEN** a renderer or sync consumer needs per-type combat data
- **WHEN** it reads `IUnitGameState`
- **THEN** it SHALL obtain that data ONLY through `combatState`
- **AND** it SHALL NOT consult parallel per-type maps, side-channels, or out-of-band lookups

### Requirement: Combat-State Seeding at Initialization

`createInitialUnitState` SHALL seed `combatState.kind === "vehicle"` for
represented vehicle-family units (`VEHICLE`, `VTOL`, and `SUPPORT_VEHICLE`)
when the session unit supplies `vehicleInit`.

#### Scenario: Vehicle init seeds vehicle combat state

- **GIVEN** an `IGameUnit` with `unitType: VEHICLE`, `VTOL`, or
  `SUPPORT_VEHICLE`
- **AND** the unit supplies `vehicleInit.motionType`,
  `vehicleInit.originalCruiseMP`, `vehicleInit.armor`, and
  `vehicleInit.structure`
- **WHEN** initial game state is created
- **THEN** the unit SHALL have `combatState.kind === "vehicle"`
- **AND** the inner state SHALL preserve the vehicle motion type, turret type,
  starting motive state, armor, structure, and VTOL altitude when supplied.

#### Scenario: Missing vehicle init is rejected

- **GIVEN** an `IGameUnit` with a represented vehicle-family `unitType`
- **AND** the required `vehicleInit` block or required field is missing
- **WHEN** initial game state is created
- **THEN** initialization SHALL throw an error naming the unit id and missing
  field.

### Requirement: Discriminated Initialization Assertion

`createInitialUnitState` SHALL throw a typed error when an `IGameUnit` whose `unitType` is one of the four supported per-type discriminants arrives without the construction inputs needed to seed its `combatState`. This rejects silent fall-back to defaults at the entry point and surfaces compendium / lobby gaps loudly during session creation.

#### Scenario: Missing aerospace inputs

- **GIVEN** an `IGameUnit` with `unitType === AEROSPACE_FIGHTER` whose construction blob lacks `maxSI`, `armorByArc`, or `heatSinks`
- **WHEN** `createInitialUnitState(unit, position)` runs
- **THEN** an error SHALL be thrown
- **AND** the error message SHALL identify the unit id and the missing field(s)

#### Scenario: Aerospace inputs present

- **GIVEN** the same `IGameUnit` after the missing fields are populated
- **WHEN** `createInitialUnitState(unit, position)` runs
- **THEN** the returned `IUnitGameState.combatState.kind` SHALL be `'aero'`
- **AND** no error SHALL be thrown

### Requirement: Aerospace Altitude Field

`IAerospaceCombatState` SHALL carry an `altitude` field expressing the unit's current altitude band (0 = landed; positive integers = airborne in standard altitude bands per BattleTech aerospace rules). The factory `createAerospaceCombatState` SHALL accept an optional `altitude` parameter and SHALL default to `1` (airborne) when the parameter is omitted, matching the prior render-time fallback in `AerospaceToken`.

`velocity` is intentionally NOT added in this change; consumers that need velocity SHALL fall back to `0` and a TODO marker SHALL point at "movement slice 2".

#### Scenario: Default altitude on construction

- **GIVEN** `createAerospaceCombatState({...})` is called without `altitude`
- **WHEN** the resulting state is inspected
- **THEN** `altitude` SHALL equal `1`

#### Scenario: Explicit landed altitude

- **GIVEN** `createAerospaceCombatState({..., altitude: 0})` is called
- **WHEN** the resulting state is inspected
- **THEN** `altitude` SHALL equal `0`
- **AND** downstream renderers SHALL treat the unit as landed

### Requirement: Component Damage Preserves Actuator Location When Available

Component damage state SHALL preserve actuator critical damage by combat
location when the critical-hit resolver receives a combat location.

#### Scenario: Actuator critical hit records location-keyed damage

- **GIVEN** a critical slot actuator is destroyed in a known combat location
- **WHEN** the critical effect updates component damage
- **THEN** the aggregate actuator flag SHALL remain set for existing consumers
- **AND** the same actuator SHALL be marked under `actuatorsByLocation` for the
  hit location.

### Requirement: Physical Attack Declaration Payloads

`PhysicalAttackDeclared` events SHALL preserve the player-facing physical
attack selection needed by later resolution and replay consumers.

#### Scenario: Physical declaration preserves selected hit table

- **GIVEN** a physical attack declaration is accepted from a rules-backed map
  projection
- **WHEN** the projection selected a physical hit-location table for the attack
- **THEN** the emitted `PhysicalAttackDeclared` payload SHALL include that
  `hitTable`
- **AND** physical attack resolution SHALL prefer the declared table over
  recalculating from incomplete attacker-only context.

### Requirement: Vehicle Combat-State Replay

Vehicle damage and vehicle-specific combat events SHALL update the
`combatState.kind === "vehicle"` envelope during event replay so derived state
matches the committed event log.

#### Scenario: DamageApplied mirrors vehicle armor and structure

- **GIVEN** a vehicle unit has `combatState.kind === "vehicle"`
- **WHEN** replay applies `DamageApplied` for a vehicle location
- **THEN** the top-level unit armor and structure SHALL update as before
- **AND** the inner vehicle combat state's armor, structure, and destroyed
  locations SHALL update for the same location.

#### Scenario: Motive events mutate vehicle motive state

- **GIVEN** a vehicle unit has `combatState.kind === "vehicle"`
- **WHEN** replay applies `MotiveDamaged`, `VehicleImmobilized`,
  `TurretLocked`, or `VehicleCrewStunned`
- **THEN** the inner vehicle combat state SHALL reflect the corresponding
  motive penalty, immobilized flag, turret lock, or crew-stun duration.

### Requirement: Vehicle Critical Replay State

The game-state reducer SHALL mirror replayed vehicle critical effects into the
vehicle combat-state envelope.

#### Scenario: Vehicle engine critical is replayed

- **GIVEN** a unit with `combatState.kind === "vehicle"`
- **WHEN** a `CriticalHitResolved` event with `effect: "engine_hit"` is replayed
- **THEN** the unit's vehicle combat-state `motive.engineHits` SHALL increase
  by one.

#### Scenario: Vehicle driver critical is replayed

- **GIVEN** a unit with `combatState.kind === "vehicle"`
- **WHEN** a `CriticalHitResolved` event with `effect: "driver_hit"` is replayed
- **THEN** the unit's vehicle combat-state `motive.driverHits` SHALL increase
  by one.

#### Scenario: Vehicle ammo critical destruction is replayed

- **GIVEN** a unit with `combatState.kind === "vehicle"`
- **WHEN** a crit-induced `AmmoExplosion` and matching `UnitDestroyed` event are
  replayed
- **THEN** the unit SHALL be marked destroyed
- **AND** the inner vehicle combat state SHALL carry
  `destructionCause: "ammo_explosion"`.

### Requirement: Representable Vehicle Critical Replay Effects

The game-state reducer SHALL mirror representable vehicle critical effects into
the vehicle combat-state envelope.

#### Scenario: Fuel tank critical destroys the vehicle

- **GIVEN** a unit with `combatState.kind === "vehicle"`
- **WHEN** a `CriticalHitResolved` event with `effect: "fuel_tank"` is replayed
- **THEN** the vehicle combat state SHALL be marked destroyed
- **AND** the inner destruction cause SHALL be `fuel_tank_explosion`.

#### Scenario: Turret lock critical updates turret lock state

- **GIVEN** a unit with `combatState.kind === "vehicle"`
- **WHEN** a `TurretLocked` event is replayed after a `turret_locked` critical
- **THEN** the vehicle turret lock state SHALL mark the affected turret locked.

#### Scenario: Rotor destroyed critical immobilizes a VTOL

- **GIVEN** a VTOL unit with `combatState.kind === "vehicle"`
- **WHEN** a `CriticalHitResolved` event with `effect: "rotor_destroyed"` is
  replayed
- **THEN** the vehicle motive state SHALL be immobilized.

#### Scenario: Vehicle damage replay updates inner armor and structure

- **GIVEN** a unit with `combatState.kind === "vehicle"`
- **WHEN** a `DamageApplied` event is replayed against a vehicle location
- **THEN** the vehicle combat-state envelope SHALL update the matching inner
  armor and structure values
- **AND** destroyed vehicle locations SHALL be recorded inside the vehicle
  state, not only on the outer unit record.

#### Scenario: Weapon critical replay records availability state

- **GIVEN** a unit with `combatState.kind === "vehicle"`
- **WHEN** a `CriticalHitResolved` event with `effect: "weapon_destroyed"` is
  replayed for a mounted vehicle weapon
- **THEN** the affected weapon SHALL be unavailable in the vehicle combat-state
  envelope.

#### Scenario: Critical destruction cause survives unit destruction replay

- **GIVEN** a vehicle critical has already marked the vehicle destroyed with a
  critical-specific destruction cause
- **WHEN** a later `UnitDestroyed` event for the same vehicle is replayed
- **THEN** the vehicle combat-state envelope SHALL preserve the
  critical-specific destruction cause instead of replacing it with a generic
  unit-destroyed cause.

## Dependencies

- **game-event-system**: Provides the IGameEvent and all typed payload interfaces consumed by applyEvent
- **event-store**: Provides persistent event storage; this system derives state from stored events

## Used By

- **game-session-management**: Uses deriveState to compute current state for session orchestration
- **combat-analytics**: Queries derived state for damage matrices and performance metrics
- **battle-replay**: Uses deriveStateAtSequence for step-through replay
- **tactical-map-interface**: Renders unit positions, facing, and status from derived state
- **AI/opponent logic**: Reads derived state for decision making
