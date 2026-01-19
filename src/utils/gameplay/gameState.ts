/**
 * Game State Derivation
 * Derive current game state from event history.
 *
 * @spec openspec/changes/add-game-session-core/specs/game-session-core/spec.md
 */

import {
  IGameEvent,
  IGameState,
  IUnitGameState,
  IGameUnit,
  IGameConfig,
  GameEventType,
  GamePhase,
  GameStatus,
  GameSide,
  LockState,
  IGameCreatedPayload,
  IGameStartedPayload,
  IGameEndedPayload,
  IPhaseChangedPayload,
  IInitiativeRolledPayload,
  IMovementDeclaredPayload,
  IDamageAppliedPayload,
  IHeatPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
} from '@/types/gameplay';
import { Facing, MovementType, IHexCoordinate } from '@/types/gameplay';

// =============================================================================
// Initial State Creation
// =============================================================================

/**
 * Create initial state for a unit.
 */
export function createInitialUnitState(
  unit: IGameUnit,
  startPosition: IHexCoordinate,
  startFacing: Facing = Facing.North
): IUnitGameState {
  return {
    id: unit.id,
    side: unit.side,
    position: startPosition,
    facing: startFacing,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
  };
}

/**
 * Create initial game state.
 */
export function createInitialGameState(gameId: string): IGameState {
  return {
    gameId,
    status: GameStatus.Setup,
    turn: 0,
    phase: GamePhase.Initiative,
    activationIndex: 0,
    units: {},
    turnEvents: [],
  };
}

// =============================================================================
// State Reducers
// =============================================================================

/**
 * Apply a single event to the game state.
 */
export function applyEvent(state: IGameState, event: IGameEvent): IGameState {
  switch (event.type) {
    case GameEventType.GameCreated:
      return applyGameCreated(state, event.payload as IGameCreatedPayload);
    
    case GameEventType.GameStarted:
      return applyGameStarted(state, event.payload as IGameStartedPayload);
    
    case GameEventType.GameEnded:
      return applyGameEnded(state, event.payload as IGameEndedPayload);
    
    case GameEventType.PhaseChanged:
      return applyPhaseChanged(state, event, event.payload as IPhaseChangedPayload);
    
    case GameEventType.TurnStarted:
      return applyTurnStarted(state, event);
    
    case GameEventType.InitiativeRolled:
      return applyInitiativeRolled(state, event.payload as IInitiativeRolledPayload);
    
    case GameEventType.MovementDeclared:
      return applyMovementDeclared(state, event.payload as IMovementDeclaredPayload);
    
    case GameEventType.MovementLocked:
      return applyMovementLocked(state, event);
    
    case GameEventType.DamageApplied:
      return applyDamageApplied(state, event.payload as IDamageAppliedPayload);
    
    case GameEventType.HeatGenerated:
    case GameEventType.HeatDissipated:
      return applyHeatChange(state, event.payload as IHeatPayload);
    
    case GameEventType.PilotHit:
      return applyPilotHit(state, event.payload as IPilotHitPayload);
    
    case GameEventType.UnitDestroyed:
      return applyUnitDestroyed(state, event.payload as IUnitDestroyedPayload);
    
    default:
      // Unknown event type, return state unchanged
      return state;
  }
}

/**
 * Apply GameCreated event.
 */
function applyGameCreated(state: IGameState, payload: IGameCreatedPayload): IGameState {
  const units: Record<string, IUnitGameState> = {};
  
  // Create initial state for each unit
  // Position assignment would normally come from deployment
  let playerIndex = 0;
  let opponentIndex = 0;
  
  for (const unit of payload.units) {
    // Simple deployment: players on south edge, opponents on north
    const isPlayer = unit.side === GameSide.Player;
    const col = isPlayer ? playerIndex++ : opponentIndex++;
    const row = isPlayer ? 5 : -5; // Simplified starting positions
    
    const position: IHexCoordinate = { q: col - 2, r: row };
    const facing = isPlayer ? Facing.North : Facing.South;
    
    units[unit.id] = createInitialUnitState(unit, position, facing);
  }
  
  return {
    ...state,
    status: GameStatus.Setup,
    units,
  };
}

/**
 * Apply GameStarted event.
 */
function applyGameStarted(state: IGameState, payload: IGameStartedPayload): IGameState {
  return {
    ...state,
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Initiative,
    firstMover: payload.firstSide,
    turnEvents: [],
  };
}

