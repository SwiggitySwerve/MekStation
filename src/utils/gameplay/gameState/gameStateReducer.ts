import {
  GameEventType,
  GameSide,
  GameStatus,
  IAmmoConsumedPayload,
  IAttackDeclaredPayload,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IDesignatorMarkerAppliedPayload,
  IGameConfig,
  IGameCreatedPayload,
  IGameEndedPayload,
  IGameEvent,
  IGameState,
  IAttacksRevealedPayload,
  IFacingChangedPayload,
  IHeatPayload,
  IInitiativeOrderSetPayload,
  IInitiativeRolledPayload,
  IMoraleShiftedPayload,
  IMovementEnhancementActivatedPayload,
  IMovementDeclaredPayload,
  IObjectiveCapturedPayload,
  IObjectiveLostPayload,
  IObjectiveProgressPayload,
  IPhysicalAttackDeclaredPayload,
  IPhysicalAttackResolvedPayload,
  IPhaseChangedPayload,
  IPilotHitPayload,
  IPSRResolvedPayload,
  IPSRTriggeredPayload,
  IRetreatTriggeredPayload,
  IShutdownCheckPayload,
  ISpottingDeclaredPayload,
  IStartupAttemptPayload,
  IUnitEjectedPayload,
  IUnitDestroyedPayload,
  IUnitFellPayload,
  IUnitRetreatedPayload,
  IUnitStoodPayload,
  IUnitStuckPayload,
  IUnitGameState,
  IWithdrawalDeclaredPayload,
  IGameStartedPayload,
  LockState,
} from '@/types/gameplay';
import { evaluateObjectiveOutcome } from '@/utils/gameplay/objectives/objectiveEngine';

import {
  applyAttackDeclared,
  applyAttackLocked,
  applyAttacksRevealed,
  applyFacingChanged,
  applyMovementEnhancementActivated,
  applyMovementDeclared,
  applyMovementLocked,
} from './actionLocking';
import {
  applyCriticalHitResolved,
  applyDamageApplied,
  applyHeatChange,
  applyPilotHit,
  applyUnitDestroyed,
} from './damageResolution';
import {
  applyAmmoConsumed,
  applyDesignatorMarkerApplied,
  applyMoraleShifted,
  applyPhysicalAttackDeclared,
  applyPhysicalAttackResolved,
  applyPSRResolved,
  applyPSRTriggered,
  applyRetreatTriggered,
  applyShutdownCheck,
  applyStartupAttempt,
  applySpottingDeclared,
  applyUnitEjected,
  applyUnitFell,
  applyUnitRetreated,
  applyUnitStood,
  applyUnitStuck,
  applyWithdrawalDeclared,
} from './extendedCombat';
import {
  createInitialGameState,
  createInitialUnitState,
} from './initialization';
import {
  applyGameCreated,
  applyGameEnded,
  applyGameStarted,
} from './lifecycle';
import {
  applyObjectiveCaptured,
  applyObjectiveLost,
  applyObjectiveProgress,
} from './objectiveReducer';
import {
  applyInitiativeOrderSet,
  applyInitiativeRolled,
  applyPhaseChanged,
  applyTurnStarted,
} from './phaseManagement';

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

    case GameEventType.InitiativeOrderSet:
      return applyInitiativeOrderSet(
        state,
        event.payload as IInitiativeOrderSetPayload,
      );

    case GameEventType.MovementDeclared:
      return applyMovementDeclared(
        state,
        event.payload as IMovementDeclaredPayload,
      );

    case GameEventType.MovementLocked:
      return applyMovementLocked(state, event);

    case GameEventType.MovementEnhancementActivated:
      return applyMovementEnhancementActivated(
        state,
        event.payload as IMovementEnhancementActivatedPayload,
      );

    case GameEventType.FacingChanged:
      return applyFacingChanged(state, event.payload as IFacingChangedPayload);

    case GameEventType.AttackDeclared:
      return applyAttackDeclared(
        state,
        event.payload as IAttackDeclaredPayload,
      );

    case GameEventType.AttackLocked:
      return applyAttackLocked(state, event);

    case GameEventType.AttacksRevealed:
      return applyAttacksRevealed(
        state,
        event.payload as IAttacksRevealedPayload,
      );

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

    case GameEventType.UnitStuck:
      return applyUnitStuck(state, event.payload as IUnitStuckPayload);

    case GameEventType.UnitStood:
      return applyUnitStood(state, event.payload as IUnitStoodPayload);

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

    case GameEventType.DesignatorMarkerApplied:
      return applyDesignatorMarkerApplied(
        state,
        event.payload as IDesignatorMarkerAppliedPayload,
      );

    case GameEventType.SpottingDeclared:
      return applySpottingDeclared(
        state,
        event.payload as ISpottingDeclaredPayload,
      );

    case GameEventType.RetreatTriggered:
      return applyRetreatTriggered(
        state,
        event.payload as IRetreatTriggeredPayload,
      );

    case GameEventType.UnitRetreated:
      return applyUnitRetreated(state, event.payload as IUnitRetreatedPayload);

    case GameEventType.UnitEjected:
      return applyUnitEjected(state, event.payload as IUnitEjectedPayload);

    case GameEventType.MoraleShifted:
      return applyMoraleShifted(state, event.payload as IMoraleShiftedPayload);

    case GameEventType.WithdrawalDeclared:
      return applyWithdrawalDeclared(
        state,
        event.payload as IWithdrawalDeclaredPayload,
      );

    case GameEventType.ObjectiveCaptured:
      return applyObjectiveCaptured(
        state,
        event.payload as IObjectiveCapturedPayload,
      );

    case GameEventType.ObjectiveLost:
      return applyObjectiveLost(state, event.payload as IObjectiveLostPayload);

    case GameEventType.ObjectiveProgress:
      return applyObjectiveProgress(
        state,
        event.payload as IObjectiveProgressPayload,
      );

    case GameEventType.TurnEnded:
    case GameEventType.AttackResolved:
    case GameEventType.HeatEffectApplied:
    case GameEventType.CriticalHit:
    case GameEventType.AmmoExplosion:
    // `ForcedWithdrawalTriggered` is informational only — the paired
    // `WithdrawalDeclared` event performs the actual state change.
    case GameEventType.ForcedWithdrawalTriggered:
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
    (unit) =>
      unit.side === side &&
      !unit.destroyed &&
      !unit.shutdown &&
      !unit.hasRetreated &&
      !unit.hasEjected &&
      unit.pilotConscious,
  );
}

