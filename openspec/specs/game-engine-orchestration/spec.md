# game-engine-orchestration Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: game-session-management, simulation-system, spatial-combat-system
**Affects**: Quick Session, Campaign Battles, AI Simulation

---

## Overview

### Purpose

The Game Engine Orchestration system defines how battles are executed in both auto-resolve and interactive modes. It orchestrates the 6-phase turn loop (Initiative → Movement → WeaponAttack → PhysicalAttack → Heat → End), manages AI decision-making integration, and determines battle outcomes.

### Scope

**In Scope:**

- GameEngine class configuration and lifecycle
- Auto-resolve mode (runToCompletion)
- Interactive mode (InteractiveSession)
- 6-phase turn loop orchestration
- AI integration for movement and attack phases
- Winner determination logic
- Unit adaptation from compendium data
- Helper functions for grid creation and state conversion

**Out of Scope:**

- AI decision-making algorithms (handled by BotPlayer)
- Game session state management (handled by gameSession utilities)
- Combat resolution mechanics (handled by GameOutcomeCalculator)
- Hex grid pathfinding and movement validation
- Weapon damage calculation and critical hit resolution

### Key Concepts

- **GameEngine**: Top-level orchestrator that creates and runs battles with configurable map size, turn limit, and random seed
- **Auto-Resolve Mode**: Fully automated battles where both sides are AI-controlled, returning a completed game session
- **Interactive Mode**: Turn-by-turn battles where human players can control units, query available actions, and advance phases manually
- **6-Phase Turn Loop**: Initiative → Movement → WeaponAttack → PhysicalAttack → Heat → End
- **IAdaptedUnit**: Extended unit state that carries weapon and movement capability data alongside base game state
- **Winner Determination**: Elimination check → surviving unit count comparison → draw
- **Phase Advancement**: Different behavior per phase (Initiative rolls dice, Movement locks units, WeaponAttack resolves attacks, etc.)

---

## Requirements

### Requirement: GameEngine Configuration

The GameEngine SHALL accept optional configuration for map radius, turn limit, and random seed.

**Rationale**: Configurable parameters allow testing, deterministic replay, and varied battle scenarios.

**Priority**: Critical

#### Scenario: Default configuration

**GIVEN** no configuration is provided
**WHEN** creating a new GameEngine
**THEN** mapRadius SHALL default to 7
**AND** turnLimit SHALL default to 30
**AND** seed SHALL default to Date.now()
**AND** a minimal hex grid SHALL be created with the specified radius

#### Scenario: Custom configuration

**GIVEN** a configuration with mapRadius=5, turnLimit=10, seed=42
**WHEN** creating a new GameEngine
**THEN** the engine SHALL use mapRadius=5
**AND** the engine SHALL use turnLimit=10
**AND** the engine SHALL use seed=42 for deterministic random number generation

### Requirement: Auto-Resolve Mode

The GameEngine SHALL provide a runToCompletion method that executes a fully automated battle and returns the completed game session.

**Rationale**: Auto-resolve mode enables quick battle resolution for campaign management and AI vs AI testing.

**Priority**: Critical

#### Scenario: Run battle to completion

**GIVEN** player units, opponent units, and game unit configurations
**WHEN** calling runToCompletion
**THEN** the engine SHALL create a game session with the configured map radius and turn limit
**AND** the engine SHALL start the game with GameSide.Player as the starting side
**AND** the engine SHALL execute the 6-phase turn loop for each turn
**AND** the engine SHALL use BotPlayer AI for all unit decisions
**AND** the engine SHALL return a completed IGameSession when the game ends

#### Scenario: Battle ends by elimination

**GIVEN** a battle in progress
**WHEN** all units of one side are destroyed
**THEN** the engine SHALL call endGame with the winning side and reason='destruction'
**AND** the engine SHALL return the completed session immediately

#### Scenario: Battle ends by turn limit

**GIVEN** a battle in progress
**WHEN** the turn limit is reached without elimination
**THEN** the engine SHALL determine the winner by surviving unit count
**AND** the engine SHALL call endGame with the winner and reason='turn_limit'
**AND** the engine SHALL return the completed session

### Requirement: Interactive Session Creation

