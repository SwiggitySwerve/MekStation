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
  IComponentDamageState,
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
  IAttackDeclaredPayload,
  IDamageAppliedPayload,
  IHeatPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
  ICriticalHitResolvedPayload,
  IPSRTriggeredPayload,
  IPSRResolvedPayload,
  IUnitFellPayload,
  IPhysicalAttackDeclaredPayload,
  IPhysicalAttackResolvedPayload,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  IAmmoConsumedPayload,
} from '@/types/gameplay';
import { Facing, MovementType, IHexCoordinate } from '@/types/gameplay';

// =============================================================================
// Initial State Creation
// =============================================================================

// Deployment position constants
const PLAYER_DEPLOY_ROW = 5;
const OPPONENT_DEPLOY_ROW = -5;

const DEFAULT_COMPONENT_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

/**
 * Create initial state for a unit.
 */
export function createInitialUnitState(
  unit: IGameUnit,
  startPosition: IHexCoordinate,
  startFacing: Facing = Facing.North,
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
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    ammoState: {},
    pendingPSRs: [],
    weaponsFiredThisTurn: [],
    jammedWeapons: [],
    narcedBy: [],
    tagDesignated: false,
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
      return applyPhaseChanged(
        state,
        event,
        event.payload as IPhaseChangedPayload,
      );

    case GameEventType.TurnStarted:
      return applyTurnStarted(state, event);

    case GameEventType.InitiativeRolled:
      return applyInitiativeRolled(
        state,
        event.payload as IInitiativeRolledPayload,
      );

    case GameEventType.MovementDeclared:
      return applyMovementDeclared(
        state,
        event.payload as IMovementDeclaredPayload,
      );

    case GameEventType.MovementLocked:
      return applyMovementLocked(state, event);

    case GameEventType.AttackDeclared:
      return applyAttackDeclared(
        state,
        event.payload as IAttackDeclaredPayload,
      );

    case GameEventType.AttackLocked:
      return applyAttackLocked(state, event);

    case GameEventType.DamageApplied:
      return applyDamageApplied(state, event.payload as IDamageAppliedPayload);

    case GameEventType.HeatGenerated:
    case GameEventType.HeatDissipated:
      return applyHeatChange(state, event.payload as IHeatPayload);

    case GameEventType.PilotHit:
      return applyPilotHit(state, event.payload as IPilotHitPayload);

    case GameEventType.UnitDestroyed:
      return applyUnitDestroyed(state, event.payload as IUnitDestroyedPayload);

    case GameEventType.CriticalHitResolved:
      return applyCriticalHitResolved(
        state,
        event.payload as ICriticalHitResolvedPayload,
      );

    case GameEventType.PSRTriggered:
      return applyPSRTriggered(state, event.payload as IPSRTriggeredPayload);

    case GameEventType.PSRResolved:
      return applyPSRResolved(state, event.payload as IPSRResolvedPayload);

    case GameEventType.UnitFell:
      return applyUnitFell(state, event.payload as IUnitFellPayload);

    case GameEventType.PhysicalAttackDeclared:
      return applyPhysicalAttackDeclared(
        state,
        event.payload as IPhysicalAttackDeclaredPayload,
      );

    case GameEventType.PhysicalAttackResolved:
      return applyPhysicalAttackResolved(
        state,
        event.payload as IPhysicalAttackResolvedPayload,
      );

    case GameEventType.ShutdownCheck:
      return applyShutdownCheck(state, event.payload as IShutdownCheckPayload);

    case GameEventType.StartupAttempt:
      return applyStartupAttempt(
        state,
        event.payload as IStartupAttemptPayload,
      );

    case GameEventType.AmmoConsumed:
      return applyAmmoConsumed(state, event.payload as IAmmoConsumedPayload);

    // Info-only events: no state changes needed
    case GameEventType.TurnEnded:
      // Turn end bookkeeping event - turn number tracked in event base
      return state;

    case GameEventType.InitiativeOrderSet:
      // Initiative order already set via InitiativeRolled handler
      return state;

    case GameEventType.AttacksRevealed:
      // Simultaneous resolution marker - no state mutation needed
      return state;

    case GameEventType.AttackResolved:
      // Individual attack result - damage applied via DamageApplied events
      return state;

    case GameEventType.HeatEffectApplied:
      // Heat effect tracking - heat state managed via HeatGenerated/HeatDissipated
      return state;

    case GameEventType.CriticalHit:
      // Legacy/info-only event - actual critical hit handling via CriticalHitResolved
      return state;

    case GameEventType.FacingChanged:
      // Legacy/unused event - facing updated via MovementDeclared event
      return state;

    case GameEventType.AmmoExplosion:
      // Info-only event for logging - damage applied via separate DamageApplied events
      return state;

    default:
      // Unknown event type, return state unchanged
      return state;
  }
}

