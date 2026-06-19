import type { D6Roller } from '@/utils/gameplay/hitLocation';

import {
  GameEventType,
  type GamePhase,
  type IComponentDamageState,
  type IGameEvent,
  type IGameState,
  type IUnitGameState,
  PSRTrigger,
} from '@/types/gameplay';
import {
  buildDefaultCriticalSlotManifest,
  type CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';
import { resolvePilotConsciousnessCheck } from '@/utils/gameplay/damage';

import { SeededRandom } from '../../core/SeededRandom';
import {
  DEFAULT_COMPONENT_DAMAGE,
  DEFAULT_PILOTING,
  LETHAL_PILOT_WOUNDS,
} from '../SimulationRunnerConstants';
import {
  applyMASCFailureCriticalDamage,
  applySuperchargerFailureCriticalDamage,
} from './movementEnhancementFailureDamage';
import {
  emitPsrFallEvents,
  emitPsrResolvedEvents,
} from './postCombatPsrEvents';
import {
  type IRunnerPSRBatchResult,
  type IRunnerPSRResult,
  resolveRunnerPSRs,
} from './psrEdgeRerolls';
import {
  appendUnitDestroyedEvent,
  createD6Roller,
  createGameEvent,
} from './utils';

type CriticalSlotManifestsByUnit = Map<string, CriticalSlotManifest>;

interface IPsrPhaseRuntime {
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly d6Roller: D6Roller;
  readonly manifestsByUnit?: CriticalSlotManifestsByUnit;
}

function getOrSeedCriticalSlotManifest(
  id: string,
  manifestsByUnit: CriticalSlotManifestsByUnit | undefined,
): CriticalSlotManifest {
  if (!manifestsByUnit) {
    return buildDefaultCriticalSlotManifest();
  }

  const existing = manifestsByUnit.get(id);
  if (existing) {
    return existing;
  }

  const seeded = buildDefaultCriticalSlotManifest();
  manifestsByUnit.set(id, seeded);
  return seeded;
}

function componentDamageFor(unit: IUnitGameState): IComponentDamageState {
  return unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
}

function applyPsrStuckResult(options: {
  readonly state: IGameState;
  readonly runtime: IPsrPhaseRuntime;
  readonly unitId: string;
  readonly batchResult: IRunnerPSRBatchResult;
}): IGameState {
  const { batchResult, runtime, state, unitId } = options;
  const failedPsr = batchResult.failedResult;
  const nextState = {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...batchResult.unit,
        isStuck: true,
        pendingPSRs: [],
      },
    },
  };

  runtime.events.push(
    createGameEvent(
      runtime.gameId,
      runtime.events.length,
      GameEventType.UnitStuck,
      nextState.turn,
      nextState.phase,
      {
        unitId,
        ...(failedPsr ? { reason: failedPsr.psr.reason } : {}),
        ...(failedPsr?.psr.reasonCode !== undefined
          ? { reasonCode: failedPsr.psr.reasonCode }
          : {}),
      },
      unitId,
    ),
  );

  return nextState;
}

function applyMovementEnhancementFailureDamage(options: {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly failedPsr: IRunnerPSRResult | undefined;
  readonly runtime: IPsrPhaseRuntime;
  readonly turn: number;
  readonly phase: GamePhase;
}): IUnitGameState {
  const { failedPsr, phase, runtime, turn, unit, unitId } = options;
  const failureReason = failedPsr?.psr.reasonCode;

  if (failureReason === PSRTrigger.MASCFailure) {
    const mascDamage = applyMASCFailureCriticalDamage({
      unit,
      unitId,
      manifest: getOrSeedCriticalSlotManifest(unitId, runtime.manifestsByUnit),
      componentDamage: componentDamageFor(unit),
      slotRoller: runtime.d6Roller,
      events: runtime.events,
      gameId: runtime.gameId,
      turn,
      phase,
    });
    runtime.manifestsByUnit?.set(unitId, mascDamage.manifest);
    return mascDamage.unit;
  }

  if (failureReason === PSRTrigger.SuperchargerFailure) {
    const superchargerDamage = applySuperchargerFailureCriticalDamage({
      unit,
      unitId,
      manifest: getOrSeedCriticalSlotManifest(unitId, runtime.manifestsByUnit),
      componentDamage: componentDamageFor(unit),
      d6Roller: runtime.d6Roller,
      events: runtime.events,
      gameId: runtime.gameId,
      turn,
      phase,
    });
    runtime.manifestsByUnit?.set(unitId, superchargerDamage.manifest);
    return superchargerDamage.unit;
  }

  return unit;
}

