import {
  GameEventType,
  type IAMSInterceptionPayload,
  type IAmmoConsumedPayload,
  type IAttackDeclaredPayload,
  type IAttackResolvedPayload,
  type IAttacksRevealedPayload,
  type ICriticalHitResolvedPayload,
  type IDamageAppliedPayload,
  type IDesignatorMarkerAppliedPayload,
  type IEmpMinefieldEffectAppliedPayload,
  type IFacingChangedPayload,
  type IGameCreatedPayload,
  type IGameEndedPayload,
  type IGameEvent,
  type IGameStartedPayload,
  type IGameState,
  type IGroundObjectDroppedPayload,
  type IGroundObjectPickedUpPayload,
  type IHeatPayload,
  type IInitiativeOrderSetPayload,
  type IInitiativeRolledPayload,
  type IMinefieldChangedPayload,
  type IMoraleShiftedPayload,
  type IMovementDeclaredPayload,
  type IMovementEnhancementActivatedPayload,
  type INeuralInterfaceStateChangedPayload,
  type IObjectiveCapturedPayload,
  type IObjectiveLostPayload,
  type IObjectiveProgressPayload,
  type IPhaseChangedPayload,
  type IPhysicalAttackDeclaredPayload,
  type IPhysicalAttackResolvedPayload,
  type IPilotHitPayload,
  type IPSRResolvedPayload,
  type IPSRTriggeredPayload,
  type IRetreatTriggeredPayload,
  type IRuntimeMovementStateChangedPayload,
  type IShutdownCheckPayload,
  type ISpottingDeclaredPayload,
  type IStartupAttemptPayload,
  type ISwarmDismountedPayload,
  type ITerrainChangedPayload,
  type IUnitDestroyedPayload,
  type IUnitEjectedPayload,
  type IUnitFellPayload,
  type IUnitRetreatedPayload,
  type IUnitStoodPayload,
  type IUnitStuckPayload,
  type IWithdrawalDeclaredPayload,
} from '@/types/gameplay';

import {
  applyAttackDeclared,
  applyAttackLocked,
  applyAttacksRevealed,
  applyFacingChanged,
  applyMovementDeclared,
  applyMovementEnhancementActivated,
  applyMovementLocked,
  applyRuntimeMovementStateChanged,
} from './actionLocking';
import {
  applyCriticalHitResolved,
  applyDamageApplied,
  applyHeatChange,
  applyPilotHit,
  applyUnitDestroyed,
} from './damageResolution';
import {
  applyAMSInterception,
  applyAmmoConsumed,
  applyDesignatorMarkerApplied,
  applyEmpMinefieldEffectApplied,
  applyMoraleShifted,
  applyNeuralInterfaceStateChanged,
  applyPhysicalAttackDeclared,
  applyPhysicalAttackResolved,
  applyPSRResolved,
  applyPSRTriggered,
  applyRetreatTriggered,
  applyShutdownCheck,
  applySpottingDeclared,
  applyStartupAttempt,
  applyUnitEjected,
  applyUnitFell,
  applyUnitRetreated,
  applyUnitStood,
  applyUnitStuck,
  applyWithdrawalDeclared,
} from './extendedCombat';
import {
  applyGroundObjectDropped,
  applyGroundObjectPickedUp,
} from './groundObjects';
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
import { applyMinefieldChanged, applyTerrainChanged } from './terrainReducer';

type EventHandler = (state: IGameState, event: IGameEvent) => IGameState;
type PayloadHandler<TPayload> = (
  state: IGameState,
  payload: TPayload,
) => IGameState;

function withPayload<TPayload>(
  handler: PayloadHandler<TPayload>,
): EventHandler {
  return (state, event) => handler(state, event.payload as TPayload);
}

function applyAttackResolvedEdgeSpend(
  state: IGameState,
  payload: IAttackResolvedPayload,
): IGameState {
  if (payload.edgePointsRemaining === undefined) {
    return state;
  }

  const target = state.units[payload.targetId];
  if (!target) {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.targetId]: {
        ...target,
        edgePointsRemaining: payload.edgePointsRemaining,
      },
    },
  };
}