/**
 * Apply GameEnded event.
 */
function applyGameEnded(state: IGameState, payload: IGameEndedPayload): IGameState {
  return {
    ...state,
    status: GameStatus.Completed,
    result: {
      winner: payload.winner,
      reason: payload.reason,
    },
  };
}

/**
 * Apply PhaseChanged event.
 */
function applyPhaseChanged(
  state: IGameState,
  event: IGameEvent,
  payload: IPhaseChangedPayload
): IGameState {
  // Reset lock states when entering a new phase
  const units = { ...state.units };
  for (const unitId of Object.keys(units)) {
    units[unitId] = {
      ...units[unitId],
      lockState: LockState.Pending,
      pendingAction: undefined,
    };
  }
  
  // Reset movement tracking at start of movement phase
  if (payload.toPhase === GamePhase.Movement) {
    for (const unitId of Object.keys(units)) {
      units[unitId] = {
        ...units[unitId],
        movementThisTurn: MovementType.Stationary,
        hexesMovedThisTurn: 0,
      };
    }
  }
  
  return {
    ...state,
    phase: payload.toPhase,
    activationIndex: 0,
    units,
    turnEvents: [...state.turnEvents, event],
  };
}

/**
 * Apply TurnStarted event.
 */
function applyTurnStarted(state: IGameState, event: IGameEvent): IGameState {
  return {
    ...state,
    turn: event.turn,
    phase: GamePhase.Initiative,
    activationIndex: 0,
    turnEvents: [event],
  };
}

/**
 * Apply InitiativeRolled event.
 */
function applyInitiativeRolled(state: IGameState, payload: IInitiativeRolledPayload): IGameState {
  return {
    ...state,
    initiativeWinner: payload.winner,
    firstMover: payload.movesFirst,
  };
}

/**
 * Apply MovementDeclared event.
 */
function applyMovementDeclared(state: IGameState, payload: IMovementDeclaredPayload): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;
  
  const updatedUnit: IUnitGameState = {
    ...unit,
    position: payload.to,
    facing: payload.facing,
    movementThisTurn: payload.movementType,
    hexesMovedThisTurn: payload.mpUsed,
    heat: unit.heat + payload.heatGenerated,
    lockState: LockState.Planning,
  };
  
  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: updatedUnit,
    },
  };
}

/**
 * Apply MovementLocked event.
 */
function applyMovementLocked(state: IGameState, event: IGameEvent): IGameState {
  const unitId = event.actorId;
  if (!unitId) return state;
  
  const unit = state.units[unitId];
  if (!unit) return state;
  
  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        lockState: LockState.Locked,
      },
    },
    activationIndex: state.activationIndex + 1,
  };
}

/**
 * Apply DamageApplied event.
 */
function applyDamageApplied(state: IGameState, payload: IDamageAppliedPayload): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;
  
  const updatedUnit: IUnitGameState = {
    ...unit,
    armor: {
      ...unit.armor,
      [payload.location]: payload.armorRemaining,
    },
    structure: {
      ...unit.structure,
      [payload.location]: payload.structureRemaining,
    },
    destroyedLocations: payload.locationDestroyed
      ? [...unit.destroyedLocations, payload.location]
      : unit.destroyedLocations,
    destroyedEquipment: payload.criticals
      ? [...unit.destroyedEquipment, ...payload.criticals]
      : unit.destroyedEquipment,
  };
  
  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: updatedUnit,
    },
  };
}

/**
 * Apply heat change event.
 */
function applyHeatChange(state: IGameState, payload: IHeatPayload): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;
  
  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        heat: payload.newTotal,
      },
    },
  };
}

/**
 * Apply PilotHit event.
 */
function applyPilotHit(state: IGameState, payload: IPilotHitPayload): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;
  
  const conscious = payload.consciousnessCheckRequired
    ? payload.consciousnessCheckPassed ?? false
    : unit.pilotConscious;
  
  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        pilotWounds: payload.totalWounds,
        pilotConscious: conscious,
      },
    },
  };
}

/**
 * Apply UnitDestroyed event.
 */
function applyUnitDestroyed(state: IGameState, payload: IUnitDestroyedPayload): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;
  
  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        destroyed: true,
      },
    },
  };
}

// =============================================================================
// State Derivation
// =============================================================================

/**
 * Derive complete game state from a sequence of events.
 */