/**
 * Apply GameCreated event.
 */
function applyGameCreated(
  state: IGameState,
  payload: IGameCreatedPayload,
): IGameState {
  const units: Record<string, IUnitGameState> = {};

  // Create initial state for each unit
  // Position assignment would normally come from deployment
  let playerIndex = 0;
  let opponentIndex = 0;

  for (const unit of payload.units) {
    // Simple deployment: players on south edge, opponents on north
    const isPlayer = unit.side === GameSide.Player;
    const col = isPlayer ? playerIndex++ : opponentIndex++;
    const row = isPlayer ? PLAYER_DEPLOY_ROW : OPPONENT_DEPLOY_ROW;

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
function applyGameStarted(
  state: IGameState,
  payload: IGameStartedPayload,
): IGameState {
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
function applyGameEnded(
  state: IGameState,
  payload: IGameEndedPayload,
): IGameState {
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
  payload: IPhaseChangedPayload,
): IGameState {
  const units = { ...state.units };
  for (const unitId of Object.keys(units)) {
    units[unitId] = {
      ...units[unitId],
      lockState: LockState.Pending,
      pendingAction: undefined,
      damageThisPhase: 0,
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
  const units = { ...state.units };
  for (const unitId of Object.keys(units)) {
    units[unitId] = {
      ...units[unitId],
      weaponsFiredThisTurn: [],
    };
  }

  return {
    ...state,
    turn: event.turn,
    phase: GamePhase.Initiative,
    activationIndex: 0,
    units,
    turnEvents: [event],
  };
}

/**
 * Apply InitiativeRolled event.
 */
function applyInitiativeRolled(
  state: IGameState,
  payload: IInitiativeRolledPayload,
): IGameState {
  return {
    ...state,
    initiativeWinner: payload.winner,
    firstMover: payload.movesFirst,
  };
}

/**
 * Apply MovementDeclared event.
 */
function applyMovementDeclared(
  state: IGameState,
  payload: IMovementDeclaredPayload,
): IGameState {
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

function applyAttackDeclared(
  state: IGameState,
  payload: IAttackDeclaredPayload,
): IGameState {
  const unit = state.units[payload.attackerId];
  if (!unit) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [payload.attackerId]: {
        ...unit,
        lockState: LockState.Planning,
      },
    },
  };
}

function applyAttackLocked(state: IGameState, event: IGameEvent): IGameState {
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
 * Get the arm location that corresponds to a side torso (for cascading destruction).
 */
function getArmForSideTorso(location: string): string | null {
  if (location === 'left_torso' || location === 'left_torso_rear')
    return 'left_arm';
  if (location === 'right_torso' || location === 'right_torso_rear')
    return 'right_arm';
  return null;
}

/**
 * Apply DamageApplied event.
 * Handles damage transfer chain and side torso → arm cascading destruction.
 */
function applyDamageApplied(
  state: IGameState,
  payload: IDamageAppliedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;

  const newDestroyedLocations = [...unit.destroyedLocations];
  const newArmor = { ...unit.armor };
  const newStructure = { ...unit.structure };

  newArmor[payload.location] = payload.armorRemaining;
  newStructure[payload.location] = payload.structureRemaining;

  if (
    payload.locationDestroyed &&
    !newDestroyedLocations.includes(payload.location)
  ) {
    newDestroyedLocations.push(payload.location);

    // Task 3.4: Side torso destruction cascades to arm
    const cascadedArm = getArmForSideTorso(payload.location);
    if (cascadedArm && !newDestroyedLocations.includes(cascadedArm)) {
      newDestroyedLocations.push(cascadedArm);
      newArmor[cascadedArm] = 0;
      newStructure[cascadedArm] = 0;
    }
  }

  // Task 3.6: Track damageThisPhase
  const currentDamageThisPhase = unit.damageThisPhase ?? 0;

  const updatedUnit: IUnitGameState = {
    ...unit,
    armor: newArmor,
    structure: newStructure,
    destroyedLocations: newDestroyedLocations,
    destroyedEquipment: payload.criticals
      ? [...unit.destroyedEquipment, ...payload.criticals]
      : unit.destroyedEquipment,
    damageThisPhase: currentDamageThisPhase + payload.damage,
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
function applyPilotHit(
  state: IGameState,
  payload: IPilotHitPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;

  const conscious = payload.consciousnessCheckRequired
    ? (payload.consciousnessCheckPassed ?? false)
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
function applyUnitDestroyed(
  state: IGameState,
  payload: IUnitDestroyedPayload,
): IGameState {
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
// Phase 4: Extended Combat Reducers
// =============================================================================

function applyCriticalHitResolved(
  state: IGameState,
  payload: ICriticalHitResolvedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;

  const componentDamage = unit.componentDamage ?? {
    ...DEFAULT_COMPONENT_DAMAGE,
  };

  let updatedDamage = { ...componentDamage };

  switch (payload.componentType) {
    case 'engine':
      updatedDamage = {
        ...updatedDamage,
        engineHits: updatedDamage.engineHits + 1,
      };
      break;
    case 'gyro':
      updatedDamage = {
        ...updatedDamage,
        gyroHits: updatedDamage.gyroHits + 1,
      };
      break;
    case 'sensor':
      updatedDamage = {
        ...updatedDamage,
        sensorHits: updatedDamage.sensorHits + 1,
      };
      break;
    case 'life_support':
      updatedDamage = {
        ...updatedDamage,
        lifeSupport: updatedDamage.lifeSupport + 1,
      };
      break;
    case 'cockpit':
      updatedDamage = { ...updatedDamage, cockpitHit: true };
      break;
    case 'weapon':
      updatedDamage = {
        ...updatedDamage,
        weaponsDestroyed: [
          ...updatedDamage.weaponsDestroyed,
          payload.componentName,
        ],
      };
      break;
    case 'heat_sink':
      updatedDamage = {
        ...updatedDamage,
        heatSinksDestroyed: updatedDamage.heatSinksDestroyed + 1,
      };
      break;
    case 'jump_jet':
      updatedDamage = {
        ...updatedDamage,
        jumpJetsDestroyed: updatedDamage.jumpJetsDestroyed + 1,
      };
      break;
    case 'actuator':
      updatedDamage = {
        ...updatedDamage,
        actuators: {
          ...updatedDamage.actuators,
          [payload.componentName]: true,
        },
      };
      break;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        componentDamage: updatedDamage,
      },
    },
  };
}

function applyPSRTriggered(
  state: IGameState,
  payload: IPSRTriggeredPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;

  const pendingPSRs = unit.pendingPSRs ?? [];

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        pendingPSRs: [
          ...pendingPSRs,
          {
            entityId: payload.unitId,
            reason: payload.reason,
            additionalModifier: payload.additionalModifier,
            triggerSource: payload.triggerSource,
          },
        ],
      },
    },
  };
}

function applyPSRResolved(
  state: IGameState,
  payload: IPSRResolvedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;

  const pendingPSRs = unit.pendingPSRs ?? [];
  const remaining = pendingPSRs.filter((psr) => psr.reason !== payload.reason);

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        pendingPSRs: remaining,
      },
    },
  };
}

function applyUnitFell(
  state: IGameState,
  payload: IUnitFellPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        prone: true,
        facing: payload.newFacing,
        pendingPSRs: [],
      },
    },
  };
}

