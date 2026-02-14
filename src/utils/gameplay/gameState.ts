import {
  GameEventType,
  GameSide,
  GameStatus,
  IAmmoConsumedPayload,
  IAttackDeclaredPayload,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameConfig,
  IGameCreatedPayload,
  IGameEndedPayload,
  IGameEvent,
  IGameState,
  IHeatPayload,
  IInitiativeRolledPayload,
  IMovementDeclaredPayload,
  IPhysicalAttackDeclaredPayload,
  IPhysicalAttackResolvedPayload,
  IPhaseChangedPayload,
  IPilotHitPayload,
  IPSRResolvedPayload,
  IPSRTriggeredPayload,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  IUnitDestroyedPayload,
  IUnitFellPayload,
  IUnitGameState,
  IGameStartedPayload,
  LockState,
} from '@/types/gameplay';

import {
  applyAttackDeclared,
  applyAttackLocked,
  applyMovementDeclared,
  applyMovementLocked,
} from './gameStateActionLocking';
import {
  applyCriticalHitResolved,
  applyDamageApplied,
  applyHeatChange,
  applyPilotHit,
  applyUnitDestroyed,
} from './gameStateDamageResolution';
import {
  applyAmmoConsumed,
  applyPhysicalAttackDeclared,
  applyPhysicalAttackResolved,
  applyPSRResolved,
  applyPSRTriggered,
  applyShutdownCheck,
  applyStartupAttempt,
  applyUnitFell,
} from './gameStateExtendedCombat';
import {
  createInitialGameState,
  createInitialUnitState,
} from './gameStateInitialization';
import {
  applyGameCreated,
  applyGameEnded,
  applyGameStarted,
} from './gameStateLifecycle';
import {
  applyInitiativeRolled,
  applyPhaseChanged,
  applyTurnStarted,
} from './gameStatePhaseManagement';

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

    case GameEventType.TurnEnded:
    case GameEventType.InitiativeOrderSet:
    case GameEventType.AttacksRevealed:
    case GameEventType.AttackResolved:
    case GameEventType.HeatEffectApplied:
    case GameEventType.CriticalHit:
    case GameEventType.FacingChanged:
    case GameEventType.AmmoExplosion:
      return state;

    default:
      return state;
  }
}

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

export function deriveStateAtSequence(
  gameId: string,
  events: readonly IGameEvent[],
  sequence: number,
): IGameState {
  const eventsUpTo = events.filter((event) => event.sequence <= sequence);
  return deriveState(gameId, eventsUpTo);
}

export function deriveStateAtTurn(
  gameId: string,
  events: readonly IGameEvent[],
  turn: number,
): IGameState {
  const eventsUpTo = events.filter((event) => event.turn <= turn);
  return deriveState(gameId, eventsUpTo);
}

export function getActiveUnits(
  state: IGameState,
  side: GameSide,
): readonly IUnitGameState[] {
  return Object.values(state.units).filter(
    (unit) => unit.side === side && !unit.destroyed && unit.pilotConscious,
  );
}

export function getUnitsAwaitingAction(
  state: IGameState,
): readonly IUnitGameState[] {
  return Object.values(state.units).filter(
    (unit) =>
      !unit.destroyed &&
      unit.pilotConscious &&
      unit.lockState === LockState.Pending,
  );
}

export function allUnitsLocked(state: IGameState): boolean {
  const activeUnits = Object.values(state.units).filter(
    (unit) => !unit.destroyed && unit.pilotConscious,
  );

  return activeUnits.every(
    (unit) =>
      unit.lockState === LockState.Locked ||
      unit.lockState === LockState.Resolved,
  );
}

export function isGameOver(state: IGameState): boolean {
  return (
    state.status === GameStatus.Completed ||
    state.status === GameStatus.Abandoned
  );
}

function getSurvivingUnitsForSide(
  state: IGameState,
  side: GameSide,
): readonly IUnitGameState[] {
  return Object.values(state.units).filter(
    (unit) => !unit.destroyed && unit.side === side,
  );
}

function countSurvivingUnits(state: IGameState, side: GameSide): number {
  return getSurvivingUnitsForSide(state, side).length;
}

function isSideEliminated(state: IGameState, side: GameSide): boolean {
  return countSurvivingUnits(state, side) === 0;
}

function determineWinnerByForces(state: IGameState): GameSide | 'draw' {
  const playerCount = countSurvivingUnits(state, GameSide.Player);
  const opponentCount = countSurvivingUnits(state, GameSide.Opponent);

  if (playerCount > opponentCount) {
    return GameSide.Player;
  }

  if (opponentCount > playerCount) {
    return GameSide.Opponent;
  }

  return 'draw';
}

export function checkVictoryConditions(
  state: IGameState,
  config: IGameConfig,
): GameSide | 'draw' | null {
  const playerEliminated = isSideEliminated(state, GameSide.Player);
  const opponentEliminated = isSideEliminated(state, GameSide.Opponent);

  if (playerEliminated && opponentEliminated) {
    return 'draw';
  }

  if (playerEliminated) {
    return GameSide.Opponent;
  }

  if (opponentEliminated) {
    return GameSide.Player;
  }

  if (config.turnLimit > 0 && state.turn > config.turnLimit) {
    return determineWinnerByForces(state);
  }

  return null;
}

export { createInitialGameState, createInitialUnitState };