The GameEngine SHALL provide a createInteractiveSession method that returns an InteractiveSession object for turn-by-turn control.

**Rationale**: Interactive mode enables human players to control units, query available actions, and advance phases manually.

**Priority**: Critical

#### Scenario: Create interactive session

**GIVEN** player units, opponent units, and game unit configurations
**WHEN** calling createInteractiveSession
**THEN** the engine SHALL return an InteractiveSession object
**AND** the session SHALL start in GamePhase.Initiative
**AND** the session SHALL have GameStatus.Active
**AND** the session SHALL not be game over

### Requirement: 6-Phase Turn Loop

The system SHALL execute a 6-phase turn loop in the following order: Initiative → Movement → WeaponAttack → PhysicalAttack → Heat → End.

**Rationale**: The 6-phase turn loop is the core BattleTech game mechanic for resolving combat.

**Priority**: Critical

#### Scenario: Initiative phase

**GIVEN** the current phase is Initiative
**WHEN** advancing the phase
**THEN** the engine SHALL call rollInitiative to determine turn order
**AND** the engine SHALL advance to Movement phase

#### Scenario: Movement phase

**GIVEN** the current phase is Movement
**WHEN** processing the phase
**THEN** the engine SHALL iterate through all units
**AND** for each non-destroyed unit, the engine SHALL call BotPlayer.playMovementPhase
**AND** the engine SHALL call declareMovement with the AI's chosen destination, facing, movement type, MP used, and heat generated
**AND** the engine SHALL call lockMovement for each unit
**AND** the engine SHALL advance to WeaponAttack phase

#### Scenario: WeaponAttack phase

**GIVEN** the current phase is WeaponAttack
**WHEN** processing the phase
**THEN** the engine SHALL iterate through all units
**AND** for each non-destroyed unit, the engine SHALL call BotPlayer.playAttackPhase with enemy units
**AND** the engine SHALL call declareAttack with the AI's chosen target, weapons, and firing arc
**AND** the engine SHALL call lockAttack for each unit
**AND** the engine SHALL call resolveAllAttacks to apply damage
**AND** the engine SHALL advance to PhysicalAttack phase

#### Scenario: PhysicalAttack phase

**GIVEN** the current phase is PhysicalAttack
**WHEN** processing the phase
**THEN** the engine SHALL advance to Heat phase (physical attacks are pass-through in current implementation)

#### Scenario: Heat phase

**GIVEN** the current phase is Heat
**WHEN** processing the phase
**THEN** the engine SHALL call resolveHeatPhase to apply heat effects
**AND** the engine SHALL advance to End phase

#### Scenario: End phase

**GIVEN** the current phase is End
**WHEN** processing the phase
**THEN** the engine SHALL check if the game is over using isGameEnded
**AND** if the game is over, the engine SHALL call endGame with the winner and reason
**AND** if the game is not over, the engine SHALL advance to Initiative phase for the next turn

### Requirement: InteractiveSession State Access

The InteractiveSession SHALL provide methods to query game state, session data, and available actions.

**Rationale**: Interactive mode requires access to current state for UI rendering and player decision-making.

**Priority**: Critical

#### Scenario: Get current state

**GIVEN** an active InteractiveSession
**WHEN** calling getState
**THEN** the session SHALL return the current IGameState

#### Scenario: Get full session

**GIVEN** an active InteractiveSession
**WHEN** calling getSession
**THEN** the session SHALL return the full IGameSession including events

#### Scenario: Get available actions for a unit

**GIVEN** an active InteractiveSession and a unit ID
**WHEN** calling getAvailableActions(unitId)
**THEN** the session SHALL return IAvailableActions with validMoves and validTargets
**AND** validTargets SHALL include all enemy units with their available weapons
**AND** if the unit is destroyed or does not exist, the session SHALL return empty arrays

### Requirement: InteractiveSession Player Actions

The InteractiveSession SHALL provide methods to apply player movement and attack decisions.

**Rationale**: Interactive mode requires methods to apply player decisions to the game state.

**Priority**: Critical

#### Scenario: Apply movement