function applyPhysicalAttackDeclared(
  state: IGameState,
  payload: IPhysicalAttackDeclaredPayload,
): IGameState {
  const unit = state.units[payload.attackerId];
  if (!unit) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [payload.attackerId]: {
        ...unit,
        lockState: LockState.Planning,
      },
    },
  };
}

function applyPhysicalAttackResolved(
  state: IGameState,
  payload: IPhysicalAttackResolvedPayload,
): IGameState {
  if (!payload.hit) return state;

  const target = state.units[payload.targetId];
  if (!target) return state;

  const currentDamageThisPhase = target.damageThisPhase ?? 0;

  return {
    ...state,
    units: {
      ...state.units,
      [payload.targetId]: {
        ...target,
        damageThisPhase: currentDamageThisPhase + (payload.damage ?? 0),
      },
    },
  };
}

function applyShutdownCheck(
  state: IGameState,
  payload: IShutdownCheckPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;

  if (!payload.shutdownOccurred) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        shutdown: true,
      },
    },
  };
}

function applyStartupAttempt(
  state: IGameState,
  payload: IStartupAttemptPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;

  if (!payload.success) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        shutdown: false,
      },
    },
  };
}

function applyAmmoConsumed(
  state: IGameState,
  payload: IAmmoConsumedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;

  const ammoState = unit.ammoState ?? {};
  const bin = ammoState[payload.binId];

  if (!bin) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        ammoState: {
          ...ammoState,
          [payload.binId]: {
            ...bin,
            remainingRounds: payload.roundsRemaining,
          },
        },
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
export function deriveState(
  gameId: string,
  events: readonly IGameEvent[],
): IGameState {
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
  sequence: number,
): IGameState {
  const eventsUpTo = events.filter((e) => e.sequence <= sequence);
  return deriveState(gameId, eventsUpTo);
}

/**
 * Derive state at a specific turn.
 */
export function deriveStateAtTurn(
  gameId: string,
  events: readonly IGameEvent[],
  turn: number,
): IGameState {
  const eventsUpTo = events.filter((e) => e.turn <= turn);
  return deriveState(gameId, eventsUpTo);
}

// =============================================================================
// State Queries
// =============================================================================

/**
 * Get active (non-destroyed) units for a side.
 */
export function getActiveUnits(
  state: IGameState,
  side: GameSide,
): readonly IUnitGameState[] {
  return Object.values(state.units).filter(
    (u) => u.side === side && !u.destroyed && u.pilotConscious,
  );
}

/**
 * Get units that haven't locked their action this phase.
 */
export function getUnitsAwaitingAction(
  state: IGameState,
): readonly IUnitGameState[] {
  return Object.values(state.units).filter(
    (u) =>
      !u.destroyed && u.pilotConscious && u.lockState === LockState.Pending,
  );
}

/**
 * Check if all units have locked their actions.
 */
export function allUnitsLocked(state: IGameState): boolean {
  const activeUnits = Object.values(state.units).filter(
    (u) => !u.destroyed && u.pilotConscious,
  );
  return activeUnits.every(
    (u) =>
      u.lockState === LockState.Locked || u.lockState === LockState.Resolved,
  );
}

/**
 * Check if the game is over.
 */
export function isGameOver(state: IGameState): boolean {
  return (
    state.status === GameStatus.Completed ||
    state.status === GameStatus.Abandoned
  );
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
  side: GameSide,
): readonly IUnitGameState[] {
  return Object.values(state.units).filter(
    (u) => !u.destroyed && u.side === side,
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
export function checkVictoryConditions(
  state: IGameState,
  config: IGameConfig,
): GameSide | 'draw' | null {
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