function removeSquadSwarmState<
  T extends NonNullable<IGameState['units'][string]['combatState']>['state'],
>(state: T): T {
  const { swarmingUnitId: _swarmingUnitId, ...squadState } = state as T & {
    readonly swarmingUnitId?: string;
  };
  return squadState as T;
}

function applySwarmDismounted(
  state: IGameState,
  payload: ISwarmDismountedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  const combatState =
    unit.combatState?.kind === 'squad'
      ? {
          ...unit.combatState,
          state: removeSquadSwarmState(unit.combatState.state),
        }
      : unit.combatState;

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        isSwarming: false,
        ...(combatState ? { combatState } : {}),
      },
    },
  };
}

const noStateChange: EventHandler = (state) => state;

const EVENT_HANDLERS: Partial<Record<GameEventType, EventHandler>> = {
  [GameEventType.GameCreated]:
    withPayload<IGameCreatedPayload>(applyGameCreated),
  [GameEventType.GameStarted]:
    withPayload<IGameStartedPayload>(applyGameStarted),
  [GameEventType.GameEnded]: withPayload<IGameEndedPayload>(applyGameEnded),
  [GameEventType.PhaseChanged]: (state, event) =>
    applyPhaseChanged(state, event, event.payload as IPhaseChangedPayload),
  [GameEventType.TurnStarted]: applyTurnStarted,
  [GameEventType.InitiativeRolled]: withPayload<IInitiativeRolledPayload>(
    applyInitiativeRolled,
  ),
  [GameEventType.InitiativeOrderSet]: withPayload<IInitiativeOrderSetPayload>(
    applyInitiativeOrderSet,
  ),
  [GameEventType.MovementDeclared]: withPayload<IMovementDeclaredPayload>(
    applyMovementDeclared,
  ),
  [GameEventType.MovementLocked]: applyMovementLocked,
  [GameEventType.RuntimeMovementStateChanged]:
    withPayload<IRuntimeMovementStateChangedPayload>(
      applyRuntimeMovementStateChanged,
    ),
  [GameEventType.MovementEnhancementActivated]:
    withPayload<IMovementEnhancementActivatedPayload>(
      applyMovementEnhancementActivated,
    ),
  [GameEventType.FacingChanged]:
    withPayload<IFacingChangedPayload>(applyFacingChanged),
  [GameEventType.AttackDeclared]:
    withPayload<IAttackDeclaredPayload>(applyAttackDeclared),
  [GameEventType.AttackLocked]: applyAttackLocked,
  [GameEventType.AttacksRevealed]:
    withPayload<IAttacksRevealedPayload>(applyAttacksRevealed),
  [GameEventType.DamageApplied]:
    withPayload<IDamageAppliedPayload>(applyDamageApplied),
  [GameEventType.HeatGenerated]: withPayload<IHeatPayload>(applyHeatChange),
  [GameEventType.HeatDissipated]: withPayload<IHeatPayload>(applyHeatChange),
  [GameEventType.PilotHit]: withPayload<IPilotHitPayload>(applyPilotHit),
  [GameEventType.UnitDestroyed]:
    withPayload<IUnitDestroyedPayload>(applyUnitDestroyed),
  [GameEventType.CriticalHitResolved]: withPayload<ICriticalHitResolvedPayload>(
    applyCriticalHitResolved,
  ),
  [GameEventType.PSRTriggered]:
    withPayload<IPSRTriggeredPayload>(applyPSRTriggered),
  [GameEventType.PSRResolved]:
    withPayload<IPSRResolvedPayload>(applyPSRResolved),
  [GameEventType.UnitFell]: withPayload<IUnitFellPayload>(applyUnitFell),
  [GameEventType.UnitStuck]: withPayload<IUnitStuckPayload>(applyUnitStuck),
  [GameEventType.UnitStood]: withPayload<IUnitStoodPayload>(applyUnitStood),
  [GameEventType.PhysicalAttackDeclared]:
    withPayload<IPhysicalAttackDeclaredPayload>(applyPhysicalAttackDeclared),
  [GameEventType.PhysicalAttackResolved]:
    withPayload<IPhysicalAttackResolvedPayload>(applyPhysicalAttackResolved),
  [GameEventType.GroundObjectPickedUp]:
    withPayload<IGroundObjectPickedUpPayload>(applyGroundObjectPickedUp),
  [GameEventType.GroundObjectDropped]: withPayload<IGroundObjectDroppedPayload>(
    applyGroundObjectDropped,
  ),
  [GameEventType.ShutdownCheck]:
    withPayload<IShutdownCheckPayload>(applyShutdownCheck),
  [GameEventType.StartupAttempt]:
    withPayload<IStartupAttemptPayload>(applyStartupAttempt),
  [GameEventType.AmmoConsumed]:
    withPayload<IAmmoConsumedPayload>(applyAmmoConsumed),
  [GameEventType.AMSInterception]:
    withPayload<IAMSInterceptionPayload>(applyAMSInterception),
  [GameEventType.DesignatorMarkerApplied]:
    withPayload<IDesignatorMarkerAppliedPayload>(applyDesignatorMarkerApplied),
  [GameEventType.SpottingDeclared]: withPayload<ISpottingDeclaredPayload>(
    applySpottingDeclared,
  ),
  [GameEventType.RetreatTriggered]: withPayload<IRetreatTriggeredPayload>(
    applyRetreatTriggered,
  ),
  [GameEventType.UnitRetreated]:
    withPayload<IUnitRetreatedPayload>(applyUnitRetreated),
  [GameEventType.UnitEjected]:
    withPayload<IUnitEjectedPayload>(applyUnitEjected),
  [GameEventType.NeuralInterfaceStateChanged]:
    withPayload<INeuralInterfaceStateChangedPayload>(
      applyNeuralInterfaceStateChanged,
    ),
  [GameEventType.MoraleShifted]:
    withPayload<IMoraleShiftedPayload>(applyMoraleShifted),
  [GameEventType.WithdrawalDeclared]: withPayload<IWithdrawalDeclaredPayload>(
    applyWithdrawalDeclared,
  ),
  [GameEventType.ObjectiveCaptured]: withPayload<IObjectiveCapturedPayload>(
    applyObjectiveCaptured,
  ),
  [GameEventType.ObjectiveLost]:
    withPayload<IObjectiveLostPayload>(applyObjectiveLost),
  [GameEventType.ObjectiveProgress]: withPayload<IObjectiveProgressPayload>(
    applyObjectiveProgress,
  ),
  [GameEventType.TerrainChanged]:
    withPayload<ITerrainChangedPayload>(applyTerrainChanged),
  [GameEventType.MinefieldChanged]: withPayload<IMinefieldChangedPayload>(
    applyMinefieldChanged,
  ),
  [GameEventType.EmpMinefieldEffectApplied]:
    withPayload<IEmpMinefieldEffectAppliedPayload>(
      applyEmpMinefieldEffectApplied,
    ),
  [GameEventType.SwarmDismounted]:
    withPayload<ISwarmDismountedPayload>(applySwarmDismounted),
  [GameEventType.AttackResolved]: withPayload<IAttackResolvedPayload>(
    applyAttackResolvedEdgeSpend,
  ),
  [GameEventType.TurnEnded]: noStateChange,
  [GameEventType.HeatEffectApplied]: noStateChange,
  [GameEventType.CriticalHit]: noStateChange,
  [GameEventType.AmmoExplosion]: noStateChange,
  [GameEventType.ForcedWithdrawalTriggered]: noStateChange,
};

export function applyEvent(state: IGameState, event: IGameEvent): IGameState {
  return (EVENT_HANDLERS[event.type] ?? noStateChange)(state, event);
}