**GIVEN** an active InteractiveSession in Movement phase
**WHEN** calling applyMovement(unitId, to, facing, movementType)
**THEN** the session SHALL call declareMovement with the provided parameters
**AND** the session SHALL call lockMovement for the unit

#### Scenario: Apply attack

**GIVEN** an active InteractiveSession in WeaponAttack phase
**WHEN** calling applyAttack(attackerId, targetId, weaponIds)
**THEN** the session SHALL construct IWeaponAttack objects from the weapon IDs
**AND** the session SHALL calculate the firing arc from attacker to target
**AND** the session SHALL call declareAttack with the constructed attack data
**AND** the session SHALL call lockAttack for the attacker

### Requirement: InteractiveSession Phase Advancement

The InteractiveSession SHALL provide an advancePhase method that progresses the game through the 6-phase turn loop.

**Rationale**: Interactive mode requires manual phase advancement to allow player decision-making.

**Priority**: Critical

#### Scenario: Advance from Initiative

**GIVEN** an InteractiveSession in Initiative phase
**WHEN** calling advancePhase
**THEN** the session SHALL call rollInitiative
**AND** the session SHALL advance to Movement phase

#### Scenario: Advance from Movement

**GIVEN** an InteractiveSession in Movement phase
**WHEN** calling advancePhase
**THEN** the session SHALL lock all unlocked units
**AND** the session SHALL advance to WeaponAttack phase

#### Scenario: Advance from WeaponAttack

**GIVEN** an InteractiveSession in WeaponAttack phase
**WHEN** calling advancePhase
**THEN** the session SHALL lock all unlocked units
**AND** the session SHALL call resolveAllAttacks
**AND** the session SHALL advance to PhysicalAttack phase

#### Scenario: Advance from PhysicalAttack

**GIVEN** an InteractiveSession in PhysicalAttack phase
**WHEN** calling advancePhase
**THEN** the session SHALL advance to Heat phase

#### Scenario: Advance from Heat

**GIVEN** an InteractiveSession in Heat phase
**WHEN** calling advancePhase
**THEN** the session SHALL call resolveHeatPhase
**AND** the session SHALL advance to End phase

#### Scenario: Advance from End

**GIVEN** an InteractiveSession in End phase
**WHEN** calling advancePhase
**THEN** if the game is not over, the session SHALL advance to Initiative phase
**AND** if the game is over, the session SHALL not advance

### Requirement: InteractiveSession AI Turn Execution

The InteractiveSession SHALL provide a runAITurn method that executes AI decisions for all units of a specified side.

**Rationale**: Interactive mode requires AI control for opponent units or AI-assisted player units.

**Priority**: High

#### Scenario: Run AI turn in Movement phase

**GIVEN** an InteractiveSession in Movement phase
**WHEN** calling runAITurn(GameSide.Opponent)
**THEN** the session SHALL iterate through all opponent units
**AND** for each non-destroyed unit, the session SHALL call BotPlayer.playMovementPhase
**AND** the session SHALL call declareMovement and lockMovement for each unit

#### Scenario: Run AI turn in WeaponAttack phase

**GIVEN** an InteractiveSession in WeaponAttack phase
**WHEN** calling runAITurn(GameSide.Opponent)
**THEN** the session SHALL iterate through all opponent units
**AND** for each non-destroyed unit, the session SHALL call BotPlayer.playAttackPhase
**AND** the session SHALL call declareAttack and lockAttack for each unit

#### Scenario: Run AI turn in other phases

**GIVEN** an InteractiveSession in a phase other than Movement or WeaponAttack
**WHEN** calling runAITurn
**THEN** the session SHALL do nothing (AI only acts in Movement and WeaponAttack phases)

### Requirement: Winner Determination

The system SHALL determine the winner based on elimination or surviving unit count.

**Rationale**: Winner determination is required to end the game and calculate battle outcomes.

**Priority**: Critical

#### Scenario: Winner by elimination (Player wins)

**GIVEN** a game state where all opponent units are destroyed
**WHEN** determining the winner
**THEN** the system SHALL return GameSide.Player

#### Scenario: Winner by elimination (Opponent wins)

**GIVEN** a game state where all player units are destroyed
**WHEN** determining the winner
**THEN** the system SHALL return GameSide.Opponent

