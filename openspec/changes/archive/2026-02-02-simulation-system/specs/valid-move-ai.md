# Valid Move AI Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-01
**Dependencies**: Core Infrastructure, Game Engine (movement.ts, toHit.ts)
**Affects**: Simulation Runner, Scenario Testing

---

## Overview

### Purpose
Provides AI decision-making logic that generates valid moves and attacks for autonomous game simulation. Focuses on legality over intelligence - makes random valid choices rather than tactical decisions.

### Scope
**In Scope:**
- Movement decision logic (MoveAI)
- Attack target selection (AttackAI)
- Weapon selection for attacks
- Bot player orchestration (BotPlayer)
- Bot behavior configuration

**Out of Scope:**
- Tactical intelligence (minimax, threat assessment)
- Positioning heuristics
- Physical attack implementation
- Ammo management (not tracked in game engine)
- Heat shutdown mechanics (not implemented)

### Key Concepts
- **Valid Move**: Any movement action that complies with game rules (MP limits, terrain, facing)
- **Valid Target**: Any enemy unit within weapon range and firing arc
- **Bot Behavior**: Configuration controlling retreat thresholds and edge preferences
- **Random Selection**: Uniform random choice from valid options using seeded RNG

---

## Requirements

### Requirement: Movement Decision Logic

The system SHALL enumerate valid moves and select randomly from them.

**Rationale**: Exercising all valid movement options helps detect edge cases in movement validation.

**Priority**: Critical

#### Scenario: Valid move enumeration
**GIVEN** a unit with 6 Walk MP on open terrain
**WHEN** calling getValidMoves()
**THEN** result SHALL include all hexes within 6 MP
**AND** result SHALL exclude hexes blocked by terrain or other units
**AND** result SHALL respect facing change costs

#### Scenario: Random move selection
**GIVEN** a list of 10 valid moves
**WHEN** calling selectMove() with seeded random
**THEN** selection SHALL be uniformly random
**AND** same seed SHALL produce same selection
**AND** selection SHALL always be from valid moves list

#### Scenario: No valid moves handling
**GIVEN** a unit with no valid movement destinations
**WHEN** calling getValidMoves()
**THEN** result SHALL be empty array
**AND** selectMove() SHALL return null
**AND** bot SHALL pass movement phase gracefully

### Requirement: Attack Target Selection

The system SHALL identify valid targets and select randomly from them.

**Rationale**: Testing all weapon range and arc combinations helps validate attack mechanics.

**Priority**: Critical

#### Scenario: Valid target enumeration
**GIVEN** a unit with weapons of various ranges
**WHEN** calling getValidTargets()
**THEN** result SHALL include all enemy units in range of any weapon
**AND** result SHALL exclude friendly units
**AND** result SHALL exclude destroyed units
**AND** result SHALL respect line of sight rules

#### Scenario: Random target selection
**GIVEN** a list of 3 valid targets
**WHEN** calling selectTarget() with seeded random
**THEN** selection SHALL be uniformly random
**AND** same seed SHALL produce same selection
**AND** selection SHALL always be from valid targets list

#### Scenario: No valid targets handling
**GIVEN** a unit with no enemies in weapon range
**WHEN** calling getValidTargets()
**THEN** result SHALL be empty array
**AND** selectTarget() SHALL return null
**AND** bot SHALL skip attack phase for this unit

### Requirement: Weapon Selection

The system SHALL select all usable weapons for an attack.

**Rationale**: Using all available weapons maximizes code coverage of weapon mechanics.

**Priority**: High

#### Scenario: All weapons firing
**GIVEN** a unit attacking a target in range
**WHEN** calling selectWeapons()
**THEN** result SHALL include all weapons that can hit target
**AND** result SHALL exclude weapons out of range
**AND** result SHALL exclude weapons outside firing arc
**AND** result SHALL exclude weapons with toHit > 12 (impossible)

#### Scenario: Weapon viability check
**GIVEN** a weapon with toHit calculation
**WHEN** determining if weapon is usable
**THEN** weapon SHALL be excluded if toHit > 12
**AND** weapon SHALL be included if toHit <= 12
**AND** calculation SHALL use existing calculateToHit() function

### Requirement: Bot Player Orchestration

The system SHALL orchestrate movement and attack phases for one side.

**Rationale**: Centralized orchestration ensures consistent phase execution and event generation.

**Priority**: Critical