export function getUnitsAwaitingAction(
  state: IGameState,
): readonly IUnitGameState[] {
  return Object.values(state.units).filter(
    (unit) =>
      !unit.destroyed &&
      !unit.shutdown &&
      !unit.hasRetreated &&
      !unit.hasEjected &&
      unit.pilotConscious &&
      unit.lockState === LockState.Pending,
  );
}

export function allUnitsLocked(state: IGameState): boolean {
  const activeUnits = Object.values(state.units).filter(
    (unit) =>
      !unit.destroyed &&
      !unit.shutdown &&
      !unit.hasRetreated &&
      !unit.hasEjected &&
      unit.pilotConscious,
  );

  return activeUnits.every(
    (unit) =>
      unit.lockState === LockState.Locked ||
      unit.lockState === LockState.Revealed ||
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
  // Per `add-bot-retreat-behavior` § 7.4: a unit that has emitted
  // `UnitRetreated` (i.e., crossed a map edge during retreat) is
  // considered withdrawn and SHALL NOT count toward its side's
  // remaining-unit total — even though `destroyed` stays false so that
  // post-battle summaries can distinguish withdrawal from combat loss.
  return Object.values(state.units).filter(
    (unit) =>
      !unit.destroyed &&
      !unit.hasRetreated &&
      !unit.hasEjected &&
      unit.side === side,
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
  // Per `add-scenario-objective-engine` (design.md D4 / task 5): the
  // objective evaluator is consulted FIRST. When it decides a scenario
  // (Capture / Defend / Breakthrough — and a markerless map routed
  // through `destroy`) its outcome takes precedence over the
  // turn-limit draw below. `null` means undecided → fall through to
  // the destruction / turn-limit path so markerless scenarios still
  // end on elimination exactly as before.
  const objectiveOutcome = evaluateObjectiveOutcome(state, config.turnLimit);
  if (objectiveOutcome !== null) {
    return objectiveOutcome.winningSide;
  }

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