#### Scenario: Draw by mutual elimination

**GIVEN** a game state where all units of both sides are destroyed
**WHEN** determining the winner
**THEN** the system SHALL return 'draw'

#### Scenario: Winner by surviving count (Player wins)

**GIVEN** a game state where both sides have surviving units
**AND** the player has more surviving units than the opponent
**WHEN** determining the winner
**THEN** the system SHALL return GameSide.Player

#### Scenario: Winner by surviving count (Opponent wins)

**GIVEN** a game state where both sides have surviving units
**AND** the opponent has more surviving units than the player
**WHEN** determining the winner
**THEN** the system SHALL return GameSide.Opponent

#### Scenario: Draw by equal surviving count

**GIVEN** a game state where both sides have the same number of surviving units
**WHEN** determining the winner
**THEN** the system SHALL return 'draw'

### Requirement: Game Over Detection

The InteractiveSession SHALL provide an isGameOver method that checks if the game has ended.

**Rationale**: Interactive mode requires game over detection to prevent invalid actions and trigger outcome calculation.

**Priority**: Critical

#### Scenario: Game is over

**GIVEN** an InteractiveSession where all units of one side are destroyed
**WHEN** calling isGameOver
**THEN** the session SHALL return true

#### Scenario: Game is not over

**GIVEN** an InteractiveSession where both sides have surviving units
**WHEN** calling isGameOver
**THEN** the session SHALL return false

### Requirement: Game Outcome Calculation

The InteractiveSession SHALL provide a getResult method that returns the game outcome when the game is over.

**Rationale**: Interactive mode requires outcome calculation for UI display and campaign integration.

**Priority**: High

#### Scenario: Get result when game is over

**GIVEN** an InteractiveSession where the game is over
**WHEN** calling getResult
**THEN** the session SHALL return an IGameOutcome object with winner, reason, and statistics

#### Scenario: Get result when game is not over

**GIVEN** an InteractiveSession where the game is not over
**WHEN** calling getResult
**THEN** the session SHALL return null

---

## Data Model Requirements

### IGameEngineConfig

Configuration for the GameEngine.

```typescript
interface IGameEngineConfig {
  /** Map hex grid radius (default: 7) */
  readonly mapRadius?: number;
  /** Maximum turns before draw (default: 30) */
  readonly turnLimit?: number;
  /** Random seed for deterministic playback (default: Date.now()) */
  readonly seed?: number;
}
```

### IAdaptedUnit

Extended unit game state with engine-specific data. Carries weapon and movement capability info alongside the base state.

```typescript
interface IAdaptedUnit extends IUnitGameState {
  /** Weapons equipped on this unit */
  readonly weapons: readonly IWeapon[];
  /** Walking movement points */
  readonly walkMP: number;
  /** Running movement points (ceil(walkMP * 1.5)) */
  readonly runMP: number;
  /** Jump movement points (0 if no jump jets) */
  readonly jumpMP: number;
}
```

### IAvailableActions

Available actions for a unit in the current phase.

```typescript
interface IAvailableActions {
  /** Valid movement destinations */
  readonly validMoves: readonly IHexCoordinate[];
  /** Valid attack targets with selectable weapons */
  readonly validTargets: readonly {
    readonly unitId: string;
    readonly weapons: readonly string[];
  }[];
}
```

### IWeaponData

Static weapon data for the compendium adapter. Matches IWeapon from the AI system but used for initial construction.

```typescript
interface IWeaponData {
  /** Weapon identifier (e.g. "medium-laser") */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Short range in hexes */
  readonly shortRange: number;
  /** Medium range in hexes */
  readonly mediumRange: number;
  /** Long range in hexes */
  readonly longRange: number;
  /** Damage per hit */
  readonly damage: number;
  /** Heat generated when fired */
  readonly heat: number;
  /** Minimum range (0 = no minimum) */
  readonly minRange: number;
  /** Ammo per ton (-1 = energy weapon) */
  readonly ammoPerTon: number;
  /** Whether this weapon is destroyed */
  readonly destroyed: boolean;
}
```

### IAdaptUnitOptions

Options for adapting a unit from compendium data.