#### Scenario: Movement phase execution
**GIVEN** a bot player controlling 4 units
**WHEN** executing movement phase
**THEN** bot SHALL call MoveAI for each unit
**AND** bot SHALL generate movement event for each move
**AND** bot SHALL handle units with no valid moves gracefully

#### Scenario: Attack phase execution
**GIVEN** a bot player controlling 4 units
**WHEN** executing attack phase
**THEN** bot SHALL call AttackAI for each unit
**AND** bot SHALL generate attack events for each attack
**AND** bot SHALL handle units with no valid targets gracefully

#### Scenario: Phase ordering
**GIVEN** a bot player executing a turn
**WHEN** orchestrating phases
**THEN** movement phase SHALL execute before attack phase
**AND** all movement SHALL complete before any attacks
**AND** phase transitions SHALL follow game rules

### Requirement: Bot Behavior Configuration

The system SHALL support configurable bot behavior parameters.

**Rationale**: Different behavior profiles enable testing various gameplay scenarios.

**Priority**: Medium

#### Scenario: Retreat threshold
**GIVEN** a bot with retreatThreshold = 0.3
**WHEN** a unit has health below 30%
**THEN** bot SHOULD prefer moves toward retreat edge
**AND** bot MAY still attack if targets available

#### Scenario: Retreat edge selection
**GIVEN** a bot with retreatEdge = 'north'
**WHEN** selecting moves for damaged unit
**THEN** bot SHOULD prefer hexes closer to north map edge
**AND** bot SHALL still only select valid moves

#### Scenario: No retreat behavior
**GIVEN** a bot with retreatEdge = 'none'
**WHEN** selecting moves for damaged unit
**THEN** bot SHALL ignore health status
**AND** bot SHALL select moves randomly as normal

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * Bot behavior configuration.
 * Adapted from MekHQ's BehaviorSettings pattern.
 */
interface IBotBehavior {
  /**
   * Health percentage threshold for retreat behavior.
   * 0.0 = never retreat, 1.0 = always retreat.
   * @example 0.3 (retreat when below 30% health)
   */
  readonly retreatThreshold: number;

  /**
   * Preferred map edge for retreat.
   * 'none' disables retreat behavior.
   * @example "north"
   */
  readonly retreatEdge: 'nearest' | 'north' | 'south' | 'east' | 'west' | 'none';
}

/**
 * Movement decision interface.
 */
interface IMove {
  /**
   * ID of unit making the move.
   */
  readonly unitId: string;

  /**
   * Destination hex coordinate.
   */
  readonly destination: IHexCoord;

  /**
   * Movement type (walk, run, jump).
   */
  readonly movementType: 'walk' | 'run' | 'jump';

  /**
   * Final facing after move.
   */
  readonly facing: number;
}

/**
 * Movement AI decision logic.
 */
interface IMoveAI {
  /**
   * Enumerate all valid movement destinations for unit.
   * @param unit Unit to move
   * @param state Current game state
   * @returns Array of valid moves (empty if none)
   */
  readonly getValidMoves: (unit: IGameUnit, state: IGameState) => IMove[];

  /**
   * Select random move from valid options.
   * @param moves Valid moves to choose from
   * @param random Seeded random for deterministic selection
   * @returns Selected move or null if moves empty
   */
  readonly selectMove: (moves: IMove[], random: ISeededRandom) => IMove | null;
}

/**
 * Attack AI decision logic.
 */
interface IAttackAI {
  /**
   * Enumerate all valid attack targets for unit.
   * @param unit Unit making attack
   * @param state Current game state
   * @returns Array of valid targets (empty if none)
   */
  readonly getValidTargets: (unit: IGameUnit, state: IGameState) => IGameUnit[];

  /**
   * Select random target from valid options.
   * @param targets Valid targets to choose from
   * @param random Seeded random for deterministic selection
   * @returns Selected target or null if targets empty
   */
  readonly selectTarget: (targets: IGameUnit[], random: ISeededRandom) => IGameUnit | null;

  /**
   * Select weapons to fire at target.
   * @param attacker Unit making attack
   * @param target Target unit
   * @param state Current game state
   * @returns Array of weapons to fire (may be empty)
   */
  readonly selectWeapons: (
    attacker: IGameUnit,
    target: IGameUnit,
    state: IGameState
  ) => IWeapon[];
}

/**
 * Bot player orchestrating AI decisions for one side.
 */
