# game-engine-orchestration Delta — wire-interactive-turn-engine

## MODIFIED Requirements

### Requirement: InteractiveSession Player Actions

The InteractiveSession SHALL provide methods to apply player movement, weapon
attack, and physical attack decisions. Each session-mutating action method —
`applyMovement`, `applyAttack`, `applyPhysicalAttack`, `declareWithdrawal`, and
`applyRuntimeMovementState` — SHALL reject mutation of a non-Active session with
the same lifecycle error the session-management lifecycle rules mandate. The
interactive physical-attack commit SHALL go through `applyPhysicalAttack` so the
declaration lands on the engine's authoritative session.

#### Scenario: Apply movement

- **GIVEN** an active InteractiveSession in Movement phase
- **WHEN** calling `applyMovement(unitId, to, facing, movementType)`
- **THEN** the session SHALL call `declareMovement` with the provided parameters
- **AND** the session SHALL call `lockMovement` for the unit

#### Scenario: Apply attack

- **GIVEN** an active InteractiveSession in WeaponAttack phase
- **WHEN** calling `applyAttack(attackerId, targetId, weaponIds)`
- **THEN** the session SHALL construct IWeaponAttack objects from the weapon IDs
- **AND** the session SHALL calculate the firing arc from attacker to target
- **AND** the session SHALL call `declareAttack` with the constructed attack data
- **AND** the session SHALL call `lockAttack` for the attacker

#### Scenario: Apply physical attack declares on the engine session

- **GIVEN** an active InteractiveSession in PhysicalAttack phase
- **WHEN** calling `applyPhysicalAttack(attackerId, targetId, attackType, limb)`
- **THEN** the session SHALL build the physical-attack context and call
  `declarePhysicalAttack` against `this.session`
- **AND** the resulting `PhysicalAttackDeclared` event SHALL be present on the
  session returned by `getSession()`
- **AND** the once-per-session finalize/publish check SHALL run after the
  declaration.

#### Scenario: Action methods reject a completed session

- **GIVEN** an InteractiveSession whose `currentState.status` is
  `GameStatus.Completed`
- **WHEN** any of `applyMovement`, `applyAttack`, `applyPhysicalAttack`,
  `declareWithdrawal`, or `applyRuntimeMovementState` is called
- **THEN** the call SHALL throw the lifecycle error "Game is not active"
- **AND** the completed session SHALL NOT be mutated.

## ADDED Requirements

### Requirement: Interactive and Spectator Turn Loops Progress Through PhysicalAttack

The interactive and spectator turn-loop drivers SHALL drive every phase of the
6-phase turn loop — including PhysicalAttack — by running the AI turn and
advancing the phase when the engine sits in that phase, and SHALL re-read the
live engine phase before each phase guard so a single driver tick always makes
forward progress toward Heat, End, and game-over. The drivers SHALL NOT stall
indefinitely on any single phase.

#### Scenario: Driver advances out of PhysicalAttack

- **GIVEN** an interactive or spectator turn-loop driver whose engine session is
  in `GamePhase.PhysicalAttack` and the game is not over
- **WHEN** the driver runs one tick
- **THEN** the driver SHALL run the AI turn for the PhysicalAttack phase and call
  `advancePhase`
- **AND** after the tick the engine phase SHALL no longer be PhysicalAttack.

#### Scenario: A single tick walks the full phase order without livelock

- **GIVEN** a started interactive/spectator session at the start of a turn
- **WHEN** the driver runs one full-turn tick
- **THEN** the driver SHALL progress Movement → WeaponAttack → PhysicalAttack →
  Heat → End, running each phase exactly once
- **AND** the tick SHALL reach a game-over / next-turn check rather than spinning
  on a phase that never advances.

#### Scenario: Loop terminates on elimination

- **GIVEN** a spectator/interactive driver running on a timer over a fixture where
  one side is eliminated
- **WHEN** the loop runs to that elimination
- **THEN** `isGameOver` SHALL eventually become true and the loop SHALL stop
- **AND** the loop SHALL NOT remain in PhysicalAttack with `isGameOver` false
  forever.