```typescript
interface IAdaptUnitOptions {
  /** Which side this unit fights for */
  readonly side?: GameSide;
  /** Starting hex position */
  readonly position?: IHexCoordinate;
  /** Starting facing direction */
  readonly facing?: Facing;
  /** Pilot gunnery skill (default: 4) */
  readonly gunnery?: number;
  /** Pilot piloting skill (default: 5) */
  readonly piloting?: number;
  /** Pre-existing damage by location key */
  readonly initialDamage?: Record<string, number>;
}
```

---

## Calculation Formulas

### Minimal Grid Creation

Creates a hexagonal grid with the specified radius.

```typescript
function createMinimalGrid(radius: number): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        const key = `${q},${r}`;
        hexes.set(key, {
          coord: { q, r },
          occupantId: null,
          terrain: 'clear',
          elevation: 0,
        });
      }
    }
  }
  return { config: { radius }, hexes };
}
```

### AI Unit State Conversion

Converts IUnitGameState to IAIUnitState for BotPlayer consumption.

```typescript
function toAIUnitState(
  unit: IUnitGameState,
  weapons: readonly IWeapon[],
  gunnery: number,
): IAIUnitState {
  return {
    unitId: unit.id,
    position: unit.position,
    facing: unit.facing,
    heat: unit.heat,
    weapons,
    ammo: unit.ammo,
    destroyed: unit.destroyed,
    gunnery,
    movementType: unit.movementThisTurn,
    hexesMoved: unit.hexesMovedThisTurn,
  };
}
```

### Movement Capability Conversion

Extracts movement capability from IAdaptedUnit.

```typescript
function toMovementCapability(adapted: IAdaptedUnit): IMovementCapability {
  return {
    walkMP: adapted.walkMP,
    runMP: adapted.runMP,
    jumpMP: adapted.jumpMP,
  };
}
```

### Winner Determination Logic

Determines the winner based on elimination or surviving unit count.

```typescript
function determineWinnerFromState(state: IGameState): GameSide | 'draw' {
  const playerAlive = Object.values(state.units).some(
    (u) => u.side === GameSide.Player && !u.destroyed,
  );
  const opponentAlive = Object.values(state.units).some(
    (u) => u.side === GameSide.Opponent && !u.destroyed,
  );

  // Elimination check
  if (!playerAlive && !opponentAlive) return 'draw';
  if (!opponentAlive) return GameSide.Player;
  if (!playerAlive) return GameSide.Opponent;

  // Surviving count comparison
  const pCount = Object.values(state.units).filter(
    (u) => u.side === GameSide.Player && !u.destroyed,
  ).length;
  const oCount = Object.values(state.units).filter(
    (u) => u.side === GameSide.Opponent && !u.destroyed,
  ).length;

  if (pCount > oCount) return GameSide.Player;
  if (oCount > pCount) return GameSide.Opponent;
  return 'draw';
}
```

---

## Validation Rules

### Configuration Validation

- `mapRadius` MUST be a positive integer (default: 7)
- `turnLimit` MUST be a positive integer (default: 30)
- `seed` MUST be a finite number (default: Date.now())

### Unit Validation

- `playerUnits` and `opponentUnits` MUST be non-empty arrays
- Each unit MUST have a unique `id`
- Each unit MUST have valid `weapons`, `walkMP`, `runMP`, and `jumpMP` properties
- `gameUnits` MUST match the combined player and opponent units by ID

### Phase Validation

- Phase advancement MUST follow the 6-phase order: Initiative → Movement → WeaponAttack → PhysicalAttack → Heat → End
- Units MUST be locked before advancing from Movement or WeaponAttack phases
- Attacks MUST be resolved before advancing from WeaponAttack phase
- Heat MUST be resolved before advancing from Heat phase

### Action Validation

- Movement actions MUST only be applied in Movement phase
- Attack actions MUST only be applied in WeaponAttack phase
- AI turn execution MUST only occur in Movement or WeaponAttack phases
- Actions MUST not be applied to destroyed units

---

## Implementation Notes

### Performance Considerations