interface IBotPlayer {
  /**
   * Bot behavior configuration.
   */
  readonly behavior: IBotBehavior;

  /**
   * Plan movement for a unit.
   * @param unitId ID of unit to move
   * @param state Current game state
   * @returns Movement event or null if no valid moves
   */
  readonly planMovement: (unitId: string, state: IGameState) => IGameEvent | null;

  /**
   * Plan attacks for a unit.
   * @param unitId ID of unit attacking
   * @param state Current game state
   * @returns Array of attack events (empty if no valid targets)
   */
  readonly planAttacks: (unitId: string, state: IGameState) => IGameEvent[];
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `retreatThreshold` | `number` | Yes | Health % for retreat | 0.0-1.0 | 0.3 |
| `retreatEdge` | `string` | Yes | Retreat direction | See enum | 'none' |
| `unitId` | `string` | Yes | Unit identifier | Non-empty string | N/A |
| `destination` | `IHexCoord` | Yes | Target hex | Valid coordinate | N/A |
| `movementType` | `string` | Yes | Move type | walk/run/jump | 'walk' |
| `facing` | `number` | Yes | Final facing | 0-5 | N/A |

### Type Constraints

- `retreatThreshold` MUST be between 0.0 and 1.0 inclusive
- `retreatEdge` MUST be one of: 'nearest', 'north', 'south', 'east', 'west', 'none'
- `movementType` MUST be one of: 'walk', 'run', 'jump'
- `facing` MUST be integer between 0 and 5 inclusive (hex facing)
- `unitId` MUST reference existing unit in game state

---

## Validation Rules

### Validation: Move Legality

**Rule**: All generated moves must be legal per game rules

**Severity**: Error

**Condition**:
```typescript
// Use existing getValidDestinations() from movement.ts
const validDests = getValidDestinations(unit.position.coord, unit.movement.walkMP, state.hexGrid);
if (!validDests.some(dest => dest.equals(move.destination))) {
  // invalid move
}
```

**Error Message**: "Invalid move: destination {coord} not reachable for unit {unitId}"

**User Action**: Fix MoveAI logic to only return valid destinations

### Validation: Target Legality

**Rule**: All selected targets must be valid per game rules

**Severity**: Error

**Condition**:
```typescript
// Target must be enemy, alive, and in range of at least one weapon
if (target.owner === attacker.owner) {
  // invalid - friendly fire
}
if (target.status === 'destroyed') {
  // invalid - target destroyed
}
if (!hasWeaponInRange(attacker, target, state)) {
  // invalid - no weapons can reach
}
```

**Error Message**: "Invalid target: unit {targetId} not valid target for {attackerId}"

**User Action**: Fix AttackAI logic to filter invalid targets

### Validation: Weapon Selection

**Rule**: All selected weapons must be usable against target

**Severity**: Warning

**Condition**:
```typescript
const toHit = calculateToHit(attacker, target, weapon, state);
if (toHit > 12) {
  // warning - weapon cannot hit (toHit impossible)
}
```

**Error Message**: "Weapon {weaponId} has toHit > 12 against {targetId}"

**User Action**: Fix selectWeapons() to exclude impossible shots

---

## Dependencies

### Depends On
- **Core Infrastructure**: SeededRandom for deterministic selection
- **Game Engine**: getValidDestinations(), calculateToHit()
- **Game State**: IGameState, IGameUnit, IGameEvent interfaces

### Used By
- **Simulation Runner**: Uses BotPlayer to execute turns
- **Turn Loop**: Calls BotPlayer for each phase
- **Integration Tests**: Validates AI generates legal moves

### Construction Sequence
1. Create IBotBehavior configuration
2. Create MoveAI instance
3. Create AttackAI instance
4. Create BotPlayer with behavior, MoveAI, AttackAI
5. Pass BotPlayer to SimulationRunner
6. Runner calls planMovement() and planAttacks() each turn

---

## Implementation Notes

### Performance Considerations
- getValidMoves() may be expensive for high-MP units
- Cache valid destinations if called multiple times per turn
- selectWeapons() should filter early to avoid unnecessary toHit calculations

### Edge Cases
- **No valid moves**: Return empty array, bot passes movement
- **No valid targets**: Return empty array, bot skips attacks
- **All weapons out of range**: Return empty array, no attack event
- **Unit destroyed mid-turn**: Skip remaining phases for that unit

### Common Pitfalls
- **Pitfall**: Using Math.random() instead of SeededRandom
  - **Solution**: Always pass SeededRandom instance to select methods
- **Pitfall**: Modifying game state in AI logic
  - **Solution**: AI should be pure functions, state changes via events only
- **Pitfall**: Generating invalid moves
  - **Solution**: Always use existing validation functions (getValidDestinations)

---

## Examples

### Example 1: Basic Movement Decision

**Input**:
```typescript
const unit: IGameUnit = {
  id: 'unit-1',
  position: { coord: { q: 0, r: 0 }, facing: 0 },
  movement: { walkMP: 6, runMP: 9, jumpMP: 0 }
};
const state: IGameState = { /* current game state */ };
```

**Processing**:
```typescript
const moveAI = new MoveAI();
const validMoves = moveAI.getValidMoves(unit, state);
// validMoves = [
//   { unitId: 'unit-1', destination: { q: 1, r: 0 }, movementType: 'walk', facing: 0 },
//   { unitId: 'unit-1', destination: { q: 0, r: 1 }, movementType: 'walk', facing: 0 },
//   // ... more valid destinations
// ]

const random = new SeededRandom(12345);
const selectedMove = moveAI.selectMove(validMoves, random);
```

**Output**:
```typescript
// selectedMove = { unitId: 'unit-1', destination: { q: 2, r: 1 }, movementType: 'walk', facing: 0 }
```

### Example 2: Attack Target Selection

**Input**:
```typescript
const attacker: IGameUnit = {
  id: 'unit-1',
  owner: 'player',
  weapons: [
    { id: 'weapon-1', range: { short: 3, medium: 6, long: 9 } }
  ]
};
const state: IGameState = {
  units: [
    { id: 'enemy-1', owner: 'opponent', position: { coord: { q: 3, r: 0 } } },
    { id: 'enemy-2', owner: 'opponent', position: { coord: { q: 10, r: 0 } } } // out of range
  ]
};
```

**Processing**:
```typescript
const attackAI = new AttackAI();
const validTargets = attackAI.getValidTargets(attacker, state);
// validTargets = [enemy-1] (enemy-2 out of range)

const random = new SeededRandom(54321);
const selectedTarget = attackAI.selectTarget(validTargets, random);
```

**Output**:
```typescript
// selectedTarget = { id: 'enemy-1', owner: 'opponent', ... }
```

### Example 3: Bot Player Orchestration

**Input**:
```typescript
const behavior: IBotBehavior = {
  retreatThreshold: 0.3,
  retreatEdge: 'north'
};
const botPlayer = new BotPlayer(behavior, new MoveAI(), new AttackAI());
```

**Processing**:
```typescript
// Movement phase
const moveEvent = botPlayer.planMovement('unit-1', state);
if (moveEvent) {
  state = deriveState(state, [moveEvent], gameReducers);
}

// Attack phase
const attackEvents = botPlayer.planAttacks('unit-1', state);
for (const event of attackEvents) {
  state = deriveState(state, [event], gameReducers);
}
```

**Output**:
```typescript
// moveEvent = { type: 'UNIT_MOVED', unitId: 'unit-1', destination: {...}, ... }
// attackEvents = [
//   { type: 'WEAPON_FIRED', attackerId: 'unit-1', targetId: 'enemy-1', weaponId: 'weapon-1', ... }
// ]
```

---

## References

### Pattern References
- **MekHQ BotForce**: `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\BotForce.java`
- **Existing Movement**: `src/utils/gameplay/movement.ts:getValidDestinations()`
- **Existing ToHit**: `src/utils/gameplay/toHit.ts:calculateToHit()`

### API/Type References
- **IGameUnit**: `src/types/gameplay/GameSessionInterfaces.ts`
- **IHexCoord**: `src/types/gameplay/HexGridInterfaces.ts`
- **IGameEvent**: `src/types/gameplay/GameSessionInterfaces.ts`

### Related Documentation
- Core Infrastructure Specification (SeededRandom)
- Simulation Runner Specification (BotPlayer usage)
- Game Engine Documentation (movement, combat)

---

## Changelog

### Version 1.0 (2026-02-01)
- Initial specification
- Defined MoveAI, AttackAI, BotPlayer interfaces
- Defined IBotBehavior configuration
- Specified random selection algorithms
- Documented integration with existing game engine