function applyPsrFallResult(options: {
  readonly state: IGameState;
  readonly runtime: IPsrPhaseRuntime;
  readonly unitId: string;
  readonly batchResult: IRunnerPSRBatchResult;
}): IGameState {
  const { batchResult, runtime, state, unitId } = options;
  const failedPsr = batchResult.failedResult;
  const currentUnit = applyMovementEnhancementFailureDamage({
    unit: batchResult.unit,
    unitId,
    failedPsr,
    runtime,
    turn: state.turn,
    phase: state.phase,
  });

  const newPilotWounds = currentUnit.pilotWounds + 1;
  const consciousnessCheck = resolvePilotConsciousnessCheck(
    newPilotWounds,
    1,
    currentUnit.abilities ?? [],
    runtime.d6Roller,
    currentUnit.pilotToughness,
    {
      edgePointsRemaining: currentUnit.edgePointsRemaining,
      turn: state.turn,
      unitId,
    },
  );
  const pilotConscious =
    newPilotWounds < LETHAL_PILOT_WOUNDS &&
    currentUnit.pilotConscious &&
    (consciousnessCheck.conscious ?? true);

  const nextState = {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...currentUnit,
        prone: true,
        pilotWounds: newPilotWounds,
        pilotConscious,
        edgePointsRemaining:
          consciousnessCheck.edgePointsRemaining ??
          currentUnit.edgePointsRemaining,
        destroyed: !pilotConscious ? true : currentUnit.destroyed,
        pendingPSRs: [],
      },
    },
  };

  emitPsrFallEvents({
    state: nextState,
    runtime,
    unitId,
    failedPsr,
    pilotConscious,
    newPilotWounds,
    consciousnessCheck,
  });

  if (!pilotConscious && !currentUnit.destroyed) {
    appendUnitDestroyedEvent({
      events: runtime.events,
      gameId: runtime.gameId,
      turn: nextState.turn,
      phase: nextState.phase,
      unitId,
      cause: 'pilot_death',
    });
  }

  return nextState;
}

function applyPsrPassResult(
  state: IGameState,
  unitId: string,
  batchResult: IRunnerPSRBatchResult,
): IGameState {
  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...batchResult.unit,
        pendingPSRs: [],
      },
    },
  };
}

function applyPsrBatchResult(options: {
  readonly state: IGameState;
  readonly runtime: IPsrPhaseRuntime;
  readonly unitId: string;
  readonly batchResult: IRunnerPSRBatchResult;
}): IGameState {
  const { batchResult, runtime, state, unitId } = options;
  if (batchResult.unitStuck) {
    return applyPsrStuckResult({ state, runtime, unitId, batchResult });
  }
  if (batchResult.unitFell) {
    return applyPsrFallResult({ state, runtime, unitId, batchResult });
  }
  return applyPsrPassResult(state, unitId, batchResult);
}

export function runPSRPhase(options: {
  state: IGameState;
  events: IGameEvent[];
  gameId: string;
  random: SeededRandom;
  manifestsByUnit?: CriticalSlotManifestsByUnit;
}): IGameState {
  const { events, gameId, manifestsByUnit, random, state } = options;
  let currentState = state;
  const runtime: IPsrPhaseRuntime = {
    events,
    gameId,
    d6Roller: createD6Roller(random),
    manifestsByUnit,
  };

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (unit.destroyed) {
      continue;
    }

    const pendingPSRs = unit.pendingPSRs ?? [];
    if (pendingPSRs.length === 0) {
      continue;
    }

    const batchResult = resolveRunnerPSRs({
      unit,
      unitId,
      pendingPSRs,
      componentDamage: componentDamageFor(unit),
      pilotingSkill: unit.piloting ?? DEFAULT_PILOTING,
      d6Roller: runtime.d6Roller,
      turn: currentState.turn,
    });

    emitPsrResolvedEvents({
      runtime,
      state: currentState,
      unitId,
      batchResult,
    });
    currentState = applyPsrBatchResult({
      state: currentState,
      runtime,
      unitId,
      batchResult,
    });
  }

  return currentState;
}