- **Grid Creation**: Minimal grid creation is O(radius²) and should be cached per engine instance
- **AI State Conversion**: Unit state conversion is O(n) per unit and occurs multiple times per turn
- **Winner Determination**: Surviving unit count is O(n) and should only be called when game ends

### Edge Cases

- **Empty Unit Arrays**: If either side has no units, the game should end immediately with the other side winning
- **All Units Destroyed Simultaneously**: If all units are destroyed in the same attack resolution, the game should end in a draw
- **Turn Limit Reached with Equal Counts**: If the turn limit is reached and both sides have equal surviving units, the game should end in a draw
- **Destroyed Unit Actions**: Actions should not be applied to destroyed units; getAvailableActions should return empty arrays

### Common Pitfalls

- **Forgetting to Lock Units**: Units must be locked before advancing from Movement or WeaponAttack phases
- **Not Resolving Attacks**: Attacks must be resolved before advancing from WeaponAttack phase
- **Not Resolving Heat**: Heat must be resolved before advancing from Heat phase
- **Calling advancePhase in End Phase When Game Over**: advancePhase should not advance if the game is over

### Testing Strategies

- **Deterministic Replay**: Use fixed seeds to ensure reproducible battles for testing
- **Phase Progression**: Test that each phase advances correctly and executes the expected logic
- **Winner Determination**: Test all winner determination scenarios (elimination, surviving count, draw)
- **Interactive Actions**: Test that player actions are applied correctly and locked appropriately
- **AI Integration**: Test that AI decisions are executed correctly in both auto-resolve and interactive modes

---

## Examples

### Example 1: Auto-Resolve Battle

```typescript
import { GameEngine } from '@/engine/GameEngine';
import type { IAdaptedUnit } from '@/engine/types';
import {
  GameSide,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';

// Create test units
const playerUnit: IAdaptedUnit = {
  id: 'player-1',
  side: GameSide.Player,
  position: { q: 0, r: -3 },
  facing: Facing.North,
  heat: 0,
  movementThisTurn: MovementType.Stationary,
  hexesMovedThisTurn: 0,
  armor: {
    /* ... */
  },
  structure: {
    /* ... */
  },
  destroyedLocations: [],
  destroyedEquipment: [],
  ammo: {},
  pilotWounds: 0,
  pilotConscious: true,
  destroyed: false,
  lockState: LockState.Pending,
  weapons: [
    {
      id: 'ml-1',
      name: 'Medium Laser',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 5,
      heat: 3,
      minRange: 0,
      ammoPerTon: -1,
      destroyed: false,
    },
  ],
  walkMP: 4,
  runMP: 6,
  jumpMP: 0,
};

const opponentUnit: IAdaptedUnit = {
  id: 'opponent-1',
  side: GameSide.Opponent,
  position: { q: 0, r: 3 },
  facing: Facing.South,
  // ... similar structure
};

const gameUnits: IGameUnit[] = [
  {
    id: 'player-1',
    name: 'Atlas AS7-D',
    side: GameSide.Player,
    unitRef: 'atlas-as7-d',
    pilotRef: 'player-pilot',
    gunnery: 4,
    piloting: 5,
  },
  {
    id: 'opponent-1',
    name: 'Timber Wolf Prime',
    side: GameSide.Opponent,
    unitRef: 'timber-wolf-prime',
    pilotRef: 'opponent-pilot',
    gunnery: 3,
    piloting: 4,
  },
];

// Run auto-resolve battle
const engine = new GameEngine({
  mapRadius: 7,
  turnLimit: 30,
  seed: 12345,
});

const session = engine.runToCompletion([playerUnit], [opponentUnit], gameUnits);

console.log('Battle completed:', session.currentState.status);
console.log('Winner:', session.currentState.winner);
console.log('Events:', session.events.length);
```

### Example 2: Interactive Session