export function deriveState(gameId: string, events: readonly IGameEvent[]): IGameState {
  let state = createInitialGameState(gameId);
  
  for (const event of events) {
    state = applyEvent(state, event);
  }
  
  return state;
}

/**
 * Derive state up to a specific event sequence number.
 */
export function deriveStateAtSequence(
  gameId: string,
  events: readonly IGameEvent[],
  sequence: number
): IGameState {
  const eventsUpTo = events.filter(e => e.sequence <= sequence);
  return deriveState(gameId, eventsUpTo);
}

/**
 * Derive state at a specific turn.
 */
export function deriveStateAtTurn(
  gameId: string,
  events: readonly IGameEvent[],
  turn: number
): IGameState {
  const eventsUpTo = events.filter(e => e.turn <= turn);
  return deriveState(gameId, eventsUpTo);
}

// =============================================================================
// State Queries
// =============================================================================

/**
 * Get active (non-destroyed) units for a side.
 */
export function getActiveUnits(state: IGameState, side: GameSide): readonly IUnitGameState[] {
  return Object.values(state.units).filter(
    u => u.side === side && !u.destroyed && u.pilotConscious
  );
}

/**
 * Get units that haven't locked their action this phase.
 */
export function getUnitsAwaitingAction(state: IGameState): readonly IUnitGameState[] {
  return Object.values(state.units).filter(
    u => !u.destroyed && u.pilotConscious && u.lockState === LockState.Pending
  );
}

/**
 * Check if all units have locked their actions.
 */
export function allUnitsLocked(state: IGameState): boolean {
  const activeUnits = Object.values(state.units).filter(
    u => !u.destroyed && u.pilotConscious
  );
  return activeUnits.every(u => u.lockState === LockState.Locked || u.lockState === LockState.Resolved);
}

/**
 * Check if the game is over.
 */
export function isGameOver(state: IGameState): boolean {
  return state.status === GameStatus.Completed || state.status === GameStatus.Abandoned;
}

// =============================================================================
// Victory Condition Helpers
// =============================================================================

/**
 * Get surviving (non-destroyed) units for a specific side.
 * Note: This differs from getActiveUnits which also checks pilotConscious.
 */
function getSurvivingUnitsForSide(
  state: IGameState,
  side: GameSide
): readonly IUnitGameState[] {
  return Object.values(state.units).filter(
    u => !u.destroyed && u.side === side
  );
}

/**
 * Count surviving units for a side.
 */
function countSurvivingUnits(state: IGameState, side: GameSide): number {
  return getSurvivingUnitsForSide(state, side).length;
}

/**
 * Check if a side has been eliminated (all units destroyed).
 */
function isSideEliminated(state: IGameState, side: GameSide): boolean {
  return countSurvivingUnits(state, side) === 0;
}

/**
 * Determine winner by comparing surviving forces.
 * Uses unit count as a simple comparison metric.
 * Returns the side with more surviving units, or 'draw' if equal.
 */
function determineWinnerByForces(state: IGameState): GameSide | 'draw' {
  const playerCount = countSurvivingUnits(state, GameSide.Player);
  const opponentCount = countSurvivingUnits(state, GameSide.Opponent);
  
  if (playerCount > opponentCount) {
    return GameSide.Player;
  } else if (opponentCount > playerCount) {
    return GameSide.Opponent;
  }
  
  return 'draw';
}

/**
 * Check victory conditions.
 * 
 * Victory is determined by:
 * 1. Elimination - if all units of one side are destroyed, the other side wins
 * 2. Mutual destruction - if both sides are eliminated, it's a draw
 * 3. Turn limit - if turn limit is reached, winner is determined by surviving forces
 */
export function checkVictoryConditions(state: IGameState, config: IGameConfig): GameSide | 'draw' | null {
  const playerEliminated = isSideEliminated(state, GameSide.Player);
  const opponentEliminated = isSideEliminated(state, GameSide.Opponent);
  
  // Check for mutual destruction (both sides eliminated)
  if (playerEliminated && opponentEliminated) {
    return 'draw';
  }
  
  // Check for elimination victory
  if (playerEliminated) {
    return GameSide.Opponent;
  }
  
  if (opponentEliminated) {
    return GameSide.Player;
  }
  
  // Check turn limit - determine winner by comparing surviving forces
  if (config.turnLimit > 0 && state.turn > config.turnLimit) {
    return determineWinnerByForces(state);
  }
  
  return null; // Game continues
}