```typescript
import { GameEngine } from '@/engine/GameEngine';
import { GamePhase } from '@/types/gameplay/GameSessionInterfaces';

// Create engine and interactive session
const engine = new GameEngine({ seed: 42 });
const interactive = engine.createInteractiveSession(
  [playerUnit],
  [opponentUnit],
  gameUnits,
);

// Check initial state
console.log('Phase:', interactive.getState().phase); // Initiative
console.log('Game over:', interactive.isGameOver()); // false

// Advance through Initiative
interactive.advancePhase();
console.log('Phase:', interactive.getState().phase); // Movement

// Get available actions for player unit
const actions = interactive.getAvailableActions('player-1');
console.log('Valid targets:', actions.validTargets);

// Apply player movement
interactive.applyMovement(
  'player-1',
  { q: 0, r: -2 },
  Facing.North,
  MovementType.Walk,
);

// Run AI turn for opponent
interactive.runAITurn(GameSide.Opponent);

// Advance to WeaponAttack phase
interactive.advancePhase();
console.log('Phase:', interactive.getState().phase); // WeaponAttack

// Apply player attack
interactive.applyAttack('player-1', 'opponent-1', ['ml-1']);

// Run AI turn for opponent
interactive.runAITurn(GameSide.Opponent);

// Advance through remaining phases
interactive.advancePhase(); // → PhysicalAttack
interactive.advancePhase(); // → Heat
interactive.advancePhase(); // → End

// Check if game is over
if (interactive.isGameOver()) {
  const result = interactive.getResult();
  console.log('Winner:', result?.winner);
  console.log('Reason:', result?.reason);
}
```

### Example 3: Winner Determination

```typescript
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

// Scenario 1: Player wins by elimination
const state1 = {
  units: {
    'player-1': { side: GameSide.Player, destroyed: false },
    'opponent-1': { side: GameSide.Opponent, destroyed: true },
  },
};
const winner1 = determineWinnerFromState(state1);
console.log(winner1); // GameSide.Player

// Scenario 2: Draw by mutual elimination
const state2 = {
  units: {
    'player-1': { side: GameSide.Player, destroyed: true },
    'opponent-1': { side: GameSide.Opponent, destroyed: true },
  },
};
const winner2 = determineWinnerFromState(state2);
console.log(winner2); // 'draw'

// Scenario 3: Player wins by surviving count
const state3 = {
  units: {
    'player-1': { side: GameSide.Player, destroyed: false },
    'player-2': { side: GameSide.Player, destroyed: false },
    'opponent-1': { side: GameSide.Opponent, destroyed: false },
  },
};
const winner3 = determineWinnerFromState(state3);
console.log(winner3); // GameSide.Player (2 vs 1)
```

---

## Non-Goals

The following are explicitly OUT OF SCOPE for this specification:

- **AI Decision-Making Algorithms**: BotPlayer AI logic for movement and attack decisions
- **Game Session State Management**: createGameSession, startGame, advancePhase, rollInitiative, etc.
- **Combat Resolution Mechanics**: Damage calculation, critical hit resolution, armor penetration
- **Hex Grid Pathfinding**: Movement validation, line of sight, terrain effects
- **Weapon Damage Calculation**: To-hit rolls, damage application, cluster hits
- **Heat Effects**: Shutdown, ammo explosion, movement penalties
- **Physical Attack Resolution**: Punch, kick, charge, death from above
- **Campaign Integration**: Force management, pilot progression, repair/refit

---

## References

### Official BattleTech Rules

- Total Warfare (TW) - Core combat rules
- TechManual (TM) - Construction and equipment rules
- Tactical Operations (TO) - Advanced rules and optional systems

### Related Specifications

- `game-session-management` - Game session state and lifecycle
- `simulation-system` - AI decision-making and BotPlayer
- `spatial-combat-system` - Hex grid, movement, and line of sight
- `combat-resolution` - Damage calculation and critical hits
- `heat-management-system` - Heat effects and shutdown

### Source Files

- `src/engine/GameEngine.ts` - GameEngine and InteractiveSession classes
- `src/engine/types.ts` - IGameEngineConfig, IAdaptedUnit, IAvailableActions
- `src/engine/__tests__/GameEngine.test.ts` - Test suite

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification
- Defined GameEngine configuration and lifecycle
- Defined auto-resolve mode (runToCompletion)
- Defined interactive mode (InteractiveSession)
- Defined 6-phase turn loop orchestration
- Defined AI integration for movement and attack phases
- Defined winner determination logic
- Defined helper functions for grid creation and state conversion
